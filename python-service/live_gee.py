"""
python-service/live_gee.py

Live Google Earth Engine (GEE) fetch module for Sentinel-1 radar imagery.
Ports the single-geometry orbit selection, median compositing, and scale calculation
from scripts/gee/verified_sylhet_picker.js and lib/aoi.ts.
"""

import os
import math
import io
import time
import zipfile
import logging
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List

import rasterio
from rasterio.transform import from_bounds
import numpy as np
import requests

try:
    import ee
    EE_AVAILABLE = True
except ImportError:
    ee = None
    EE_AVAILABLE = False

from process_change import run_analysis

logger = logging.getLogger("sars-live-gee")

# ── Geographic and Computational Constants (Parity with lib/aoi.ts) ─────────
WGS84_AUTHALIC_RADIUS_KM = 6371.0088
MAX_PIXELS_PER_SIDE = 1500
MIN_SIDE_KM = 2.0
MAX_SIDE_KM = 30.0
MAX_AREA_KM2 = 900.0
MAX_WINDOW_DAYS = 60
MAX_DOWNLOAD_BYTES = 60 * 1024 * 1024  # 60 MB cap
DOWNLOAD_TIMEOUT_SECONDS = 90
OVERALL_TIMEOUT_SECONDS = 240
ALLOWED_MODES = ["flood", "river-erosion", "deforestation", "surface-water"]


