"""
scripts/wildfire/tile_event_selection.py

Day 9-R2.1: Tiled event-first wildfire selection.
Aggregates global FIRMS VIIRS_SNPP hotspots into fixed ~20 km row-based tiles using vectorised NumPy.
Strictly respects 8 GB RAM guardrails:
- One monthly window in memory at a time
- float32 / int32 for hotspot arrays
- Compacts each chunk to .npz and deletes raw CSV
- No cKDTree, no union-find, no pairwise distance search
- Heartbeat every 15s, explicit timeouts and retries
"""

import csv
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
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from scripts.wildfire.firms_client import get_firms_key

CACHE_DIR = REPO_ROOT / ".cache" / "wildfire" / "compact"
SCRATCH_DIR = REPO_ROOT / "scratch"
CANDIDATES_JSON = SCRATCH_DIR / "wildfire-candidates.json"

EARTH_RADIUS_KM = 6371.0
REF_DATE = datetime.date(2026, 1, 1)


def great_circle_distance_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Great-circle distance in kilometers using the Haversine formula."""
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2.0) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return EARTH_RADIUS_KM * c


def point_in_polygon(x: float, y: float, poly_pts: List[Tuple[float, float]]) -> bool:
    """Ray casting point in polygon algorithm."""
    inside = False
    n = len(poly_pts)
    if n < 3:
        return False
    p1x, p1y = poly_pts[0]
    for i in range(n + 1):
        p2x, p2y = poly_pts[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def polygon_contains_bbox(poly_pts: List[Tuple[float, float]], bbox: List[float]) -> bool:
    """Checks whether the polygon strictly contains all 4 corners of the bounding box."""
    w, s, e, n = bbox
    corners = [(w, s), (w, n), (e, s), (e, n)]
    for cx, cy in corners:
        if not point_in_polygon(cx, cy, poly_pts):
            return False
    return True


def download_chunk_stream(
    source: str,
    day_range: int,
    date_str: str,
    temp_csv_path: Path,
    counters: Dict[str, Any],
) -> int:
    """Downloads FIRMS CSV chunk to temporary file with retry and timeouts."""
    firms_key = get_firms_key()
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{firms_key}/{source}/world/{day_range}/{date_str}"
    safe_url = url.replace(firms_key, "[REDACTED]")

    max_retries = 3
    backoff = 5.0
    for attempt in range(max_retries):
        counters["firms_requests"] += 1
        req = urllib.request.Request(url, headers={"User-Agent": "Antigravity-Research/1.0"})
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                status = resp.status
                downloaded = 0
                with open(temp_csv_path, "wb") as f_out:
                    while True:
                        chunk = resp.read(65536)
                        if not chunk:
                            break
                        f_out.write(chunk)
                        downloaded += len(chunk)
                        if time.time() - t0 > 15:
                            print(f"  [Heartbeat] Downloading chunk {date_str}: {downloaded / 1e6:.1f} MB so far...", flush=True)
                            t0 = time.time()
                counters["firms_bytes"] += downloaded
                return downloaded
        except urllib.error.HTTPError as e:
            safe_err = str(e).replace(firms_key, "[REDACTED]")
            if e.code == 429:
                retry_after = int(e.headers.get("Retry-After", 15))
                print(f"HTTP 429 Rate limited. Sleeping {retry_after}s...", flush=True)
                time.sleep(retry_after)
            elif attempt < max_retries - 1:
                print(f"HTTP error {safe_err}. Retrying in {backoff}s (attempt {attempt+1}/{max_retries})...", flush=True)
                time.sleep(backoff)
                backoff *= 2.0
            else:
                raise RuntimeError(f"FIRMS download failed after {max_retries} attempts: {safe_err}")
        except Exception as e:
            safe_err = str(e).replace(firms_key, "[REDACTED]")
            if attempt < max_retries - 1:
                print(f"Network error: {safe_err}. Retrying in {backoff}s...", flush=True)
                time.sleep(backoff)
                backoff *= 2.0
            else:
                raise RuntimeError(f"FIRMS download error: {safe_err}")
    return 0


def compact_chunk(
    source: str,
    day_range: int,
    date_str: str,
    counters: Dict[str, Any],
) -> Path:
    """Ensures compacted .npz exists for chunk, downloading and compacting if needed."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    npz_path = CACHE_DIR / f"{source}_{date_str}_{day_range}_world.npz"

    if npz_path.exists():
        print(f"  [Cache hit] Using existing compacted chunk: {npz_path.name}", flush=True)
        return npz_path

    temp_csv = CACHE_DIR / f"temp_{source}_{date_str}_{day_range}.csv"
    t_start = time.time()

    print(f"  [Download] Fetching chunk {date_str} (range {day_range}) for {source}...", flush=True)
    bytes_downloaded = download_chunk_stream(source, day_range, date_str, temp_csv, counters)

    # Parse and compact with standard library csv (memory efficient)
    lats: List[float] = []
    lons: List[float] = []
    frps: List[float] = []
    dates: List[int] = []
    times: List[int] = []

    rows_read = 0
    rows_kept = 0
    rows_ignored_polar = 0

    t_last_heartbeat = time.time()
    with open(temp_csv, "r", encoding="utf-8", errors="replace") as f_in:
        reader = csv.DictReader(f_in)
        for row in reader:
            rows_read += 1
            if rows_read % 100000 == 0 and time.time() - t_last_heartbeat > 15:
                print(f"  [Heartbeat] Compacting {date_str}: {rows_read:,} rows processed, {rows_kept:,} kept...", flush=True)
                t_last_heartbeat = time.time()

            conf = str(row.get("confidence", "")).lower().strip()
            # Qualifying confidence: nominal or high ('n', 'h', 'nominal', 'high')
            if conf in ("nominal", "high", "n", "h"):
                try:
                    lat = float(row["latitude"])
                    lon = float(row["longitude"])
                    frp = float(row.get("frp", 0.0))
                except (ValueError, KeyError):
                    continue

                # Ignore polar hotspots beyond |latitude| > 70
                if abs(lat) > 70.0:
                    rows_ignored_polar += 1
                    continue

                acq_d_str = row.get("acq_date", "")
                try:
                    d_obj = datetime.date.fromisoformat(acq_d_str)
                    days_since_ref = (d_obj - REF_DATE).days
                except ValueError:
                    days_since_ref = 0

                try:
                    acq_time_int = int(row.get("acq_time", 0))
                except ValueError:
                    acq_time_int = 0

                lats.append(lat)
                lons.append(lon)
                frps.append(frp)
                dates.append(days_since_ref)
                times.append(acq_time_int)
                rows_kept += 1

    # Convert to typed compact NumPy arrays
    arr_lats = np.array(lats, dtype=np.float32)
    arr_lons = np.array(lons, dtype=np.float32)
    arr_frps = np.array(frps, dtype=np.float32)
    arr_dates = np.array(dates, dtype=np.int32)
    arr_times = np.array(times, dtype=np.int32)

    # Release Python lists
    del lats, lons, frps, dates, times
    gc.collect()

    # Save compressed .npz
    np.savez_compressed(
        npz_path,
        lats=arr_lats,
        lons=arr_lons,
        frps=arr_frps,
        dates=arr_dates,
        times=arr_times,
    )

    del arr_lats, arr_lons, arr_frps, arr_dates, arr_times
    gc.collect()

    # Delete raw CSV immediately
    if temp_csv.exists():
        temp_csv.unlink()

    duration = time.time() - t_start
    print(
        f"  [Compacted] {date_str}: {rows_read:,} read, {rows_kept:,} kept ({rows_ignored_polar:,} polar ignored), "
        f"{bytes_downloaded/1e6:.1f} MB in {duration:.1f}s -> {npz_path.name}",
        flush=True,
    )
    return npz_path


