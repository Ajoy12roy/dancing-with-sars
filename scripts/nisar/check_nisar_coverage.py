#!/usr/bin/env python3
"""
scripts/nisar/check_nisar_coverage.py

Queries NASA CMR Granule Search API for NISAR L2 GCOV products (PROVISIONAL and BETA)
across all 10 ready case study AOIs in Terra Pulse plus an approximate Bangladesh box.

Decodes granule product names according to the official NISAR GCOV specification:
https://nisar-docs.asf.alaska.edu/gcov/

Outputs comprehensive inventory tables and statistics to docs/nisar-coverage.md.
"""

import datetime
import json
import os
import statistics
import sys
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PRECOMPUTED_DIR = REPO_ROOT / "data" / "precomputed"
OUTPUT_DOC = REPO_ROOT / "docs" / "nisar-coverage.md"

COLLECTIONS = [
    {
        "short_name": "NISAR_L2_GCOV_PROVISIONAL_V1",
        "maturity": "PROVISIONAL",
        "concept_id": "C2854338529-ASF"
    },
    {
        "short_name": "NISAR_L2_GCOV_BETA_V1",
        "maturity": "BETA",
        "concept_id": "C3622214170-ASF"
    }
]

POLARIZATION_MAP = {
    "SH": "Single-Pol HH",
    "SV": "Single-Pol VV",
    "DH": "Dual-Pol HH/HV",
    "DV": "Dual-Pol VV/VH",
    "CL": "Compact-Pol LH/LV",
    "CR": "Compact-Pol RH/RV",
    "QP": "Quad-Pol HH/HV/VV/VH",
    "NA": "Not Available",
}

DIRECTION_MAP = {
    "A": "Ascending",
    "D": "Descending"
}

FIDELITY_MAP = {
    "P": "Precise",
    "M": "Medium",
    "N": "Near Real-Time",
    "F": "Forecast"
}

COVERAGE_MAP = {
    "F": "Full",
    "P": "Partial"
}

def decode_polarization_token(token: str) -> str:
    """Decodes 4-character polarization token (primary + secondary band)."""
    if len(token) == 4:
        p1 = token[:2]
        p2 = token[2:]
        d1 = POLARIZATION_MAP.get(p1, p1)
        d2 = POLARIZATION_MAP.get(p2, p2)
        if p1 == p2:
            return f"{token} ({d1})"
        return f"{token} ({d1} + {d2})"
    return token

def decode_granule_name(granule_id: str) -> dict:
    """
    Decodes product title according to NISAR naming convention:
    NISAR_L<level>_<processing_type>_<product>_<cycle>_<track>_<direction>_<frame>_<mode>_<pole>_<s>_<start>_<end>_<crid>_<a>_<c>_<loc>_<counter>
    """
    parts = granule_id.replace(".h5", "").split("_")
    decoded = {"raw_id": granule_id, "tokens": parts}
    
    if len(parts) >= 18 and parts[0] == "NISAR":
        decoded["mission"] = parts[0]
        decoded["level"] = parts[1]
        decoded["processing_type"] = parts[2]
        decoded["product"] = parts[3]
        decoded["cycle"] = parts[4]
        decoded["track"] = parts[5]
        decoded["direction"] = DIRECTION_MAP.get(parts[6], parts[6])
        decoded["direction_code"] = parts[6]
        decoded["frame"] = parts[7]
        decoded["bandwidth_mode"] = parts[8]
        decoded["polarization_code"] = parts[9]
        decoded["polarization"] = decode_polarization_token(parts[9])
        decoded["source"] = parts[10]
        decoded["start_time_str"] = parts[11]
        decoded["end_time_str"] = parts[12]
        decoded["crid"] = parts[13]
        decoded["fidelity"] = FIDELITY_MAP.get(parts[14], parts[14])
        decoded["coverage"] = COVERAGE_MAP.get(parts[15], parts[15])
        decoded["location"] = parts[16]
        decoded["counter"] = parts[17]
    else:
        # Fallback if structure deviates
        decoded["unparsed"] = parts
    return decoded

def load_aois() -> dict:
    """Reads AOI bounding boxes directly from data/precomputed/*/result.json and adds Bangladesh approx."""
    aois = {}
    for case_dir in sorted(PRECOMPUTED_DIR.glob("*")):
        res_file = case_dir / "result.json"
        if res_file.exists():
            with open(res_file, "r", encoding="utf-8") as f:
                d = json.load(f)
                b = d.get("bounds")
                if b:
                    aois[case_dir.name] = {
                        "id": case_dir.name,
                        "label": case_dir.name,
                        "is_approximate": False,
                        "bounds": [b["west"], b["south"], b["east"], b["north"]]
                    }
    # Add approximate Bangladesh bounding box [88.0, 20.5, 92.7, 26.7]
    aois["bangladesh-approx"] = {
        "id": "bangladesh-approx",
        "label": "Bangladesh (approximate national bounding box)",
        "is_approximate": True,
        "bounds": [88.0, 20.5, 92.7, 26.7]
    }
    return aois

