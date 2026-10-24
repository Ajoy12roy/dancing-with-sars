import os
import sys
import time
import base64
import shutil
import tempfile
import asyncio
import logging
from datetime import datetime
from typing import Optional

import rasterio
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Ensure python-service directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from process_change import run_analysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sars-api")

app = FastAPI(title="TerraPulse SAR Change Detection API", version="1.0.0")

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"HTTPException [{exc.status_code}]: {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

# ── Environment & Abuse Limits ──────────────────────────────────────────────
MAX_UPLOAD_MB = float(os.getenv("MAX_UPLOAD_MB", "60"))
MAX_PIXELS = int(os.getenv("MAX_PIXELS", "60000000"))
RATE_LIMIT_PER_10MIN = int(os.getenv("RATE_LIMIT_PER_10MIN", "10"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "600"))  # 10 minutes
TIMEOUT_SECONDS = float(os.getenv("TIMEOUT_SECONDS", "120"))

# ── CORS Middleware ─────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiting & Concurrency Controls ────────────────────────────────────
analysis_semaphore = asyncio.Semaphore(1)
ip_requests: dict[str, list[float]] = {}
ip_lock = asyncio.Lock()


def get_client_ip(request: Request) -> str:
    return request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "127.0.0.1")


async def is_rate_limited(ip: str) -> bool:
    now = time.time()
    async with ip_lock:
        timestamps = [t for t in ip_requests.get(ip, []) if now - t < RATE_LIMIT_WINDOW]
        if len(timestamps) >= RATE_LIMIT_PER_10MIN:
            ip_requests[ip] = timestamps
            return True
        timestamps.append(now)
        ip_requests[ip] = timestamps
        return False


async def stream_and_validate_file(file: UploadFile, dest_path: str, field_name: str) -> int:
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".tif", ".tiff"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format for {field_name} ('{filename}'). Only .tif and .tiff GeoTIFF files are accepted.",
        )

    max_bytes = int(MAX_UPLOAD_MB * 1024 * 1024)
    total_bytes = 0

    with open(dest_path, "wb") as f_out:
        while True:
            chunk = await file.read(1024 * 1024)  # 1 MB chunks
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {field_name} ('{filename}') exceeds the maximum allowed size of {MAX_UPLOAD_MB:.0f} MB.",
                )
            f_out.write(chunk)

    if total_bytes == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file {field_name} ('{filename}') is empty (0 bytes).",
        )

    return total_bytes


