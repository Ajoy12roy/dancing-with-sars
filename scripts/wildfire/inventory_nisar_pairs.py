"""
scripts/wildfire/inventory_nisar_pairs.py

Queries NASA CMR Granule Search API for NISAR L2 GCOV Provisional granules in 2026.
Builds an inventory of consecutive 12-day orbit-repeat pairs (Cycle N and Cycle N+1)
sharing identical track, frame, direction, bandwidth mode, and polarization.

Conforms to NISAR L2 GCOV specifications:
https://nisar-docs.asf.alaska.edu/gcov/
"""

import json
import os
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRATCH_DIR = REPO_ROOT / "scratch"
SCRATCH_JSON = SCRATCH_DIR / "nisar-footprints.json"

COLLECTION_SHORT_NAME = "NISAR_L2_GCOV_PROVISIONAL_V1"
TEMPORAL_2026 = "2026-01-01T00:00:00Z,2026-12-31T23:59:59Z"


def classify_region(lon: float, lat: float) -> str:
    """Rough geographic grouping based on bounding box centroid."""
    if lat < -60:
        return "Antarctica / Southern Ocean"
    if -170 <= lon <= -30:
        return "Americas"
    if -30 <= lon <= 55 and -35 <= lat <= 37:
        return "Africa"
    if 100 <= lon <= 180 and lat < 0:
        return "Australasia"
    if (-30 <= lon <= 180 and lat > 0) or (55 <= lon <= 100 and lat >= -35):
        return "Eurasia"
    return "Other"


def extract_download_urls(links: List[Dict[str, Any]]) -> Tuple[Optional[str], Optional[str]]:
    """Extracts HTTPS and S3 direct download URLs for HDF5 product."""
    https_url = None
    s3_url = None
    for link in links:
        href = link.get("href", "")
        rel = link.get("rel", "")
        if href.endswith(".h5"):
            if rel == "http://esipfed.org/ns/fedsearch/1.1/data#" or href.startswith("https://"):
                if not https_url:
                    https_url = href
            elif rel == "http://esipfed.org/ns/fedsearch/1.1/s3#" or href.startswith("s3://"):
                if not s3_url:
                    s3_url = href
    return https_url, s3_url


