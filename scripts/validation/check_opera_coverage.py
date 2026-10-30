#!/usr/bin/env python3
"""
scripts/validation/check_opera_coverage.py

Queries NASA CMR API to check if OPERA DSWx-S1 granules (OPERA_L3_DSWX-S1_V1)
exist for our 10 ready demo cases during their post-event analysis periods.

Usage:
    python scripts/validation/check_opera_coverage.py
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Tuple, Any

CMR_COLLECTIONS_URL = "https://cmr.earthdata.nasa.gov/search/collections.json"
CMR_GRANULES_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"
COLLECTION_SHORT_NAME = "OPERA_L3_DSWX-S1_V1"

# Case definitions with explicit afterRange from case study data
# Note: Rio Grande do Sul shows case data range (2024-05-08 to 2024-05-14)
# and also tested with padded window (2024-05-01 to 2024-05-20).
CASE_CONFIGS = [
    ("sylhet", "2022-06-20", "2022-06-21", None),
    ("jamuna", "2024-02-01", "2024-02-28", None),
    ("amazon", "2023-01-01", "2023-01-15", None),
    ("tanguar", "2023-08-01", "2023-08-31", None),
    ("cox-bazar-kutupalong-2017", "2018-01-01", "2018-03-15", None),
    ("feni-2024", "2024-08-21", "2024-08-27", None),
    ("hakaluki-haor", "2023-08-01", "2023-08-31", None),
    ("padma-naria", "2024-01-15", "2024-03-15", None),
    ("rio-grande-do-sul-2024", "2024-05-08", "2024-05-14", ("2024-05-01", "2024-05-20")),
    ("sindh-pakistan-2022", "2022-08-30", "2022-09-08", None),
]


def check_collection_exists(short_name: str) -> bool:
    """Verify that the target collection exists in CMR."""
    params = {"keyword": "DSWX-S1"}
    url = f"{CMR_COLLECTIONS_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "TerraPulse-NASA-SpaceApps/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            entries = data.get("feed", {}).get("entry", [])
            for e in entries:
                if e.get("short_name") == short_name:
                    return True
    except Exception as ex:
        print(f"[WARN] Failed to verify collection {short_name} on CMR: {ex}", file=sys.stderr)
    return False


def load_bounds(repo_root: str, case_id: str) -> Optional[Dict[str, float]]:
    """Load geographic bounds from data/precomputed/<case_id>/result.json."""
    res_path = os.path.join(repo_root, "data", "precomputed", case_id, "result.json")
    if not os.path.exists(res_path):
        return None
    try:
        with open(res_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("bounds")
    except Exception as ex:
        print(f"[WARN] Could not read bounds for {case_id}: {ex}", file=sys.stderr)
        return None


def query_granules(
    short_name: str,
    west: float,
    south: float,
    east: float,
    north: float,
    start_date: str,
    end_date: str,
    page_size: int = 10,
    retries: int = 2,
) -> Tuple[Optional[int], List[Dict[str, Any]], str]:
    """Query CMR for granule count and entries within bounding box and temporal range."""
    bbox_str = f"{west:.4f},{south:.4f},{east:.4f},{north:.4f}"
    temporal_str = f"{start_date}T00:00:00Z,{end_date}T23:59:59Z"
    params = {
        "short_name": short_name,
        "bounding_box": bbox_str,
        "temporal": temporal_str,
        "page_size": page_size,
    }
    url = f"{CMR_GRANULES_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "TerraPulse-NASA-SpaceApps/1.0"})

    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                hits_header = resp.headers.get("CMR-Hits")
                data = json.loads(resp.read().decode("utf-8"))
                entries = data.get("feed", {}).get("entry", [])
                if hits_header is not None:
                    count = int(hits_header)
                else:
                    count = len(entries)
                return count, entries, "OK"
        except urllib.error.HTTPError as he:
            if he.code == 429 and attempt < retries:
                time.sleep(2)
                continue
            return None, [], f"HTTP {he.code}"
        except Exception as ex:
            if attempt < retries:
                time.sleep(1)
                continue
            return None, [], f"Network error: {type(ex).__name__}"

    return None, [], "Max retries exceeded"


def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    print("Connecting to NASA CMR API...")
    col_exists = check_collection_exists(COLLECTION_SHORT_NAME)
    if col_exists:
        print(f"Confirmed collection: {COLLECTION_SHORT_NAME} (OPERA L3 Dynamic Surface Water Extent from Sentinel-1)")
    else:
        print(f"[WARN] Could not confirm collection {COLLECTION_SHORT_NAME}; continuing queries.")

    results: List[Dict[str, Any]] = []
    feni_granule_details: List[Dict[str, str]] = []

    for item in CASE_CONFIGS:
        case_id = item[0]
        start_date = item[1]
        end_date = item[2]
        padded_range = item[3]

        bounds = load_bounds(repo_root, case_id)
        if not bounds:
            results.append({
                "case": case_id,
                "after_range": f"{start_date} to {end_date}",
                "granules": "NOT CHECKED",
                "note": "Local precomputed result bounds missing",
            })
            continue

        count, entries, status_msg = query_granules(
            COLLECTION_SHORT_NAME,
            bounds["west"],
            bounds["south"],
            bounds["east"],
            bounds["north"],
            start_date,
            end_date,
        )

        granules_str = str(count) if count is not None else "NOT CHECKED"
        if count is not None:
            note = f"CMR returned {count} granules for this bounding box and date range"
        else:
            note = f"NOT CHECKED ({status_msg})"

        if case_id == "rio-grande-do-sul-2024" and padded_range:
            p_start, p_end = padded_range
            p_count, _, _ = query_granules(
                COLLECTION_SHORT_NAME,
                bounds["west"],
                bounds["south"],
                bounds["east"],
                bounds["north"],
                p_start,
                p_end,
            )
            range_display = f"{start_date} to {end_date} (also tested padded {p_start} to {p_end})"
            note = f"CMR returned {count} granules for case range, and {p_count} granules for padded range"
        else:
            range_display = f"{start_date} to {end_date}"

        if case_id == "feni-2024" and entries:
            for e in entries:
                feni_granule_details.append({
                    "id": str(e.get("id")),
                    "title": str(e.get("title")),
                    "time_start": str(e.get("time_start")),
                })

        results.append({
            "case": case_id,
            "after_range": range_display,
            "granules": granules_str,
            "note": note,
        })
        time.sleep(0.3)

    # Format Markdown Table
    lines = [
        "# NASA OPERA DSWx-S1 Coverage Check",
        "",
        "Query of NASA Common Metadata Repository (CMR) for `OPERA_L3_DSWX-S1_V1` across the 10 ready demo cases.",
        "",
        "| Case | Post-Event Range (`afterRange`) | OPERA Granules Found | Note |",
        "| :--- | :--- | :---: | :--- |",
    ]

    for r in results:
        lines.append(f"| `{r['case']}` | {r['after_range']} | {r['granules']} | {r['note']} |")

    if feni_granule_details:
        lines.extend([
            "",
            "## Feni Granule Details (OPERA_L3_DSWX-S1_V1)",
            "",
            "The following granules were returned by the NASA CMR API for `feni-2024`:",
            "",
            "| Granule ID | Title | Acquisition Time (`time_start`) |",
            "| :--- | :--- | :--- |",
        ])
        for g in feni_granule_details:
            lines.append(f"| `{g['id']}` | `{g['title']}` | {g['time_start']} |")

    table_content = "\n".join(lines) + "\n"
    print("\n" + table_content)

    docs_dir = os.path.join(repo_root, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    out_file = os.path.join(docs_dir, "validation-coverage.md")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(table_content)
    print(f"Saved coverage report to {out_file}")


if __name__ == "__main__":
    main()