def load_window_hotspots(chunk_paths: List[Path]) -> Dict[str, np.ndarray]:
    """Loads and concatenates compacted .npz chunks for a single monthly window."""
    lats_list, lons_list, frps_list, dates_list, times_list = [], [], [], [], []
    for p in chunk_paths:
        data = np.load(p)
        lats_list.append(data["lats"])
        lons_list.append(data["lons"])
        frps_list.append(data["frps"])
        dates_list.append(data["dates"])
        times_list.append(data["times"])

    window_data = {
        "lats": np.concatenate(lats_list),
        "lons": np.concatenate(lons_list),
        "frps": np.concatenate(frps_list),
        "dates": np.concatenate(dates_list),
        "times": np.concatenate(times_list),
    }

    del lats_list, lons_list, frps_list, dates_list, times_list
    gc.collect()
    return window_data


def aggregate_tiles(window_data: Dict[str, np.ndarray]) -> List[Dict[str, Any]]:
    """
    Vectorised tile aggregation into 0.18-deg latitude rows (~20 km):
    row = floor((lat + 90) / 0.18)
    width_r = 0.18 / cos(latitude of row centre)
    col = floor((lon + 180) / width_r)
    """
    lats = window_data["lats"]
    lons = window_data["lons"]
    frps = window_data["frps"]
    dates = window_data["dates"]

    n = len(lats)
    if n == 0:
        return []

    # Row index: 0.18 deg resolution
    rows = np.floor((lats + 90.0) / 0.18).astype(np.int32)
    rows = np.clip(rows, 0, 999)

    # Centre latitude of row
    lat_centres = -90.0 + (rows.astype(np.float32) + 0.5) * 0.18
    w_r = 0.18 / np.cos(np.radians(lat_centres))

    # Col index
    cols = np.floor((lons + 180.0) / w_r).astype(np.int32)

    # Combined 64-bit integer key
    tile_keys = (rows.astype(np.int64) << 32) | (cols.astype(np.int64) & 0xFFFFFFFF)

    unique_keys, inverse_idx = np.unique(tile_keys, return_inverse=True)
    num_tiles = len(unique_keys)

    # Vectorised sums with bincount
    tile_counts = np.bincount(inverse_idx)
    tile_frps = np.bincount(inverse_idx, weights=frps.astype(np.float64))
    tile_sum_lons = np.bincount(inverse_idx, weights=(lons * frps).astype(np.float64))
    tile_sum_lats = np.bincount(inverse_idx, weights=(lats * frps).astype(np.float64))

    # Avoid divide by zero
    safe_frps = np.where(tile_frps > 0.0, tile_frps, 1.0)
    tile_centroids_lon = tile_sum_lons / safe_frps
    tile_centroids_lat = tile_sum_lats / safe_frps

    # Min and max dates per tile
    min_dates = np.full(num_tiles, 999999, dtype=np.int32)
    max_dates = np.zeros(num_tiles, dtype=np.int32)
    np.minimum.at(min_dates, inverse_idx, dates)
    np.maximum.at(max_dates, inverse_idx, dates)

    tiles = []
    for i in range(num_tiles):
        cnt = int(tile_counts[i])
        frp_sum = float(tile_frps[i])
        c_lon = float(tile_centroids_lon[i])
        c_lat = float(tile_centroids_lat[i])

        d_min_str = (REF_DATE + datetime.timedelta(days=int(min_dates[i]))).strftime("%Y-%m-%d")
        d_max_str = (REF_DATE + datetime.timedelta(days=int(max_dates[i]))).strftime("%Y-%m-%d")

        tiles.append({
            "tile_key": int(unique_keys[i]),
            "hotspot_count": cnt,
            "total_frp": round(frp_sum, 1),
            "centroid": [round(c_lon, 4), round(c_lat, 4)],
            "first_date": d_min_str,
            "last_date": d_max_str,
        })

    # Sort tiles by total FRP descending
    tiles.sort(key=lambda t: t["total_frp"], reverse=True)

    del rows, lat_centres, w_r, cols, tile_keys, unique_keys, inverse_idx
    del tile_counts, tile_frps, tile_sum_lons, tile_sum_lats, min_dates, max_dates
    gc.collect()

    return tiles