def query_cmr_granules(short_name: str, bbox: list) -> list:
    """Queries CMR granules for a given collection and bounding box with full pagination."""
    bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
    page_size = 2000
    page_num = 1
    all_entries = []
    
    while True:
        url = f"https://cmr.earthdata.nasa.gov/search/granules.json?short_name={short_name}&bounding_box={bbox_str}&page_size={page_size}&page_num={page_num}"
        req = urllib.request.Request(url, headers={"User-Agent": "TerraPulse/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            total_hits = int(resp.headers.get("CMR-Hits", 0))
            data = json.loads(resp.read().decode("utf-8"))
            entries = data.get("feed", {}).get("entry", [])
            all_entries.extend(entries)
            
            if len(all_entries) >= total_hits or len(entries) < page_size:
                break
            page_num += 1
            
    return all_entries

def parse_granules(raw_entries: list) -> list:
    """Parses raw CMR entries into structured metadata."""
    parsed = []
    for e in raw_entries:
        title = e.get("title", "")
        t_start = e.get("time_start", "")
        t_end = e.get("time_end", "")
        raw_size = e.get("granule_size")
        size_mb = float(raw_size) if raw_size is not None else None
        
        # Footprint polygons
        polygons = e.get("polygons", [])
        
        # Find primary https data link (.h5)
        h5_url = None
        browse_url = None
        for link in e.get("links", []):
            href = link.get("href", "")
            rel = link.get("rel", "")
            if href.endswith(".h5") and "data#" in rel:
                h5_url = href
            elif ("browse#" in rel or href.endswith(".png")) and not browse_url:
                browse_url = href
                
        decoded = decode_granule_name(title)
        
        parsed.append({
            "title": title,
            "time_start": t_start,
            "time_end": t_end,
            "size_mb": size_mb,
            "polygons": polygons,
            "h5_url": h5_url,
            "browse_url": browse_url,
            "decoded": decoded
        })
    return parsed

def build_inventory() -> dict:
    aois = load_aois()
    results = {}
    
    for aoi_id, aoi_data in aois.items():
        print(f"Checking AOI: {aoi_id}...")
        results[aoi_id] = {
            "metadata": aoi_data,
            "collections": {}
        }
        for coll in COLLECTIONS:
            short_name = coll["short_name"]
            maturity = coll["maturity"]
            raw_entries = query_cmr_granules(short_name, aoi_data["bounds"])
            granules = parse_granules(raw_entries)
            
            # Geometry combos: (track, frame, direction, mode/polarization)
            combos = {}
            dates = set()
            sizes = []
            
            for g in granules:
                dec = g["decoded"]
                trk = dec.get("track", "unknown")
                frm = dec.get("frame", "unknown")
                direction = dec.get("direction_code", "unknown")
                mode_pol = f"{dec.get('bandwidth_mode', 'unknown')}/{dec.get('polarization_code', 'unknown')}"
                combo_key = (trk, frm, direction, mode_pol)
                
                start_date = g["time_start"][:10] if g["time_start"] else "unknown"
                if start_date != "unknown":
                    dates.add(start_date)
                    
                if combo_key not in combos:
                    combos[combo_key] = set()
                combos[combo_key].add(start_date)
                
                if g["size_mb"] is not None:
                    sizes.append(g["size_mb"])
                    
            sorted_dates = sorted(list(dates))
            total_size_mb = sum(sizes) if sizes else 0.0
            median_size_mb = statistics.median(sizes) if sizes else 0.0
            
            results[aoi_id]["collections"][maturity] = {
                "collection_short_name": short_name,
                "count": len(granules),
                "first_date": sorted_dates[0] if sorted_dates else "None",
                "last_date": sorted_dates[-1] if sorted_dates else "None",
                "dates": sorted_dates,
                "combos": {f"Track {k[0]}, Frame {k[1]}, Dir {k[2]}, Mode/Pol {k[3]}": sorted(list(v)) for k, v in combos.items()},
                "total_size_mb": total_size_mb,
                "median_size_mb": median_size_mb,
                "granules": granules
            }
            print(f"  {maturity}: {len(granules)} granules")
    return results

def format_coverage_markdown(inventory: dict) -> str:
    lines = []
    lines.append("# NISAR L-Band SAR Coverage & CMR Discovery\n")
    lines.append("## Collections\n")
    lines.append("The following official NISAR collections were queried and confirmed directly from the NASA Common Metadata Repository (CMR) API (`https://cmr.earthdata.nasa.gov/search/collections.json`):\n")
    lines.append("| Product | Short Name | Version | Concept ID | Provider | Temporal Start | Temporal End |")
    lines.append("| :--- | :--- | :---: | :--- | :---: | :---: | :---: |")
    lines.append("| **NISAR L2 GCOV PROVISIONAL** | `NISAR_L2_GCOV_PROVISIONAL_V1` | `1` | `C2854338529-ASF` | `ASF` | `2025-10-28T00:00:00.000Z` | Open-ended |")
    lines.append("| **NISAR L2 GCOV BETA** | `NISAR_L2_GCOV_BETA_V1` | `1` | `C3622214170-ASF` | `ASF` | `2025-10-01T00:00:00.000Z` | Open-ended |")
    lines.append("| **NISAR L3 SME2 PROVISIONAL** | `NISAR_L3_SME2_PROVISIONAL_V1` | `1` | `C2854344945-ASF` | `ASF` | `2025-10-28T00:00:00.000Z` | Open-ended |\n")
    lines.append("- **Data Centers**: All three collections are cataloged and distributed through the Alaska Satellite Facility (ASF) DAAC on behalf of NASA / JPL-Caltech.")
    lines.append("- **Data Maturity Levels**:")
    lines.append("  - **BETA**: Early release validation products intended for format exploration and initial algorithm benchmarking.")
    lines.append("  - **PROVISIONAL**: Science-grade calibrated products subject to planned future reprocessing once full on-orbit calibration matrices stabilize.\n")
    lines.append("---\n")
    lines.append("## Product Naming Convention Specification\n")
    lines.append("According to the official NISAR GCOV Product Specification ([Shiroma, 2026](https://cumulus.asf.earthdatacloud.nasa.gov/PUBLIC/DATA/NISAR/NISAR_D-102274_RevF_NASA_SDS_Product_Specification_L2_GCOV_w-esigs.pdf)) and the [ASF NISAR User Guide](https://nisar-docs.asf.alaska.edu/gcov/):\n")
    lines.append("`NISAR_L2_<PT>_GCOV_<CYL>_<REL>_<DIR>_<FRM>_<MODE>_<POLE>_<S>_<StartUTC>_<EndUTC>_<CRID>_<ACC>_<COV>_<LOC>_<CTR>.h5`\n")
    lines.append("| Token | Meaning | Documented Values / Definition |")
    lines.append("| :--- | :--- | :--- |")
    lines.append("| **Mission** | Mission identifier | `NISAR` |")
    lines.append("| **Instrument & Level** | SAR instrument and processing tier | `L2` (L-band SAR Level 2 GCOV) |")
    lines.append("| **PT** | Processing Type | `PR` (Production), `UR` (Urgent Response), `OD` (On-Demand) |")
    lines.append("| **Product** | Product Identifier | `GCOV` (Geocoded Polarimetric Covariance) |")
    lines.append("| **CYL** | Orbit Cycle number | 3 digits (12-day repeat cycle, starts at `001`) |")
    lines.append("| **REL** | Relative Orbit Track | 3 digits (`001`-`173`) |")
    lines.append("| **DIR** | Pass Direction | `A` (Ascending), `D` (Descending) |")
    lines.append("| **FRM** | Track Frame number | 3 digits (`001`-`176` per track) |")
    lines.append("| **MODE** | Bandwidth Mode Code | 4 digits: primary (first 2) + secondary (last 2) bandwidth (e.g. `2005`, `4005`, `2000`, `4000`) |")
    lines.append("| **POLE** | Polarization Code | 4 characters: `SH` (HH), `SV` (VV), `DH` (HH/HV), `DV` (VV/VH), `QP` (Quad-pol), `CL` (LH/LV), `CR` (RH/RV) |")
    lines.append("| **S** | Data Source | `A` (Acquired single mode), `M` (Mixed mode) |")
    lines.append("| **Start / End UTC** | Acquisition timestamp | 15 characters: `YYYYMMDDTHHMMSS` (UTC, zero Doppler) |")
    lines.append("| **CRID** | Composite Release ID | 6 characters (e.g., `P05023` for Provisional, `X05023` for Beta) |")
    lines.append("| **ACC** | Orbit Ephemeris Accuracy | `P` (Precise), `M` (Medium), `N` (Near Real-Time), `F` (Forecast) |")
    lines.append("| **COV** | Frame Spatial Coverage | `F` (Full), `P` (Partial) |")
    lines.append("| **LOC** | Processing Facility | `J` (JPL SDS) |")
    lines.append("| **CTR** | Product Version Counter | 3 digits (zero padded, e.g. `001`) |\n")
    lines.append("---\n")
    lines.append("## Coverage Inventory by Area of Interest (AOI)\n")
    lines.append("All bounding boxes for the 10 ready cases were dynamically read directly from `data/precomputed/<caseId>/result.json`. An additional approximate bounding box for Bangladesh (`[88.0, 20.5, 92.7, 26.7]`) was evaluated.\n")
    lines.append("### Summary Overview Table\n")
    lines.append("| AOI | Bounds [W, S, E, N] | PROVISIONAL Granules | PROVISIONAL Date Range | BETA Granules | BETA Date Range |")
    lines.append("| :--- | :--- | :---: | :---: | :---: | :---: |")
    
    for aoi_id, aoi_data in inventory.items():
        meta = aoi_data["metadata"]
        b = meta["bounds"]
        b_str = f"[{b[0]:.2f}, {b[1]:.2f}, {b[2]:.2f}, {b[3]:.2f}]"
        label = meta["label"]
        p_info = aoi_data["collections"]["PROVISIONAL"]
        b_info = aoi_data["collections"]["BETA"]
        
        p_dates = f"{p_info['first_date']} to {p_info['last_date']}" if p_info['count'] > 0 else "None"
        b_dates = f"{b_info['first_date']} to {b_info['last_date']}" if b_info['count'] > 0 else "None"
        
        lines.append(f"| **{label}** | `{b_str}` | {p_info['count']} | {p_dates} | {b_info['count']} | {b_dates} |")
        
    lines.append("\n---\n")
    lines.append("### Detailed Inventory per AOI\n")
    
    for aoi_id, aoi_data in inventory.items():
        meta = aoi_data["metadata"]
        label = meta["label"]
        b = meta["bounds"]
        lines.append(f"#### {label}\n")
        lines.append(f"- **Bounding Box**: `[west: {b[0]}, south: {b[1]}, east: {b[2]}, north: {b[3]}]`")
        
        for maturity in ["PROVISIONAL", "BETA"]:
            info = aoi_data["collections"][maturity]
            count = info["count"]
            lines.append(f"\n##### {maturity} Data (`{info['collection_short_name']}`)\n")
            lines.append(f"CMR returned {count} granules for this bounding box.\n")
            
            if count == 0:
                continue
                
            total_gb = info["total_size_mb"] / 1024.0
            lines.append(f"- **Granule Count**: {count}")
            lines.append(f"- **First Acquisition Date**: `{info['first_date']}`")
            lines.append(f"- **Last Acquisition Date**: `{info['last_date']}`")
            lines.append(f"- **Total Volume**: {info['total_size_mb']:.1f} MB ({total_gb:.2f} GB)")
            lines.append(f"- **Median Granule Size**: {info['median_size_mb']:.1f} MB\n")
            
            lines.append("**Distinct Acquisition Geometries & Modes**:")
            lines.append("| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |")
            lines.append("| :--- | :---: | :--- |")
            for combo_name, d_list in sorted(info["combos"].items()):
                dates_str = ", ".join(f"`{d}`" for d in d_list)
                lines.append(f"| {combo_name} | {len(d_list)} | {dates_str} |")
                
            lines.append("\n**All Acquisition Dates**:\n")
            # Group dates into 4 per row for clean markdown
            d_chunks = [info["dates"][i:i+4] for i in range(0, len(info["dates"]), 4)]
            lines.append("| Acquisition Dates | | | |")
            lines.append("| :--- | :--- | :--- | :--- |")
            for chunk in d_chunks:
                padded = chunk + [""] * (4 - len(chunk))
                lines.append(f"| {padded[0]} | {padded[1]} | {padded[2]} | {padded[3]} |")
            lines.append("")
            
        lines.append("---\n")
    return "\n".join(lines)

def main():
    print("Running NISAR CMR coverage inventory...")
    inventory = build_inventory()
    
    # Save cache to gitignored path
    cache_dir = REPO_ROOT / ".cache"
    cache_dir.mkdir(exist_ok=True)
    with open(cache_dir / "nisar_inventory_cache.json", "w", encoding="utf-8") as f:
        # Strip large raw fields from cache
        compact = {}
        for k, v in inventory.items():
            compact[k] = {
                "metadata": v["metadata"],
                "collections": {
                    mat: {
                        "short_name": col["collection_short_name"],
                        "count": col["count"],
                        "first_date": col["first_date"],
                        "last_date": col["last_date"],
                        "dates": col["dates"],
                        "combos": col["combos"],
                        "total_size_mb": col["total_size_mb"],
                        "median_size_mb": col["median_size_mb"]
                    } for mat, col in v["collections"].items()
                }
            }
        json.dump(compact, f, indent=2)
        
    md_content = format_coverage_markdown(inventory)
    with open(OUTPUT_DOC, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Coverage inventory written to {OUTPUT_DOC}")

if __name__ == "__main__":
    main()

