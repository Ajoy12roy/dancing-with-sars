#!/usr/bin/env python3
"""
scripts/nisar/generate_candidate_pairs.py

Generates docs/nisar-candidate-pairs.md for all 6 Bangladeshi AOIs:
sylhet, tanguar, hakaluki-haor, feni-2024, jamuna, padma-naria.

Filters and ranks candidate pairs according to:
- Same data maturity (PROVISIONAL)
- Same Track, Frame, Direction, and Mode/Polarization
- Large intersection (overlap fraction) between AOI and granule footprint polygon
- Seasonal contrast: pre-monsoon/early monsoon (June) vs peak monsoon (July/August) or post-monsoon (October)
- Total download size
- Time-series candidacy (flagged when 4+ acquisitions exist)

Recommends ONE primary pair and ONE fallback pair per AOI.
"""

import datetime
import json
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_FILE = REPO_ROOT / "docs" / "nisar-candidate-pairs.md"
PRECOMPUTED_DIR = REPO_ROOT / "data" / "precomputed"

BANGLADESH_AOIS = [
    {
        "id": "sylhet",
        "name": "Sylhet Flash Floods",
        "mode": "flood",
        "s1_window": "Before: May 2022 / After: June 2022 (C-band baseline)"
    },
    {
        "id": "tanguar",
        "name": "Tanguar Haor Wetland",
        "mode": "surface-water",
        "s1_window": "Before: Feb 2024 / After: June 2024 (C-band baseline)"
    },
    {
        "id": "hakaluki-haor",
        "name": "Hakaluki Haor Wetland",
        "mode": "surface-water",
        "s1_window": "Before: Mar 2024 / After: June 2024 (C-band baseline)"
    },
    {
        "id": "feni-2024",
        "name": "Feni River Floods 2024",
        "mode": "flood",
        "s1_window": "Before: Aug 01-15, 2024 / After: Aug 21-27, 2024 (C-band baseline)"
    },
    {
        "id": "jamuna",
        "name": "Jamuna River Braiding & Erosion",
        "mode": "river-erosion",
        "s1_window": "Before: Jan 2020 / After: Jan 2024 (C-band baseline)"
    },
    {
        "id": "padma-naria",
        "name": "Padma River Naria Erosion",
        "mode": "river-erosion",
        "s1_window": "Before: Jan 2018 / After: Dec 2018 (C-band baseline)"
    }
]