def pick_window_candidates(tiles: List[Dict[str, Any]], min_distance_km: float = 30.0) -> List[Dict[str, Any]]:
    """Greedily picks up to 5 tiles with >= 200 hotspots whose centroids are >= 30 km apart."""
    candidates = []
    for t in tiles:
        if t["hotspot_count"] < 200:
            continue
        lon_c, lat_c = t["centroid"]
        too_close = False
        for c in candidates:
            c_lon, c_lat = c["centroid"]
            dist = great_circle_distance_km(lon_c, lat_c, c_lon, c_lat)
            if dist < min_distance_km:
                too_close = True
                break
        if not too_close:
            candidates.append(t)
            if len(candidates) >= 5:
                break
    return candidates


def compute_event_aoi_hotspots(
    candidate: Dict[str, Any],
    window_data: Dict[str, np.ndarray],
) -> Dict[str, Any]:
    """
    Computes exact event AOI (20 km x 20 km centered on centroid) expanded by 1 km.
    Extracts event hotspots, exact first/last dates, and summed FRP.
    """
    lon_c, lat_c = candidate["centroid"]
    # 20 km square: half-width is 10 km. With 1 km expansion: 11 km half-width.
    half_lat_deg = 11.0 / 111.32
    half_lon_deg = 11.0 / (111.32 * max(0.01, math.cos(math.radians(lat_c))))

    w = lon_c - half_lon_deg
    s = lat_c - half_lat_deg
    e = lon_c + half_lon_deg
    n = lat_c + half_lat_deg

    lats = window_data["lats"]
    lons = window_data["lons"]
    frps = window_data["frps"]
    dates = window_data["dates"]
    times = window_data["times"]

    mask = (lats >= s) & (lats <= n) & (lons >= w) & (lons <= e)
    event_frps = frps[mask]
    event_dates = dates[mask]
    event_times = times[mask]
    event_lats = lats[mask]
    event_lons = lons[mask]

    total_frp = float(np.sum(event_frps)) if len(event_frps) > 0 else 0.0
    first_d = int(np.min(event_dates)) if len(event_dates) > 0 else 0
    last_d = int(np.max(event_dates)) if len(event_dates) > 0 else 0

    d_first_str = (REF_DATE + datetime.timedelta(days=first_d)).strftime("%Y-%m-%d")
    d_last_str = (REF_DATE + datetime.timedelta(days=last_d)).strftime("%Y-%m-%d")

    # 20 km AOI without 1 km expansion
    aoi_half_lat = 10.0 / 111.32
    aoi_half_lon = 10.0 / (111.32 * max(0.01, math.cos(math.radians(lat_c))))
    aoi_bbox = [
        round(lon_c - aoi_half_lon, 4),
        round(lat_c - aoi_half_lat, 4),
        round(lon_c + aoi_half_lon, 4),
        round(lat_c + aoi_half_lat, 4),
    ]

    event_info = {
        "aoi_bbox": aoi_bbox,
        "expanded_1km_bbox": [round(w, 4), round(s, 4), round(e, 4), round(n, 4)],
        "event_hotspots_count": int(np.sum(mask)),
        "event_total_frp": round(total_frp, 1),
        "event_first_date": d_first_str,
        "event_last_date": d_last_str,
        "hotspot_lats": event_lats.tolist(),
        "hotspot_lons": event_lons.tolist(),
        "hotspot_frps": event_frps.tolist(),
    }
    return event_info


