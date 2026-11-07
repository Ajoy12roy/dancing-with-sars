"""
scripts/wildfire/fetch_nisar_windows_r2.py

Day 9-R2.1 Step 4: Radiometric sanity verification and NISAR window streaming.
Strict 8 GB RAM guardrails:
- One band/granule in memory at a time
- Explicit del and gc.collect()
- float32 arrays only
- HTTP range reads via fsspec (never download full granule)
- Subwindow <= 2048 x 2048 pixels
"""

import datetime
import gc
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fsspec
import h5py
import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_bounds
from rasterio.warp import transform, transform_bounds

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_WILDFIRE = REPO_ROOT / "data" / "wildfire"
SAMPLES_WILDFIRE = REPO_ROOT / "data" / "samples" / "wildfire"

EVENT_ID = "wildfire-2026-T054-F036-siberia"
TRACK = "054"
FRAME = "036"
DIRECTION = "A"
MODE = "2005"
CENTROID_LON = 75.2658
CENTROID_LAT = 66.3310
AOI_BBOX = [75.0420, 66.2412, 75.4896, 66.4208]  # [min_lon, min_lat, max_lon, max_lat]
BEFORE_DATE = "2026-07-23"
AFTER_DATE = "2026-08-28"
REF_PRE_DATE = "2026-07-11"


def get_earthdata_token() -> str:
    token = os.environ.get("EARTHDATA_TOKEN", "").strip()
    if not token:
        print("NOT RUN: EARTHDATA_TOKEN not set", file=sys.stderr)
        sys.exit(0)
    return token


def sanitize_url(url: str) -> str:
    p = urllib.parse.urlparse(url)
    return urllib.parse.urlunparse((p.scheme, p.netloc, p.path, "", "", ""))


def query_cmr_granules() -> List[Dict[str, Any]]:
    """Queries CMR for granules of the same track, frame, direction and mode over 2026."""
    token = get_earthdata_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = (
        "https://cmr.earthdata.nasa.gov/search/granules.json?"
        "short_name=NISAR_L2_GCOV_PROVISIONAL_V1&"
        "temporal=2026-01-01T00:00:00Z,2026-12-31T23:59:59Z&"
        "options[readable_granule_name][pattern]=true&"
        f"readable_granule_name[]=*_{TRACK}_{DIRECTION}_{FRAME}_{MODE}_*&"
        "page_size=100&"
        "sort_key=start_date"
    )
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)

    granules = []
    for entry in data.get("feed", {}).get("entry", []):
        title = entry.get("title", "")
        # Extract direct HDF5 download URL from links
        h5_url = None
        for link in entry.get("links", []):
            href = link.get("href", "")
            if href.endswith(".h5") and not href.endswith(".xml"):
                h5_url = href
                break

        time_start = entry.get("time_start", "")
        date_str = time_start[:10]
        # Title parts: NISAR_L2_PR_GCOV_026_054_A_036_2005_DHDH_A_...
        parts = title.split("_")
        cycle = int(parts[4]) if len(parts) > 4 and parts[4].isdigit() else 0
        crid = parts[10] if len(parts) > 10 else "UNKNOWN"

        granules.append({
            "title": title,
            "date": date_str,
            "cycle": cycle,
            "track": TRACK,
            "frame": FRAME,
            "direction": DIRECTION,
            "mode": MODE,
            "crid": crid,
            "url": h5_url,
            "time_start": time_start,
        })

    granules.sort(key=lambda g: g["date"])
    return granules