def to_png_data_url(file_path: str) -> str:
    if not os.path.exists(file_path):
        return ""
    with open(file_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    return f"data:image/png;base64,{b64}"


DEFAULT_SAMPLE_DATES = {
    "sylhet": ("2022-05-01", "2022-06-21")
}


async def _execute_analysis_job(
    in_before_path: str,
    in_after_path: str,
    tmp_dir: str,
    aoi_id: str,
    target_mode: str,
    clean_date_a: Optional[str],
    clean_date_b: Optional[str],
    client_ip: str,
) -> dict:
    out_dir = os.path.join(tmp_dir, "out")
    os.makedirs(out_dir, exist_ok=True)

    # Validate rasters using rasterio
    try:
        with rasterio.open(in_before_path) as src_a:
            crs_a = src_a.crs
            transform_a = src_a.transform
            width_a, height_a = src_a.width, src_a.height
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Before image could not be opened as a valid GeoTIFF raster: {str(e)}",
        )

    try:
        with rasterio.open(in_after_path) as src_b:
            crs_b = src_b.crs
            transform_b = src_b.transform
            width_b, height_b = src_b.width, src_b.height
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"After image could not be opened as a valid GeoTIFF raster: {str(e)}",
        )

    # Check Coordinate Reference System
    if not crs_a:
        raise HTTPException(
            status_code=400,
            detail="Before image missing valid Coordinate Reference System (CRS) metadata.",
        )
    if not crs_b:
        raise HTTPException(
            status_code=400,
            detail="After image missing valid Coordinate Reference System (CRS) metadata.",
        )

    # Check affine transform
    if not transform_a or transform_a.is_identity:
        raise HTTPException(
            status_code=400,
            detail="Before image missing valid georeferencing affine transform.",
        )
    if not transform_b or transform_b.is_identity:
        raise HTTPException(
            status_code=400,
            detail="After image missing valid georeferencing affine transform.",
        )

    # Check CRS match
    if crs_a != crs_b:
        raise HTTPException(
            status_code=400,
            detail=f"Coordinate Reference Systems (CRS) do not match: before image is {crs_a}, after image is {crs_b}.",
        )

    # Check raster dimension match
    if (width_a, height_a) != (width_b, height_b):
        raise HTTPException(
            status_code=400,
            detail=f"Raster dimensions do not match: before image is {width_a}x{height_a}, after image is {width_b}x{height_b}.",
        )

    # Check maximum pixel limit
    total_pixels = width_a * height_a
    if total_pixels > MAX_PIXELS:
        raise HTTPException(
            status_code=400,
            detail=f"Raster size ({total_pixels:,} pixels) exceeds the maximum allowed limit of {MAX_PIXELS:,} pixels.",
        )

    # Execute analysis in threadpool with strict timeout
    try:
        result_dict = await asyncio.wait_for(
            asyncio.to_thread(
                run_analysis,
                before_path=in_before_path,
                after_path=in_after_path,
                out_dir=out_dir,
                aoi_id=aoi_id,
                mode=target_mode,
                date_a=clean_date_a,
                date_b=clean_date_b,
            ),
            timeout=TIMEOUT_SECONDS,
        )
        logger.info(f"Analysis completed successfully for {client_ip} | aoi: {aoi_id} | mode: {target_mode}")
    except asyncio.TimeoutError:
        logger.error(f"Analysis timed out for {client_ip} after {TIMEOUT_SECONDS}s")
        raise HTTPException(
            status_code=504,
            detail=f"Analysis timed out after {TIMEOUT_SECONDS:.0f} seconds.",
        )
    except Exception as e:
        logger.error(f"Analysis failed for {client_ip}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"SAR processing failed: {str(e)}",
        )

    # Read generated PNGs as Base64 data URLs
    change_map_url = to_png_data_url(os.path.join(out_dir, "change-map.png"))
    before_url = to_png_data_url(os.path.join(out_dir, "before.png"))
    after_url = to_png_data_url(os.path.join(out_dir, "after.png"))

    return {
        "result": result_dict,
        "images": {
            "before": before_url,
            "after": after_url,
            "change_map": change_map_url,
        },
    }


# ── Routes ──────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(
    request: Request,
    before: UploadFile = File(...),
    after: UploadFile = File(...),
    aoi_name: Optional[str] = Form(None),
    mode: Optional[str] = Form("flood"),
    date_a: Optional[str] = Form(None),
    date_b: Optional[str] = Form(None),
):
    # 1. Per-IP Rate Limiting (RATE_LIMIT_PER_10MIN per 10 minutes)
    client_ip = get_client_ip(request)
    logger.info(f"Incoming /analyze request from {client_ip} | aoi: {aoi_name} | mode: {mode}")

    if await is_rate_limited(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"detail": f"Rate limit exceeded. Maximum {RATE_LIMIT_PER_10MIN} requests per 10 minutes."},
            headers={"Retry-After": "600"},
        )

    # Validate analysis mode early
    valid_modes = ["flood", "river-erosion", "deforestation", "surface-water"]
    target_mode = (mode or "flood").strip().lower()
    if target_mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid analysis mode '{mode}'. Expected one of: flood, river-erosion, deforestation, surface-water.",
        )

    # Validate optional dates (YYYY-MM-DD)
    clean_date_a = date_a.strip() if date_a and date_a.strip() else None
    clean_date_b = date_b.strip() if date_b and date_b.strip() else None

    if clean_date_a:
        try:
            datetime.strptime(clean_date_a, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date format for date_a ('{date_a}'). Expected ISO format YYYY-MM-DD.",
            )

    if clean_date_b:
        try:
            datetime.strptime(clean_date_b, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date format for date_b ('{date_b}'). Expected ISO format YYYY-MM-DD.",
            )

    # 2. Concurrency check (one analysis at a time)
    if analysis_semaphore.locked():
        logger.warning(f"Server busy (concurrency limit) for IP: {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"detail": "Server busy, try again in a minute"},
            headers={"Retry-After": "60"},
        )

    # Acquire semaphore
    async with analysis_semaphore:
        # 3. Create isolated temporary directory for this job
        tmp_dir = tempfile.mkdtemp(prefix="sars_api_")
        try:
            in_before_path = os.path.join(tmp_dir, "before.tif")
            in_after_path = os.path.join(tmp_dir, "after.tif")

            # Stream files to disk and check file extension and size limits
            await stream_and_validate_file(before, in_before_path, "before image")
            await stream_and_validate_file(after, in_after_path, "after image")

            return await _execute_analysis_job(
                in_before_path=in_before_path,
                in_after_path=in_after_path,
                tmp_dir=tmp_dir,
                aoi_id=aoi_name or "custom-upload",
                target_mode=target_mode,
                clean_date_a=clean_date_a,
                clean_date_b=clean_date_b,
                client_ip=client_ip,
            )

        finally:
            # Always delete temp directory and store nothing
            shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/analyze-sample")