def parse_granule_entry(entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Parses a CMR granule JSON entry into a structured NISAR metadata dict."""
    title = entry.get("title", "")
    parts = title.replace(".h5", "").split("_")
    if len(parts) < 18 or parts[0] != "NISAR":
        return None

    try:
        cycle = int(parts[4])
    except ValueError:
        return None

    track = parts[5]
    direction = parts[6]
    frame = parts[7]
    bandwidth_mode = parts[8]
    polarization = parts[9]
    crid = parts[13]

    start_time = entry.get("time_start")
    end_time = entry.get("time_end")
    granule_ur = entry.get("producer_granule_id") or entry.get("title")

    # Extract bounding box from polygons or boxes
    bbox = None
    polygons = entry.get("polygons")
    if polygons and len(polygons) > 0 and len(polygons[0]) > 0:
        coords = polygons[0][0].split()
        if len(coords) >= 8:
            lats = [float(coords[i]) for i in range(0, len(coords), 2)]
            lons = [float(coords[i]) for i in range(1, len(coords), 2)]
            bbox = [min(lons), min(lats), max(lons), max(lats)]

    if not bbox:
        boxes = entry.get("boxes")
        if boxes and len(boxes) > 0:
            coords = [float(c) for c in boxes[0].split()]
            if len(coords) == 4:
                # CMR box is south, west, north, east
                bbox = [coords[1], coords[0], coords[3], coords[2]]

    https_url, s3_url = extract_download_urls(entry.get("links", []))

    centroid = None
    region = "Unknown"
    if bbox:
        c_lon = (bbox[0] + bbox[2]) / 2.0
        c_lat = (bbox[1] + bbox[3]) / 2.0
        centroid = [round(c_lon, 4), round(c_lat, 4)]
        region = classify_region(c_lon, c_lat)

    return {
        "granule_ur": granule_ur,
        "title": title,
        "cycle": cycle,
        "track": track,
        "frame": frame,
        "direction": direction,
        "bandwidth_mode": bandwidth_mode,
        "polarization": polarization,
        "crid": crid,
        "start_time": start_time,
        "end_time": end_time,
        "bbox": bbox,
        "centroid": centroid,
        "region": region,
        "https_url": https_url,
        "s3_url": s3_url,
    }


def fetch_cmr_granules(
    max_granules: int = 2000,
    page_size: int = 100,
    max_requests: int = 60,
) -> Tuple[int, List[Dict[str, Any]]]:
    """Queries CMR Granule Search API with safety caps."""
    all_granules = []
    page_num = 1
    total_hits = 0

    while len(all_granules) < max_granules and page_num <= max_requests:
        url = (
            f"https://cmr.earthdata.nasa.gov/search/granules.json?"
            f"short_name={COLLECTION_SHORT_NAME}"
            f"&temporal={urllib.parse.quote(TEMPORAL_2026)}"
            f"&page_size={page_size}&page_num={page_num}"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Antigravity-Research/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            total_hits = int(resp.headers.get("CMR-Hits", 0))
            data = json.loads(resp.read().decode("utf-8"))
            entries = data.get("feed", {}).get("entry", [])
            if not entries:
                break
            for e in entries:
                parsed = parse_granule_entry(e)
                if parsed:
                    all_granules.append(parsed)
            if len(entries) < page_size:
                break
            page_num += 1

    return total_hits, all_granules


def build_inventory() -> Dict[str, Any]:
    """Fetches granules, groups them, identifies consecutive pairs, and saves inventory."""
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)

    print("Querying CMR Granule Search API...")
    total_hits, granules = fetch_cmr_granules(max_granules=2000, page_size=100, max_requests=60)
    print(f"Total CMR hits in 2026: {total_hits}")
    print(f"Sampled granules fetched: {len(granules)}")

    # Group granules by (track, frame, direction)
    groups: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = defaultdict(list)
    for g in granules:
        key = (g["track"], g["frame"], g["direction"])
        groups[key].append(g)

    # Identify consecutive pairs (cycle N and cycle N+1, same bandwidth mode and polarization)
    consecutive_pairs = []
    region_pair_distribution = defaultdict(int)
    region_granule_distribution = defaultdict(int)

    for g in granules:
        region_granule_distribution[g["region"]] += 1

    for key, item_list in groups.items():
        # Sort by cycle
        item_list.sort(key=lambda x: (x["cycle"], x["start_time"]))
        for i in range(len(item_list) - 1):
            g1 = item_list[i]
            g2 = item_list[i + 1]
            if (
                g2["cycle"] == g1["cycle"] + 1
                and g2["bandwidth_mode"] == g1["bandwidth_mode"]
                and g2["polarization"] == g1["polarization"]
            ):
                pair_record = {
                    "pair_id": f"T{g1['track']}_F{g1['frame']}_{g1['direction']}_C{g1['cycle']}_C{g2['cycle']}",
                    "track": g1["track"],
                    "frame": g1["frame"],
                    "direction": g1["direction"],
                    "cycle_pre": g1["cycle"],
                    "cycle_post": g2["cycle"],
                    "bandwidth_mode": g1["bandwidth_mode"],
                    "polarization": g1["polarization"],
                    "region": g1["region"],
                    "granule_pre": g1,
                    "granule_post": g2,
                }
                consecutive_pairs.append(pair_record)
                region_pair_distribution[g1["region"]] += 1

    summary = {
        "collection": COLLECTION_SHORT_NAME,
        "temporal_range": TEMPORAL_2026,
        "total_hits_2026": total_hits,
        "granules_analyzed": len(granules),
        "unique_groups": len(groups),
        "consecutive_pairs_count": len(consecutive_pairs),
        "granule_distribution_by_region": dict(region_granule_distribution),
        "consecutive_pair_distribution_by_region": dict(region_pair_distribution),
        "pairs": consecutive_pairs,
    }

    # Save to scratch/nisar-footprints.json (gitignored)
    with open(SCRATCH_JSON, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Inventory saved to {SCRATCH_JSON}")
    print(f"Unique (track, frame, direction) groups: {len(groups)}")
    print(f"Consecutive pairs identified: {len(consecutive_pairs)}")
    print("Consecutive pairs by region:", dict(region_pair_distribution))

    return summary


if __name__ == "__main__":
    build_inventory()