class LiveError(Exception):
    """Custom domain exception for live Earth Engine workflows."""
    def __init__(self, code: str, message: str, window: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.window = window


def normalize_bbox(box) -> Tuple[float, float, float, float]:
    """Ensures [west, south, east, north] order and clamps to valid lat/lon."""
    if isinstance(box, dict):
        west = float(box["west"])
        south = float(box["south"])
        east = float(box["east"])
        north = float(box["north"])
    else:
        west, south, east, north = map(float, box)

    w = min(west, east)
    e = max(west, east)
    s = min(south, north)
    n = max(south, north)

    w = max(-180.0, min(180.0, w))
    e = max(-180.0, min(180.0, e))
    s = max(-85.0, min(85.0, s))
    n = max(-85.0, min(85.0, n))
    return w, s, e, n


def compute_bbox_dimensions(box) -> Tuple[float, float, float]:
    """Computes geodesic width (km), height (km), and area (km2) matching lib/aoi.ts."""
    w, s, e, n = normalize_bbox(box)
    mid_lat = (s + n) / 2.0
    rad = math.pi / 180.0

    height_km = (n - s) * rad * WGS84_AUTHALIC_RADIUS_KM
    width_km = (e - w) * rad * WGS84_AUTHALIC_RADIUS_KM * math.cos(mid_lat * rad)
    area_km2 = width_km * height_km

    return round(width_km, 3), round(height_km, 3), round(area_km2, 3)


def compute_export_scale(box) -> int:
    """Computes export scale in meters matching computeExportScale in lib/aoi.ts."""
    width_km, height_km, _ = compute_bbox_dimensions(box)
    max_dim_meters = max(width_km, height_km) * 1000.0
    min_required_scale = max_dim_meters / MAX_PIXELS_PER_SIDE
    scale = max(10, math.ceil(min_required_scale / 10.0) * 10)
    return int(scale)


def validate_live_request(
    box,
    before_window: Dict[str, str],
    after_window: Dict[str, str],
    mode: str,
) -> Tuple[Tuple[float, float, float, float], int]:
    """
    Validates input parameters against physical and algorithmic limits.
    Returns normalized (box, scale) or raises LiveError("invalid_request", message).
    """
    if mode not in ALLOWED_MODES:
        raise LiveError(
            code="invalid_request",
            message=f"Invalid mode '{mode}'. Allowed modes: {', '.join(ALLOWED_MODES)}.",
        )

    norm_box = normalize_bbox(box)
    width_km, height_km, area_km2 = compute_bbox_dimensions(norm_box)

    if width_km < MIN_SIDE_KM or height_km < MIN_SIDE_KM:
        raise LiveError(
            code="invalid_request",
            message=f"Area side length must be at least {MIN_SIDE_KM} km (current: width {width_km} km, height {height_km} km).",
        )

    if width_km > MAX_SIDE_KM or height_km > MAX_SIDE_KM:
        raise LiveError(
            code="invalid_request",
            message=f"Area side length must be at most {MAX_SIDE_KM} km (current: width {width_km} km, height {height_km} km).",
        )

    if area_km2 > MAX_AREA_KM2:
        raise LiveError(
            code="invalid_request",
            message=f"Total area must not exceed {MAX_AREA_KM2} km² (current: {area_km2} km²).",
        )

    date_fmt = "%Y-%m-%d"
    try:
        start_a = datetime.strptime(before_window.get("start", ""), date_fmt).date()
        end_a = datetime.strptime(before_window.get("end", ""), date_fmt).date()
    except (ValueError, TypeError):
        raise LiveError(
            code="invalid_request",
            message="Invalid date format for before window. Expected YYYY-MM-DD.",
            window="before",
        )

    try:
        start_b = datetime.strptime(after_window.get("start", ""), date_fmt).date()
        end_b = datetime.strptime(after_window.get("end", ""), date_fmt).date()
    except (ValueError, TypeError):
        raise LiveError(
            code="invalid_request",
            message="Invalid date format for after window. Expected YYYY-MM-DD.",
            window="after",
        )

    if start_a > end_a:
        raise LiveError(
            code="invalid_request",
            message=f"Before window start date ({start_a}) must be earlier than or equal to end date ({end_a}).",
            window="before",
        )

    if start_b > end_b:
        raise LiveError(
            code="invalid_request",
            message=f"After window start date ({start_b}) must be earlier than or equal to end date ({end_b}).",
            window="after",
        )

    if end_a >= start_b:
        raise LiveError(
            code="invalid_request",
            message="Before window must be strictly earlier than after window, and windows cannot overlap.",
        )

    span_a = (end_a - start_a).days + 1
    span_b = (end_b - start_b).days + 1

    if span_a > MAX_WINDOW_DAYS:
        raise LiveError(
            code="invalid_request",
            message=f"Before window duration ({span_a} days) exceeds maximum allowed {MAX_WINDOW_DAYS} days.",
            window="before",
        )

    if span_b > MAX_WINDOW_DAYS:
        raise LiveError(
            code="invalid_request",
            message=f"After window duration ({span_b} days) exceeds maximum allowed {MAX_WINDOW_DAYS} days.",
            window="after",
        )

    scale = compute_export_scale(norm_box)
    return norm_box, scale


def initialize_ee() -> None:
    """Initializes Google Earth Engine with the configured project ID."""
    if not EE_AVAILABLE or ee is None:
        raise LiveError(
            code="ee_not_ready",
            message="Earth Engine is not set up on this computer. Run earthengine authenticate and set EARTHENGINE_PROJECT.",
        )

    project = (os.environ.get("EARTHENGINE_PROJECT") or "").strip()
    if not project:
        raise LiveError(
            code="ee_not_ready",
            message="Earth Engine is not set up on this computer. Run earthengine authenticate and set EARTHENGINE_PROJECT.",
        )

    try:
        ee.Initialize(project=project)
    except Exception as e:
        logger.warning(f"ee.Initialize failed: {e}")
        raise LiveError(
            code="ee_not_ready",
            message="Earth Engine is not set up on this computer. Run earthengine authenticate and set EARTHENGINE_PROJECT.",
        )


def check_ee_status() -> Dict[str, Any]:
    """Lightweight readiness probe without heavy operations."""
    if not EE_AVAILABLE or ee is None:
        return {"installed": False, "initialized": False, "project": None}

    project = (os.environ.get("EARTHENGINE_PROJECT") or "").strip()
    if not project:
        return {"installed": True, "initialized": False, "project": None}

    try:
        ee.Initialize(project=project)
        return {"installed": True, "initialized": True, "project": project}
    except Exception:
        return {"installed": True, "initialized": False, "project": project}


def select_group(
    s1_collection: Any,
    start_date_a: str,
    end_date_a: str,
    start_date_b: str,
    end_date_b: str,
) -> Dict[str, Any]:
    """
    Selects a single orbital geometry (direction and track) with imagery in both windows.
    Ports scripts/gee/verified_sylhet_picker.js exactly.
    """
    end_a_exclusive = ee.Date(end_date_a).advance(1, "day")
    end_b_exclusive = ee.Date(end_date_b).advance(1, "day")

    col_a = s1_collection.filterDate(start_date_a, end_a_exclusive)
    col_b = s1_collection.filterDate(start_date_b, end_b_exclusive)

    before_passes = col_a.aggregate_array("orbitProperties_pass").getInfo() or []
    before_orbits = col_a.aggregate_array("relativeOrbitNumber_start").getInfo() or []
    after_passes = col_b.aggregate_array("orbitProperties_pass").getInfo() or []
    after_orbits = col_b.aggregate_array("relativeOrbitNumber_start").getInfo() or []

    if len(before_passes) == 0:
        raise LiveError(
            code="no_images_in_window",
            message=f"No Sentinel-1 images were found for the before window ({start_date_a} to {end_date_a}). Widen the window or choose other dates.",
            window="before",
        )

    if len(after_passes) == 0:
        raise LiveError(
            code="no_images_in_window",
            message=f"No Sentinel-1 images were found for the after window ({start_date_b} to {end_date_b}). Widen the window or choose other dates.",
            window="after",
        )

    count_map_a: Dict[Tuple[str, int], int] = {}
    for p, o in zip(before_passes, before_orbits):
        if p and o is not None:
            key = (str(p), int(o))
            count_map_a[key] = count_map_a.get(key, 0) + 1

    count_map_b: Dict[Tuple[str, int], int] = {}
    for p, o in zip(after_passes, after_orbits):
        if p and o is not None:
            key = (str(p), int(o))
            count_map_b[key] = count_map_b.get(key, 0) + 1

    all_keys = set(count_map_a.keys()) | set(count_map_b.keys())
    candidates = []

    for k in all_keys:
        cA = count_map_a.get(k, 0)
        cB = count_map_b.get(k, 0)
        if cA > 0 and cB > 0:
            candidates.append({
                "pass": k[0],
                "orbit": k[1],
                "beforeCount": cA,
                "afterCount": cB,
                "minCount": min(cA, cB),
            })

    if not candidates:
        raise LiveError(
            code="no_common_orbit",
            message="No single orbit geometry has images in both windows. Widen a window or move the area.",
        )

    # Sort candidates matching verified script:
    # 1. Highest minCount
    # 2. DESCENDING first
    # 3. Lower orbit number
    candidates.sort(
        key=lambda c: (
            -c["minCount"],
            0 if c["pass"] == "DESCENDING" else 1,
            c["orbit"],
        )
    )

    return candidates[0]


def _stream_download(url: str, dest_path: str, cap_bytes: int = MAX_DOWNLOAD_BYTES, timeout: int = DOWNLOAD_TIMEOUT_SECONDS) -> None:
    """Streams an HTTP download with byte limit and timeout."""
    with requests.get(url, stream=True, timeout=timeout) as resp:
        resp.raise_for_status()
        total_bytes = 0
        with open(dest_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=64 * 1024):
                if chunk:
                    total_bytes += len(chunk)
                    if total_bytes > cap_bytes:
                        raise LiveError(
                            code="too_large",
                            message=f"Downloaded imagery exceeded the {cap_bytes // (1024 * 1024)} MB limit.",
                        )
                    f.write(chunk)


def _process_downloaded_raster(raw_path: str, out_tif_path: str, target_box: Tuple[float, float, float, float]) -> None:
    """
    Inspects first bytes to detect ZIP vs GeoTIFF, unpacks ZIP,
    and produces a clean 2-band GeoTIFF [VV, VH].
    """
    with open(raw_path, "rb") as f:
        header = f.read(4)

    is_zip = header.startswith(b"PK\x03\x04")
    is_tiff = header.startswith(b"II*\x00") or header.startswith(b"MM\x00*") or header.startswith(b"II+\x00") or header.startswith(b"MM\x00+")

    if is_zip:
        extract_dir = os.path.join(os.path.dirname(raw_path), "extracted_" + os.path.basename(raw_path))
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(raw_path, "r") as z:
            z.extractall(extract_dir)

        tif_files = [
            os.path.join(extract_dir, fn)
            for fn in os.listdir(extract_dir)
            if fn.lower().endswith((".tif", ".tiff"))
        ]

        if len(tif_files) == 1:
            _standardize_two_band_tiff(tif_files[0], out_tif_path)
        elif len(tif_files) >= 2:
            # Per-band files: find VV and VH
            vv_file = next((f for f in tif_files if "vv" in os.path.basename(f).lower()), None)
            vh_file = next((f for f in tif_files if "vh" in os.path.basename(f).lower()), None)
            if not vv_file or not vh_file:
                # Fallback to sorting
                tif_files.sort()
                vv_file, vh_file = tif_files[0], tif_files[1]

            _stack_two_bands(vv_file, vh_file, out_tif_path)
        else:
            raise LiveError(
                code="processing_failed",
                message="Downloaded archive did not contain any valid GeoTIFF files.",
            )
    elif is_tiff:
        _standardize_two_band_tiff(raw_path, out_tif_path)
    else:
        raise LiveError(
            code="processing_failed",
            message="Unrecognized imagery format returned by Earth Engine (expected GeoTIFF or ZIP).",
        )


def _standardize_two_band_tiff(in_path: str, out_path: str) -> None:
    """Ensures input TIFF has at least two bands (VV and VH). If 1 band, duplicates it."""
    with rasterio.open(in_path) as src:
        profile = src.profile.copy()
        if src.count >= 2:
            if in_path != out_path:
                with rasterio.open(out_path, "w", **profile) as dst:
                    for i in range(1, src.count + 1):
                        dst.write(src.read(i), i)
        elif src.count == 1:
            band1 = src.read(1)
            profile.update(count=2)
            with rasterio.open(out_path, "w", **profile) as dst:
                dst.write(band1, 1)
                dst.write(band1, 2)


def _stack_two_bands(vv_path: str, vh_path: str, out_path: str) -> None:
    """Stacks separate VV and VH GeoTIFF files into a single 2-band GeoTIFF."""
    with rasterio.open(vv_path) as src_vv, rasterio.open(vh_path) as src_vh:
        vv_data = src_vv.read(1)
        vh_data = src_vh.read(1)
        profile = src_vv.profile.copy()
        profile.update(count=2, dtype=rasterio.float32)

        with rasterio.open(out_path, "w", **profile) as dst:
            dst.write(vv_data.astype(np.float32), 1)
            dst.write(vh_data.astype(np.float32), 2)


def fetch_pair(
    box: Tuple[float, float, float, float],
    before_window: Dict[str, str],
    after_window: Dict[str, str],
    group: Dict[str, Any],
    scale: int,
    work_dir: str,
) -> Tuple[str, str, Dict[str, Any]]:
    """
    Downloads and prepares image_a.tif and image_b.tif from Google Earth Engine.
    Returns (path_a, path_b, provenance_dict).
    """
    w, s, e, n = box
    aoi = ee.Geometry.Rectangle([w, s, e, n])

    start_a = before_window["start"]
    end_a = before_window["end"]
    start_b = after_window["start"]
    end_b = after_window["end"]

    end_a_exclusive = ee.Date(end_a).advance(1, "day")
    end_b_exclusive = ee.Date(end_b).advance(1, "day")

    s1 = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(aoi)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.eq("orbitProperties_pass", group["pass"]))
        .filter(ee.Filter.eq("relativeOrbitNumber_start", group["orbit"]))
    )

    col_a = s1.filterDate(start_a, end_a_exclusive)
    col_b = s1.filterDate(start_b, end_b_exclusive)

    timestamps_a = col_a.aggregate_array("system:time_start").getInfo() or []
    timestamps_b = col_b.aggregate_array("system:time_start").getInfo() or []

    def format_ts_range(ts_list: List[int], default_start: str, default_end: str) -> Tuple[str, str]:
        if not ts_list:
            return default_start, default_end
        ts_sorted = sorted(ts_list)
        d_min = datetime.utcfromtimestamp(ts_sorted[0] / 1000.0).strftime("%Y-%m-%d")
        d_max = datetime.utcfromtimestamp(ts_sorted[-1] / 1000.0).strftime("%Y-%m-%d")
        return d_min, d_max

    first_a, last_a = format_ts_range(timestamps_a, start_a, end_a)
    first_b, last_b = format_ts_range(timestamps_b, start_b, end_b)

    im_a = col_a.select(["VV", "VH"]).median().clip(aoi)
    im_b = col_b.select(["VV", "VH"]).median().clip(aoi)

    # getDownloadURL call
    params = {
        "scale": scale,
        "crs": "EPSG:4326",
        "region": aoi,
        "format": "GEO_TIFF",
    }

    try:
        url_a = im_a.getDownloadURL(params)
    except Exception as e:
        raise LiveError("download_failed", f"Failed to acquire download URL for baseline window: {str(e)}", "before")

    try:
        url_b = im_b.getDownloadURL(params)
    except Exception as e:
        raise LiveError("download_failed", f"Failed to acquire download URL for comparison window: {str(e)}", "after")

    raw_a_path = os.path.join(work_dir, "raw_a.bin")
    raw_b_path = os.path.join(work_dir, "raw_b.bin")
    out_a_path = os.path.join(work_dir, "image_a.tif")
    out_b_path = os.path.join(work_dir, "image_b.tif")

    _stream_download(url_a, raw_a_path)
    _stream_download(url_b, raw_b_path)

    _process_downloaded_raster(raw_a_path, out_a_path, box)
    _process_downloaded_raster(raw_b_path, out_b_path, box)

    provenance = {
        "orbitDirection": group["pass"],
        "orbitNumber": group["orbit"],
        "beforeCount": len(timestamps_a) or group.get("beforeCount", 1),
        "afterCount": len(timestamps_b) or group.get("afterCount", 1),
        "beforeDates": [first_a, last_a],
        "afterDates": [first_b, last_b],
        "scale": scale,
        "box": [w, s, e, n],
    }

    return out_a_path, out_b_path, provenance


def analyze_live(
    image_a_path: str,
    image_b_path: str,
    out_dir: str,
    mode: str,
    start_date_a: str,
    start_date_b: str,
    provenance: Dict[str, Any],
) -> Dict[str, Any]:
    """Runs change detection on downloaded pair and formats result JSON."""
    os.makedirs(out_dir, exist_ok=True)
    result = run_analysis(
        before_path=image_a_path,
        after_path=image_b_path,
        out_dir=out_dir,
        aoi_id="live",
        mode=mode,
        date_a=start_date_a,
        date_b=start_date_b,
    )

    result["provenance"] = provenance
    return result