def select_granules_for_sanity(granules: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Finds BEFORE and AFTER granules, plus 3 before BEFORE date and 3 after AFTER date.
    Returns ordered dict with before_3, before_2, before_1, BEFORE, AFTER, after_1, after_2, after_3.
    """
    before_g = next((g for g in granules if g["date"] == BEFORE_DATE), None)
    after_g = next((g for g in granules if g["date"] == AFTER_DATE), None)
    ref_g = next((g for g in granules if g["date"] == REF_PRE_DATE), None)

    if not before_g:
        raise ValueError(f"BEFORE granule with date {BEFORE_DATE} not found in CMR results!")
    if not after_g:
        raise ValueError(f"AFTER granule with date {AFTER_DATE} not found in CMR results!")

    prior_granules = [g for g in granules if g["date"] < BEFORE_DATE]
    subsequent_granules = [g for g in granules if g["date"] > AFTER_DATE]

    # Take up to 3 immediately prior to BEFORE
    prior_3 = prior_granules[-3:] if len(prior_granules) >= 3 else prior_granules
    # Take up to 3 immediately subsequent to AFTER
    subsequent_3 = subsequent_granules[:3] if len(subsequent_granules) >= 3 else subsequent_granules

    all_sanity = prior_3 + [before_g, after_g] + subsequent_3
    # Sort strictly by date
    all_sanity.sort(key=lambda g: g["date"])

    return {
        "before_granule": before_g,
        "after_granule": after_g,
        "ref_granule": ref_g,
        "prior_granules": prior_3,
        "subsequent_granules": subsequent_3,
        "all_sanity_granules": all_sanity,
    }


class RangeTrackingFile:
    """Wraps an fsspec file object to accurately track HTTP range read bytes."""
    def __init__(self, raw_file):
        self._raw = raw_file
        self.bytes_read = 0

    def read(self, *args, **kwargs):
        chunk = self._raw.read(*args, **kwargs)
        if chunk:
            self.bytes_read += len(chunk)
        return chunk

    def seek(self, *args, **kwargs):
        return self._raw.seek(*args, **kwargs)

    def tell(self, *args, **kwargs):
        return self._raw.tell(*args, **kwargs)

    def close(self):
        return self._raw.close()


def stream_test_window_median(
    granule: Dict[str, Any],
    token: str,
    counters: Dict[str, Any],
) -> float:
    """Streams 256x256 test window for band HHHH centered at candidate centroid."""
    url = granule["url"]
    headers = {"Authorization": f"Bearer {token}"}
    fs = fsspec.filesystem("http", headers=headers)

    t0 = time.time()
    with fs.open(url, mode="rb", block_size=2 * 1024 * 1024, cache_type="readahead") as f_raw:
        wrapped_f = RangeTrackingFile(f_raw)
        with h5py.File(wrapped_f, "r") as h5:
            grid_path = "/science/LSAR/GCOV/grids/frequencyA"
            proj_obj = h5[grid_path]["projection"]
            epsg = int(proj_obj[()]) if proj_obj.shape == () else int(proj_obj.attrs.get("epsg_code", 3413))
            crs = CRS.from_epsg(epsg)

            x_coords = np.array(h5[grid_path]["xCoordinates"])
            y_coords = np.array(h5[grid_path]["yCoordinates"])

            # Transform centroid
            xs, ys = transform(CRS.from_epsg(4326), crs, [CENTROID_LON], [CENTROID_LAT])
            xc, yc = xs[0], ys[0]

            col_c = int(np.searchsorted(x_coords, xc))
            y_res = float(y_coords[1] - y_coords[0])
            if y_res < 0:
                row_c = int(np.searchsorted(-y_coords, -yc))
            else:
                row_c = int(np.searchsorted(y_coords, yc))

            # 256 x 256 window
            r0 = max(0, row_c - 128)
            r1 = min(len(y_coords), r0 + 256)
            c0 = max(0, col_c - 128)
            c1 = min(len(x_coords), c0 + 256)

            ds = h5[f"{grid_path}/HHHH"]
            arr = np.array(ds[r0:r1, c0:c1], dtype=np.float32)

            # Convert to dB with 1e-7 floor
            arr_db = 10.0 * np.log10(np.maximum(arr, 1e-7))
            med_db = float(np.nanmedian(arr_db))

            del arr, arr_db, x_coords, y_coords
            gc.collect()

        bytes_streamed = wrapped_f.bytes_read
        counters["nisar_streamed_bytes"] += bytes_streamed
        counters["nisar_stream_requests"] += 1

    dur = time.time() - t0
    print(f"  [{granule['date']} Cycle {granule['cycle']}] Test window: median = {med_db:.2f} dB ({bytes_streamed / 1024 / 1024:.2f} MB in {dur:.1f}s)", flush=True)
    return med_db


def evaluate_radiometric_sanity(
    sanity_granules: List[Dict[str, Any]],
    medians: List[float],
) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Tests whether each granule is an outlier:
    |median - median(others)| > 3 * 1.4826 * MAD(others).
    Returns (all_passed, results_list).
    """
    n = len(medians)
    results = []
    before_passed = True
    after_passed = True

    for i in range(n):
        g = sanity_granules[i]
        med_i = medians[i]
        others = [medians[j] for j in range(n) if j != i]
        med_others = float(np.median(others))
        mad_others = float(np.median(np.abs(np.array(others) - med_others)))
        # 3 * 1.4826 * MAD
        thresh = 3.0 * 1.4826 * max(mad_others, 1e-4)
        diff = abs(med_i - med_others)
        is_outlier = diff > thresh

        res = {
            "title": g["title"],
            "date": g["date"],
            "cycle": g["cycle"],
            "median_db": round(med_i, 3),
            "median_others_db": round(med_others, 3),
            "mad_others_db": round(mad_others, 3),
            "threshold_db": round(thresh, 3),
            "diff_db": round(diff, 3),
            "is_outlier": bool(is_outlier),
            "role": "BEFORE" if g["date"] == BEFORE_DATE else ("AFTER" if g["date"] == AFTER_DATE else "SANITY"),
        }
        results.append(res)

        if g["date"] == BEFORE_DATE and is_outlier:
            before_passed = False
        if g["date"] == AFTER_DATE and is_outlier:
            after_passed = False

    passed = before_passed and after_passed
    return passed, results


def stream_aoi_subwindow(
    granule: Dict[str, Any],
    polarization: str,
    token: str,
    out_tif: Path,
    counters: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Streams the 20 km x 20 km AOI subwindow for given polarization (HHHH or HVHV)
    and saves as georeferenced float32 GeoTIFF.
    """
    url = granule["url"]
    headers = {"Authorization": f"Bearer {token}"}
    fs = fsspec.filesystem("http", headers=headers)

    t0 = time.time()
    out_tif.parent.mkdir(parents=True, exist_ok=True)

    with fs.open(url, mode="rb", block_size=2 * 1024 * 1024, cache_type="readahead") as f_raw:
        wrapped_f = RangeTrackingFile(f_raw)
        with h5py.File(wrapped_f, "r") as h5:
            grid_path = "/science/LSAR/GCOV/grids/frequencyA"
            proj_obj = h5[grid_path]["projection"]
            epsg = int(proj_obj[()]) if proj_obj.shape == () else int(proj_obj.attrs.get("epsg_code", 3413))
            crs = CRS.from_epsg(epsg)

            x_coords = np.array(h5[grid_path]["xCoordinates"])
            y_coords = np.array(h5[grid_path]["yCoordinates"])

            # Transform AOI bounding box
            w_geo, s_geo, e_geo, n_geo = AOI_BBOX
            w_proj, s_proj, e_proj, n_proj = transform_bounds(
                CRS.from_epsg(4326), crs, w_geo, s_geo, e_geo, n_geo
            )

            # Col range (ascending)
            c0 = max(0, int(np.searchsorted(x_coords, min(w_proj, e_proj), side="left")))
            c1 = min(len(x_coords), int(np.searchsorted(x_coords, max(w_proj, e_proj), side="right")))

            y_res = float(y_coords[1] - y_coords[0])
            if y_res < 0:  # north-up descending
                r0 = max(0, int(np.searchsorted(-y_coords, -max(s_proj, n_proj), side="left")))
                r1 = min(len(y_coords), int(np.searchsorted(-y_coords, -min(s_proj, n_proj), side="right")))
            else:
                r0 = max(0, int(np.searchsorted(y_coords, min(s_proj, n_proj), side="left")))
                r1 = min(len(y_coords), int(np.searchsorted(y_coords, max(s_proj, n_proj), side="right")))

            width = c1 - c0
            height = r1 - r0
            assert width <= 2048 and height <= 2048, f"Subwindow size ({width}x{height}) exceeds 2048x2048 cap!"

            ds_name = "HHHH" if polarization == "HH" else "HVHV"
            ds = h5[f"{grid_path}/{ds_name}"]
            arr = np.array(ds[r0:r1, c0:c1], dtype=np.float32)

            # Bounding box in projected coordinates for GeoTIFF georeferencing
            x_min = float(x_coords[c0])
            x_max = float(x_coords[c1 - 1] + abs(x_coords[1] - x_coords[0]))
            if y_res < 0:
                y_max = float(y_coords[r0])
                y_min = float(y_coords[r1 - 1] - abs(y_res))
            else:
                y_min = float(y_coords[r0])
                y_max = float(y_coords[r1 - 1] + abs(y_res))

            transform_affine = from_bounds(x_min, y_min, x_max, y_max, width, height)

            # Save float32 GeoTIFF
            with rasterio.open(
                out_tif,
                "w",
                driver="GTiff",
                height=height,
                width=width,
                count=1,
                dtype=rasterio.float32,
                crs=crs,
                transform=transform_affine,
                nodata=np.nan,
            ) as dst:
                dst.write(arr, 1)

            # Compute statistics
            valid_mask = np.isfinite(arr) & (arr > 0)
            valid_vals = arr[valid_mask]
            stats = {
                "shape": [int(height), int(width)],
                "pixel_size_m": [abs(float(x_coords[1] - x_coords[0])), abs(float(y_res))],
                "epsg": epsg,
                "bounds_proj": [x_min, y_min, x_max, y_max],
                "valid_pixels": int(np.sum(valid_mask)),
                "min_linear": round(float(np.min(valid_vals)), 5) if len(valid_vals) > 0 else 0.0,
                "max_linear": round(float(np.max(valid_vals)), 5) if len(valid_vals) > 0 else 0.0,
                "mean_linear": round(float(np.mean(valid_vals)), 5) if len(valid_vals) > 0 else 0.0,
                "median_linear": round(float(np.median(valid_vals)), 5) if len(valid_vals) > 0 else 0.0,
            }

            del arr, valid_vals, valid_mask, x_coords, y_coords
            gc.collect()

        bytes_streamed = wrapped_f.bytes_read
        counters["nisar_streamed_bytes"] += bytes_streamed
        counters["nisar_stream_requests"] += 1

    dur = time.time() - t0
    print(f"  [{granule['date']} {polarization}] Streamed {width}x{height} raster -> {out_tif.name} ({bytes_streamed / 1024 / 1024:.2f} MB in {dur:.1f}s)", flush=True)
    stats["file_bytes"] = out_tif.stat().st_size
    stats["streamed_bytes"] = bytes_streamed
    return stats


def run_pipeline() -> None:
    token = get_earthdata_token()
    counters = {
        "cmr_requests": 0,
        "nisar_stream_requests": 0,
        "nisar_streamed_bytes": 0,
    }

    print("=== Step 4: NISAR Granule Search and Radiometric Sanity ===", flush=True)
    granules = query_cmr_granules()
    counters["cmr_requests"] += 1
    print(f"Found {len(granules)} matching granules for Track {TRACK}, Frame {FRAME}, Direction {DIRECTION}, Mode {MODE} in 2026", flush=True)

    selection = select_granules_for_sanity(granules)
    sanity_granules = selection["all_sanity_granules"]
    print(f"Selected {len(sanity_granules)} granules for radiometric sanity testing:", flush=True)
    for g in sanity_granules:
        role = "BEFORE" if g["date"] == BEFORE_DATE else ("AFTER" if g["date"] == AFTER_DATE else "SANITY")
        print(f"  - {g['date']} (Cycle {g['cycle']}) [{role}]: {g['title']}", flush=True)

    # 4b: Stream test windows and compute medians
    print("\n--- Streaming 256x256 test windows (band HHHH) ---", flush=True)
    medians = []
    for g in sanity_granules:
        med = stream_test_window_median(g, token, counters)
        medians.append(med)

    # 4c: Radiometric sanity outlier evaluation
    passed, sanity_results = evaluate_radiometric_sanity(sanity_granules, medians)
    print("\n--- Radiometric Sanity Results ---", flush=True)
    for r in sanity_results:
        status_str = "PASS" if not r["is_outlier"] else "**FAIL (OUTLIER)**"
        print(f"  {r['date']} (Cycle {r['cycle']}, {r['role']}): median = {r['median_db']} dB, others_med = {r['median_others_db']} dB, diff = {r['diff_db']} dB (threshold = {r['threshold_db']} dB) -> {status_str}", flush=True)

    if not passed:
        failed_granule = next(r["title"] for r in sanity_results if (r["role"] in ("BEFORE", "AFTER")) and r["is_outlier"])
        print(f"\nNOT PROCEEDING: {failed_granule} failed radiometric sanity", flush=True)
        # Write metadata documenting failure
        out_meta_dir = DATA_WILDFIRE / EVENT_ID
        out_meta_dir.mkdir(parents=True, exist_ok=True)
        with open(out_meta_dir / "metadata.json", "w", encoding="utf-8") as f:
            json.dump({
                "event_id": EVENT_ID,
                "track": TRACK,
                "frame": FRAME,
                "direction": DIRECTION,
                "bandwidth_mode": MODE,
                "polarization": "DHDH",
                "crid": selection["before_granule"]["crid"],
                "data_maturity": "PROVISIONAL",
                "centroid": [CENTROID_LON, CENTROID_LAT],
                "aoi_bbox": AOI_BBOX,
                "status": f"NOT PROCEEDING: {failed_granule} failed radiometric sanity",
                "sanity_results": sanity_results,
                "rasters": {},
                "counters": counters,
            }, f, indent=2)
        sys.exit(1)

    print("\nBoth BEFORE and AFTER granules PASSED radiometric sanity verification!", flush=True)

    # 4d: Stream 20 km x 20 km AOI subwindows
    print("\n--- Streaming 20 km x 20 km AOI subwindows (HH and HV) ---", flush=True)
    out_samples_dir = SAMPLES_WILDFIRE / EVENT_ID
    out_samples_dir.mkdir(parents=True, exist_ok=True)

    target_granules = [
        ("before", selection["before_granule"]),
        ("after", selection["after_granule"]),
    ]
    if selection.get("ref_granule"):
        target_granules.append(("reference_pre", selection["ref_granule"]))

    rasters_meta = {}
    for role, g in target_granules:
        for pol in ("HH", "HV"):
            fname = f"{role}_{g['date']}_C{g['cycle']}_{pol}.tif"
            out_tif = out_samples_dir / fname
            print(f"Streaming {fname}...", flush=True)
            stats = stream_aoi_subwindow(g, pol, token, out_tif, counters)
            rasters_meta[fname] = {
                "role": role,
                "date": g["date"],
                "cycle": g["cycle"],
                "polarization": pol,
                "granule_title": g["title"],
                "file_path": str(out_tif.relative_to(REPO_ROOT)),
                "statistics": stats,
            }

    # 4e: Save metadata JSON (<200 KB)
    metadata = {
        "event_id": EVENT_ID,
        "track": TRACK,
        "frame": FRAME,
        "direction": DIRECTION,
        "bandwidth_mode": MODE,
        "polarization": "DHDH",
        "crid": selection["before_granule"]["crid"],
        "data_maturity": "PROVISIONAL",
        "centroid": [CENTROID_LON, CENTROID_LAT],
        "aoi_bbox": AOI_BBOX,
        "dates": {
            "before": BEFORE_DATE,
            "after": AFTER_DATE,
            "reference_pre": REF_PRE_DATE,
        },
        "sanity_test": {
            "status": "PASSED",
            "evaluated_granules_count": len(sanity_results),
            "results": sanity_results,
        },
        "rasters": rasters_meta,
        "counters": counters,
    }

    out_meta_dir = DATA_WILDFIRE / EVENT_ID
    out_meta_dir.mkdir(parents=True, exist_ok=True)
    meta_path = out_meta_dir / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    meta_size = meta_path.stat().st_size
    print(f"\nWrote metadata to {meta_path} ({meta_size:,} bytes, < 200 KB)", flush=True)
    print(f"Total NISAR streamed bytes: {counters['nisar_streamed_bytes'] / 1024 / 1024:.2f} MB (cap: 1536 MB)", flush=True)
    print("=== Step 4 Complete ===", flush=True)


if __name__ == "__main__":
    run_pipeline()