def query_cmr_granules_for_aoi(
    aoi_bbox: List[float],
    counters: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Queries CMR for granules containing AOI expanded by 3 km on all sides."""
    # AOI expanded by 3 km
    lat_c = (aoi_bbox[1] + aoi_bbox[3]) / 2.0
    m3_lat = 3.0 / 111.32
    m3_lon = 3.0 / (111.32 * max(0.01, math.cos(math.radians(lat_c))))

    w3 = round(aoi_bbox[0] - m3_lon, 4)
    s3 = round(aoi_bbox[1] - m3_lat, 4)
    e3 = round(aoi_bbox[2] + m3_lon, 4)
    n3 = round(aoi_bbox[3] + m3_lat, 4)
    exp3_bbox = [w3, s3, e3, n3]

    bbox_str = f"{w3},{s3},{e3},{n3}"
    url = (
        f"https://cmr.earthdata.nasa.gov/search/granules.json?"
        f"short_name=NISAR_L2_GCOV_PROVISIONAL_V1"
        f"&bounding_box={bbox_str}"
        f"&temporal=2026-01-01T00:00:00Z,2026-12-31T23:59:59Z"
        f"&page_size=100"
    )

    counters["cmr_requests"] += 1
    req = urllib.request.Request(url, headers={"User-Agent": "Antigravity-Research/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            entries = data.get("feed", {}).get("entry", [])
    except Exception as exc:
        print(f"  [CMR Error] {exc}", flush=True)
        return []

    parsed = []
    for g in entries:
        title = g.get("title", "")
        parts = title.replace(".h5", "").split("_")
        if len(parts) < 18 or parts[0] != "NISAR":
            continue

        polygons = g.get("polygons")
        poly_pts = []
        if polygons and len(polygons) > 0 and len(polygons[0]) > 0:
            coords = polygons[0][0].split()
            if len(coords) >= 8:
                for i in range(0, len(coords), 2):
                    poly_pts.append((float(coords[i + 1]), float(coords[i])))  # (lon, lat)

        contains = polygon_contains_bbox(poly_pts, exp3_bbox) if poly_pts else False

        # Extract direct download link
        https_url = None
        for lk in g.get("links", []):
            href = lk.get("href", "")
            if href.endswith(".h5") and (href.startswith("https://") or lk.get("rel") == "http://esipfed.org/ns/fedsearch/1.1/data#"):
                https_url = href
                break

        parsed.append({
            "title": title,
            "cycle": int(parts[4]),
            "track": parts[5],
            "direction": parts[6],
            "frame": parts[7],
            "bandwidth_mode": parts[8],
            "polarization": parts[9],
            "crid": parts[13],
            "time_start": g.get("time_start", ""),
            "time_end": g.get("time_end", ""),
            "date": g.get("time_start", "")[:10],
            "contains_aoi": contains,
            "poly_pts": poly_pts,
            "https_url": https_url,
        })
    return parsed


def evaluate_candidate_pair(
    candidate: Dict[str, Any],
    counters: Dict[str, Any],
) -> Tuple[bool, str, Optional[Dict[str, Any]], Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Evaluates whether candidate has a valid BEFORE and AFTER NISAR pair:
    - Same track, frame, direction, mode, pol
    - Footprints strictly contain AOI + 3 km
    - BEFORE is latest strictly before event first date
    - AFTER is earliest strictly after event last date
    - (AFTER date - BEFORE date) <= 36 days
    Also retrieves preceding reference granule if available (for Step 5 no-event reference).
    """
    granules = query_cmr_granules_for_aoi(candidate["aoi_bbox"], counters)
    containing = [g for g in granules if g["contains_aoi"]]

    if not containing:
        return False, "No granule contains AOI expanded by 3 km", None, None, None

    groups = defaultdict(list)
    for g in containing:
        key = (g["track"], g["frame"], g["direction"], g["bandwidth_mode"], g["polarization"])
        groups[key].append(g)

    first_date = candidate["event_first_date"]
    last_date = candidate["event_last_date"]

    best_pair = None
    min_span = 999
    valid_found = False
    invalidation_reason = "No group has valid BEFORE and AFTER pair"

    for key, g_list in groups.items():
        before_cands = [g for g in g_list if g["date"] < first_date]
        after_cands = [g for g in g_list if g["date"] > last_date]

        if not before_cands:
            invalidation_reason = f"No BEFORE granule prior to {first_date}"
            continue
        if not after_cands:
            invalidation_reason = f"No AFTER granule after {last_date}"
            continue

        before_g = max(before_cands, key=lambda g: g["time_start"])
        after_g = min(after_cands, key=lambda g: g["time_start"])

        d_before = datetime.date.fromisoformat(before_g["date"])
        d_after = datetime.date.fromisoformat(after_g["date"])
        span_days = (d_after - d_before).days

        if span_days <= 36:
            # Check for preceding reference granule (strictly before BEFORE date)
            preceding_cands = [g for g in g_list if g["date"] < before_g["date"]]
            ref_pre_g = max(preceding_cands, key=lambda g: g["time_start"]) if preceding_cands else None

            if span_days < min_span:
                min_span = span_days
                best_pair = (before_g, after_g, span_days, ref_pre_g)
                valid_found = True
        else:
            invalidation_reason = f"Temporal span ({span_days} days) exceeds 36 days"

    if valid_found and best_pair:
        return True, f"Valid: span {best_pair[2]} days", best_pair[0], best_pair[1], best_pair[3]
    return False, invalidation_reason, None, None, None


def run_pipeline() -> Dict[str, Any]:
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    counters = {
        "firms_requests": 0,
        "firms_bytes": 0,
        "cmr_requests": 0,
    }

    # 9 monthly windows: Feb to Oct 2026, 12 days starting on the 10th
    windows = [
        {"month": "February", "start": "2026-02-10", "end": "2026-02-21", "source": "VIIRS_SNPP_SP"},
        {"month": "March", "start": "2026-03-10", "end": "2026-03-21", "source": "VIIRS_SNPP_SP"},
        {"month": "April", "start": "2026-04-10", "end": "2026-04-21", "source": "VIIRS_SNPP_SP"},
        {"month": "May", "start": "2026-05-10", "end": "2026-05-21", "source": "VIIRS_SNPP_SP"},
        {"month": "June", "start": "2026-06-10", "end": "2026-06-21", "source": "VIIRS_SNPP_SP"},
        {"month": "July", "start": "2026-07-10", "end": "2026-07-21", "source": "VIIRS_SNPP_SP"},
        {"month": "August", "start": "2026-08-10", "end": "2026-08-21", "source": "VIIRS_SNPP_NRT"},
        {"month": "September", "start": "2026-09-10", "end": "2026-09-21", "source": "VIIRS_SNPP_NRT"},
        {"month": "October", "start": "2026-10-10", "end": "2026-10-21", "source": "VIIRS_SNPP_NRT"},
    ]

    window_summaries = []
    all_candidates: List[Dict[str, Any]] = []

    print("=================================================================", flush=True)
    print("STEP 3: EVENT-FIRST WILDFIRE SELECTION BY FRP TILES (DAY 9-R2.1)", flush=True)
    print("=================================================================", flush=True)

    for w_idx, w in enumerate(windows):
        t_w0 = time.time()
        print(f"\n--- Window {w_idx+1}/9: {w['month']} 2026 ({w['start']} to {w['end']}, {w['source']}) ---", flush=True)

        d_start = datetime.date.fromisoformat(w["start"])
        chunks = [
            (w["start"], 5),
            ((d_start + datetime.timedelta(days=5)).strftime("%Y-%m-%d"), 5),
            ((d_start + datetime.timedelta(days=10)).strftime("%Y-%m-%d"), 2),
        ]

        chunk_paths = []
        for d_str, d_range in chunks:
            npz_p = compact_chunk(w["source"], d_range, d_str, counters)
            chunk_paths.append(npz_p)

        # Load window hotspots into memory
        window_data = load_window_hotspots(chunk_paths)
        total_hotspots = len(window_data["lats"])
        print(f"Loaded {total_hotspots:,} qualifying hotspots for {w['month']}.", flush=True)

        # Vectorised tile aggregation
        tiles = aggregate_tiles(window_data)
        tiles_ge_200 = [t for t in tiles if t["hotspot_count"] >= 200]
        top_tile_frp = tiles[0]["total_frp"] if tiles else 0.0

        # Pick up to 5 candidates
        cand_tiles = pick_window_candidates(tiles, min_distance_km=30.0)
        print(f"Tiles aggregated: {len(tiles):,} non-empty, {len(tiles_ge_200)} with >=200 pts, Top tile FRP: {top_tile_frp:,.1f} MW", flush=True)

        # Compute exact Event AOI and extract event hotspots for each candidate
        for c_idx, c_tile in enumerate(cand_tiles):
            cand_id = f"cand-{w['month'][:3].lower()}-{c_idx+1}"
            event_info = compute_event_aoi_hotspots(c_tile, window_data)

            cand_record = {
                "candidate_id": cand_id,
                "month": w["month"],
                "source": w["source"],
                "centroid": c_tile["centroid"],
                "tile_hotspots": c_tile["hotspot_count"],
                "tile_total_frp": c_tile["total_frp"],
                "aoi_bbox": event_info["aoi_bbox"],
                "expanded_1km_bbox": event_info["expanded_1km_bbox"],
                "event_hotspots_count": event_info["event_hotspots_count"],
                "event_total_frp": event_info["event_total_frp"],
                "event_first_date": event_info["event_first_date"],
                "event_last_date": event_info["event_last_date"],
                "hotspot_lats": event_info["hotspot_lats"],
                "hotspot_lons": event_info["hotspot_lons"],
                "hotspot_frps": event_info["hotspot_frps"],
            }
            all_candidates.append(cand_record)

        w_duration = time.time() - t_w0
        window_summaries.append({
            "month": w["month"],
            "date_range": f"{w['start']} to {w['end']}",
            "source": w["source"],
            "total_hotspots": total_hotspots,
            "non_empty_tiles": len(tiles),
            "tiles_ge_200": len(tiles_ge_200),
            "top_tile_frp": top_tile_frp,
            "seconds_taken": round(w_duration, 1),
        })

        # CRITICAL 8 GB RAM RULE: Free window arrays and run garbage collection
        del window_data, tiles, tiles_ge_200, cand_tiles
        gc.collect()

    print(f"\nTotal candidate tiles identified across 9 windows: {len(all_candidates)}", flush=True)

    # 3f: Query CMR for each candidate
    print("\n=== Evaluating NISAR GCOV Coverage via NASA CMR ===", flush=True)
    valid_candidates = []
    for cand in all_candidates:
        if counters["cmr_requests"] >= 150:
            cand["valid"] = False
            cand["invalidation_reason"] = "CMR request cap (150) reached"
            cand["before_granule"] = None
            cand["after_granule"] = None
            cand["ref_pre_granule"] = None
            continue

        valid, reason, before_g, after_g, ref_pre_g = evaluate_candidate_pair(cand, counters)
        cand["valid"] = valid
        cand["invalidation_reason"] = reason
        cand["before_granule"] = before_g
        cand["after_granule"] = after_g
        cand["ref_pre_granule"] = ref_pre_g

        status_str = f"VALID (Span: {(datetime.date.fromisoformat(after_g['date']) - datetime.date.fromisoformat(before_g['date'])).days}d)" if valid else f"INVALID ({reason})"
        print(f"Candidate {cand['candidate_id']} ({cand['month']}, Centroid: {cand['centroid']}, Event FRP: {cand['event_total_frp']} MW): {status_str}", flush=True)

        if valid:
            valid_candidates.append(cand)

    # Print Table of all 9 windows
    print("\n=== 9-Window Summary Table ===", flush=True)
    print("| Month | Date Range | Source | Hotspots | Non-Empty Tiles | Tiles >= 200 | Top Tile FRP (MW) | Duration (s) |", flush=True)
    print("| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |", flush=True)
    for ws in window_summaries:
        print(f"| {ws['month']} | {ws['date_range']} | {ws['source']} | {ws['total_hotspots']:,} | {ws['non_empty_tiles']:,} | {ws['tiles_ge_200']} | {ws['top_tile_frp']:,.1f} | {ws['seconds_taken']} |", flush=True)

    # Print Candidate Table
    print("\n=== Candidate Tiles & Evaluation Table ===", flush=True)
    print("| Candidate ID | Month | Centroid | Hotspots | Event FRP (MW) | Event Dates | Validity | Granules / Reason |", flush=True)
    print("| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |", flush=True)
    for c in all_candidates:
        g_info = f"{c['before_granule']['date']} / {c['after_granule']['date']}" if c["valid"] else c["invalidation_reason"]
        v_str = "**VALID**" if c["valid"] else "Invalid"
        print(f"| {c['candidate_id']} | {c['month']} | {c['centroid']} | {c['event_hotspots_count']} | {c['event_total_frp']:,.1f} | {c['event_first_date']} to {c['event_last_date']} | {v_str} | {g_info} |", flush=True)

    # Save to scratch/wildfire-candidates.json (excluding large raw coordinates)
    clean_candidates_json = []
    for c in all_candidates:
        c_clean = {k: v for k, v in c.items() if not k.startswith("hotspot_")}
        clean_candidates_json.append(c_clean)

    with open(CANDIDATES_JSON, "w", encoding="utf-8") as f:
        json.dump({
            "windows": window_summaries,
            "candidates": clean_candidates_json,
            "counters": counters,
        }, f, indent=2)

    # 3g: Selection
    selected = None
    if valid_candidates:
        valid_candidates.sort(key=lambda c: c["event_total_frp"], reverse=True)
        selected = valid_candidates[0]
        print("\n=======================================================", flush=True)
        print(f"SELECTION OUTCOME: SELECTED EVENT -> {selected['candidate_id']}", flush=True)
        print(f"Month: {selected['month']}, Event FRP: {selected['event_total_frp']} MW, Hotspots: {selected['event_hotspots_count']}", flush=True)
        print(f"AOI: {selected['aoi_bbox']}, Centroid: {selected['centroid']}", flush=True)
        print(f"BEFORE: {selected['before_granule']['title']} ({selected['before_granule']['date']})", flush=True)
        print(f"AFTER:  {selected['after_granule']['title']} ({selected['after_granule']['date']})", flush=True)
        print("=======================================================", flush=True)
    else:
        print("\n=======================================================", flush=True)
        print("NO EVENT SELECTED: rule not satisfied", flush=True)
        all_candidates.sort(key=lambda c: c["event_total_frp"], reverse=True)
        print("Top 10 candidates by Event FRP with invalidation reasons:", flush=True)
        for idx, c in enumerate(all_candidates[:10]):
            print(f"  {idx+1}. {c['candidate_id']} ({c['month']}, {c['centroid']}, {c['event_total_frp']} MW): {c['invalidation_reason']}", flush=True)
        print("=======================================================", flush=True)

    return {
        "windows": window_summaries,
        "candidates": all_candidates,
        "valid_candidates": valid_candidates,
        "selected": selected,
        "counters": counters,
    }


if __name__ == "__main__":
    run_pipeline()