async def analyze_sample(
    request: Request,
    name: Optional[str] = Form(None),
    mode: Optional[str] = Form("flood"),
    date_a: Optional[str] = Form(None),
    date_b: Optional[str] = Form(None),
):
    # 1. Per-IP Rate Limiting (RATE_LIMIT_PER_10MIN per 10 minutes)
    client_ip = get_client_ip(request)
    logger.info(f"Incoming /analyze-sample request from {client_ip} | sample: {name} | mode: {mode}")

    if await is_rate_limited(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"detail": f"Rate limit exceeded. Maximum {RATE_LIMIT_PER_10MIN} requests per 10 minutes."},
            headers={"Retry-After": "600"},
        )

    # Validate sample name: only "sylhet" allowed, reject others with 400
    clean_name = (name or "").strip().lower()
    if clean_name != "sylhet":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sample name '{name}'. Only 'sylhet' is supported.",
        )

    # Validate analysis mode early (same validation as /analyze)
    valid_modes = ["flood", "river-erosion", "deforestation", "surface-water"]
    target_mode = (mode or "flood").strip().lower()
    if target_mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid analysis mode '{mode}'. Expected one of: flood, river-erosion, deforestation, surface-water.",
        )

    # Validate or default sample dates to data/precomputed/sylhet dates
    default_a, default_b = DEFAULT_SAMPLE_DATES[clean_name]
    clean_date_a = date_a.strip() if date_a and date_a.strip() else default_a
    clean_date_b = date_b.strip() if date_b and date_b.strip() else default_b

    try:
        datetime.strptime(clean_date_a, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format for date_a ('{date_a}'). Expected ISO format YYYY-MM-DD.",
        )

    try:
        datetime.strptime(clean_date_b, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format for date_b ('{date_b}'). Expected ISO format YYYY-MM-DD.",
        )

    # 2. Concurrency check (one analysis at a time)
    if analysis_semaphore.locked():
        logger.warning(f"Server busy (concurrency limit) for IP: {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"detail": "Server busy, try again in a minute"},
            headers={"Retry-After": "60"},
        )

    # Acquire semaphore
    async with analysis_semaphore:
        # Locate sample files on server (never from client-supplied path)
        samples_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", clean_name)
        sample_before = os.path.join(samples_dir, "image_a.tif")
        sample_after = os.path.join(samples_dir, "image_b.tif")

        if not os.path.isfile(sample_before) or not os.path.isfile(sample_after):
            raise HTTPException(
                status_code=500,
                detail=f"Sample files for '{clean_name}' not found on server.",
            )

        tmp_dir = tempfile.mkdtemp(prefix="sars_api_sample_")
        try:
            in_before_path = os.path.join(tmp_dir, "before.tif")
            in_after_path = os.path.join(tmp_dir, "after.tif")
            shutil.copyfile(sample_before, in_before_path)
            shutil.copyfile(sample_after, in_after_path)

            return await _execute_analysis_job(
                in_before_path=in_before_path,
                in_after_path=in_after_path,
                tmp_dir=tmp_dir,
                aoi_id=clean_name,
                target_mode=target_mode,
                clean_date_a=clean_date_a,
                clean_date_b=clean_date_b,
                client_ip=client_ip,
            )
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)