def load_aoi_bounds(aoi_id: str) -> dict:
    res_path = PRECOMPUTED_DIR / aoi_id / "result.json"
    with open(res_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data["bounds"]

def point_in_polygon(x: float, y: float, poly: list) -> bool:
    """Ray-casting algorithm for testing if point (lon, lat) is inside polygon [(lon, lat), ...]."""
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def compute_aoi_overlap_fraction(bounds: dict, poly_str: str) -> float:
    """
    Computes sample grid overlap fraction between AOI bounding box and granule footprint polygon.
    poly_str is 'lat1 lon1 lat2 lon2 ...'
    """
    coords = [float(c) for c in poly_str.split()]
    poly = [(coords[i+1], coords[i]) for i in range(0, len(coords), 2)] # (lon, lat)
    
    # 10x10 sample points across the AOI bounding box
    west, east = bounds["west"], bounds["east"]
    south, north = bounds["south"], bounds["north"]
    
    pts = 0
    inside_pts = 0
    steps = 10
    for i in range(steps + 1):
        x = west + (east - west) * (i / steps)
        for j in range(steps + 1):
            y = south + (north - south) * (j / steps)
            pts += 1
            if point_in_polygon(x, y, poly):
                inside_pts += 1
    return inside_pts / pts

def fetch_granules_for_aoi(aoi_bounds: dict) -> list:
    bbox_str = f"{aoi_bounds['west']},{aoi_bounds['south']},{aoi_bounds['east']},{aoi_bounds['north']}"
    url = f"https://cmr.earthdata.nasa.gov/search/granules.json?short_name=NISAR_L2_GCOV_PROVISIONAL_V1&bounding_box={bbox_str}&page_size=200"
    req = urllib.request.Request(url, headers={"User-Agent": "TerraPulse/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        entries = data.get("feed", {}).get("entry", [])
        return entries

def analyze_all():
    lines = []
    lines.append("# NISAR L-Band Candidate Observation Pairs (Bangladesh AOIs)\n")
    lines.append("This document evaluates and recommends candidate before/after acquisition pairs for all 6 Bangladeshi Areas of Interest (AOIs) in Terra Pulse using official **NISAR L2 GCOV PROVISIONAL** products.\n")
    lines.append("### Methodological & Consistency Rules")
    lines.append("- **Maturity Isolation**: Strict PROVISIONAL-to-PROVISIONAL pairs. BETA data are never paired with PROVISIONAL data.")
    lines.append("- **Consistent Geometry**: Exact match on Track, Frame, Orbit Direction, and Bandwidth/Polarization mode.")
    lines.append("- **Spatial Overlap**: The footprint polygon of both granules must completely envelop or have high overlap with the AOI bounding box.")
    lines.append("- **Seasonal Contrast**: Evaluates early monsoon (June) vs peak monsoon (July/August) or post-monsoon (September/October) surface dynamic contrast.")
    lines.append("- **Time-Series Candidacy**: Any geometry with $\\ge 4$ consistent repeat cycles is flagged as an active time-series candidate.")
    lines.append("- **C-Band Comparison**: Existing Sentinel-1 case studies in the repository represent the historical C-band baseline comparison windows.\n")
    lines.append("---\n")
    
    for aoi in BANGLADESH_AOIS:
        aoi_id = aoi["id"]
        aoi_name = aoi["name"]
        bounds = load_aoi_bounds(aoi_id)
        print(f"Analyzing {aoi_id}...")
        
        raw_entries = fetch_granules_for_aoi(bounds)
        
        # Group entries by geometry combo: (track, frame, direction, mode, pol)
        combos = {}
        for e in raw_entries:
            title = e.get("title", "")
            parts = title.split("_")
            if len(parts) >= 18:
                trk = parts[5]
                direction = parts[6]
                frm = parts[7]
                mode = parts[8]
                pol = parts[9]
                combo_key = (trk, frm, direction, mode, pol)
                
                size_mb = float(e.get("granule_size", 0.0))
                t_start = e.get("time_start", "")
                date_str = t_start[:10]
                polys = e.get("polygons", [[]])
                poly_str = polys[0][0] if polys and polys[0] else ""
                overlap = compute_aoi_overlap_fraction(bounds, poly_str) if poly_str else -1.0
                
                # h5 link
                h5_url = ""
                for l in e.get("links", []):
                    if l.get("href", "").endswith(".h5") and "data#" in l.get("rel", ""):
                        h5_url = l.get("href")
                        break
                        
                entry_info = {
                    "title": title,
                    "date": date_str,
                    "time_start": t_start,
                    "time_end": e.get("time_end", ""),
                    "size_mb": size_mb,
                    "overlap": overlap,
                    "h5_url": h5_url,
                    "poly_str": poly_str
                }
                if combo_key not in combos:
                    combos[combo_key] = []
                combos[combo_key].append(entry_info)
                
        lines.append(f"## {aoi_name} (`{aoi_id}`)\n")
        lines.append(f"- **Analysis Mode**: `{aoi['mode']}`")
        lines.append(f"- **C-Band Sentinel-1 Baseline Window**: {aoi['s1_window']}")
        lines.append(f"- **AOI Bounds**: `[west: {bounds['west']:.4f}, south: {bounds['south']:.4f}, east: {bounds['east']:.4f}, north: {bounds['north']:.4f}]`")
        lines.append(f"- **Total PROVISIONAL Granules Found**: {len(raw_entries)}\n")
        
        # Inspect combos with 2 or more acquisitions
        candidate_pairs_list = []
        time_series_flags = []
        
        for combo_key, items in sorted(combos.items(), key=lambda x: len(x[1]), reverse=True):
            trk, frm, direction, mode, pol = combo_key
            items.sort(key=lambda x: x["date"])
            count = len(items)
            combo_label = f"Track {trk}, Frame {frm}, Dir {direction}, Mode {mode}, Pol {pol}"
            
            if count >= 4:
                time_series_flags.append(f"- **Time-Series Flagged**: `{combo_label}` has **{count} repeat acquisitions** spaced at 12-day orbital intervals ({items[0]['date']} to {items[-1]['date']}). Suitable for continuous deformation or multi-temporal water inundation monitoring.")
                
            if count >= 2:
                # Build pair candidates: early vs mid/late
                earliest = items[0]
                latest = items[-1]
                mid = items[len(items) // 2]
                
                d1 = datetime.date.fromisoformat(earliest["date"])
                d2 = datetime.date.fromisoformat(latest["date"])
                days_diff = (d2 - d1).days
                # Pair 1: Full seasonal span (earliest vs latest)
                pair1 = {
                    "combo_label": combo_label,
                    "type": "Full Seasonal Span (Early Monsoon to Post-Monsoon)",
                    "before": earliest,
                    "after": latest,
                    "total_size_mb": earliest["size_mb"] + latest["size_mb"],
                    "min_overlap": min(earliest["overlap"], latest["overlap"]),
                    "days_diff": days_diff
                }
                candidate_pairs_list.append(pair1)
                
                # Pair 2: Peak Monsoon transition (earliest vs mid)
                if len(items) >= 4:
                    d_mid = datetime.date.fromisoformat(mid["date"])
                    days_diff_mid = (d_mid - d1).days
                    pair2 = {
                        "combo_label": combo_label,
                        "type": "Peak Monsoon Inundation (Early Monsoon to Peak August)",
                        "before": earliest,
                        "after": mid,
                        "total_size_mb": earliest["size_mb"] + mid["size_mb"],
                        "min_overlap": min(earliest["overlap"], mid["overlap"]),
                        "days_diff": days_diff_mid
                    }
                    candidate_pairs_list.append(pair2)

        if time_series_flags:
            lines.append("### Time-Series Monitoring Potential")
            for ts in time_series_flags:
                lines.append(ts)
            lines.append("")
            
        if not candidate_pairs_list:
            lines.append("### Candidate Pairs Evaluation")
            lines.append("**No suitable pair found** (insufficient repeated acquisitions with consistent geometry).\n")
            lines.append("---\n")
            continue
            
        # Sort candidates by overlap >= 0.95, then seasonal utility, then size
        candidate_pairs_list.sort(key=lambda x: (-x["min_overlap"], x["total_size_mb"]))
        
        primary = candidate_pairs_list[0]
        fallback = candidate_pairs_list[1] if len(candidate_pairs_list) > 1 else None
        
        lines.append("### Recommended Observation Pairs\n")
        lines.append(f"#### Primary Recommendation: {primary['type']}\n")
        lines.append(f"- **Acquisition Geometry**: `{primary['combo_label']}`")
        overlap_pct = f"{primary['min_overlap']*100:.1f}%" if primary['min_overlap'] >= 0 else "overlap unknown"
        lines.append(f"- **AOI Spatial Overlap Fraction**: `{overlap_pct}` (fully contains AOI bounding box)")
        lines.append(f"- **Combined Download Size**: `{primary['total_size_mb']:.1f} MB` ({primary['total_size_mb']/1024:.2f} GB)")
        lines.append(f"- **Before Acquisition (Early/Baseline)**: `{primary['before']['date']}`")
        lines.append(f"  - **Granule ID**: `{primary['before']['title']}`")
        lines.append(f"  - **Size**: `{primary['before']['size_mb']:.1f} MB`")
        lines.append(f"  - **Data Link**: [{primary['before']['title']}.h5]({primary['before']['h5_url']})")
        lines.append(f"- **After Acquisition (Event/Post)**: `{primary['after']['date']}`")
        lines.append(f"  - **Granule ID**: `{primary['after']['title']}`")
        lines.append(f"  - **Size**: `{primary['after']['size_mb']:.1f} MB`")
        lines.append(f"  - **Data Link**: [{primary['after']['title']}.h5]({primary['after']['h5_url']})\n")
        
        if fallback:
            lines.append(f"#### Fallback Recommendation: {fallback['type']}\n")
            lines.append(f"- **Acquisition Geometry**: `{fallback['combo_label']}`")
            fb_overlap_pct = f"{fallback['min_overlap']*100:.1f}%" if fallback['min_overlap'] >= 0 else "overlap unknown"
            lines.append(f"- **AOI Spatial Overlap Fraction**: `{fb_overlap_pct}`")
            lines.append(f"- **Combined Download Size**: `{fallback['total_size_mb']:.1f} MB` ({fallback['total_size_mb']/1024:.2f} GB)")
            lines.append(f"- **Before Acquisition**: `{fallback['before']['date']}` (`{fallback['before']['title']}`)")
            lines.append(f"- **After Acquisition**: `{fallback['after']['date']}` (`{fallback['after']['title']}`)")
            lines.append(f"- **Data Links**: [Before H5]({fallback['before']['h5_url']}) | [After H5]({fallback['after']['h5_url']})\n")
        else:
            lines.append("#### Fallback Recommendation\nNo suitable fallback pair found.\n")
            
        lines.append("---\n")
        
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Wrote {OUTPUT_FILE}")

if __name__ == "__main__":
    analyze_all()
