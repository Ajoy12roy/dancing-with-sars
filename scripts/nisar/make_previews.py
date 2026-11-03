#!/usr/bin/env python3
"""
scripts/nisar/make_previews.py

Generates 512x512 grayscale preview PNGs from NISAR sample GeoTIFF rasters
under data/samples/nisar/hakaluki-haor/ for 4 selected non-excluded dates.

Rules (per Day 7b instructions):
- 4 NON-excluded dates: first date, last date, and the dates with the smallest
  and largest low-backscatter fraction at -16 dB.
  Because the first date (2026-06-23) coincides with the global maximum fraction (0.6541)
  and the last date (2026-10-21) coincides with the global minimum fraction (0.3777),
  the intermediate extreme dates (2026-08-10: 0.6365 and 2026-10-09: 0.4398) are selected
  to ensure exactly 4 distinct dates spanning the observation series.
- Fixed stretch: -25 dB to 0 dB, grayscale (0 = -25 dB, 255 = 0 dB).
- Downscaled to 512x512 using PIL bilinear resampling.
- Each preview file strictly under 300 KB.
- Saves to public/nisar/hakaluki-haor/<date>_HH_preview.png and index.json.
- No image generated for excluded date 2026-08-22 (tile placeholder in UI).
"""

import json
import os
import sys
from pathlib import Path
import numpy as np

try:
    import rasterio
    from PIL import Image
except ImportError as e:
    print(f"Error: Missing required package: {e}")
    print("Install required packages: pip install rasterio pillow numpy")
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
TIMESERIES_PATH = REPO_ROOT / "data" / "nisar" / "hakaluki-haor" / "timeseries.json"
SAMPLES_DIR = REPO_ROOT / "data" / "samples" / "nisar" / "hakaluki-haor"
OUTPUT_DIR = REPO_ROOT / "public" / "nisar" / "hakaluki-haor"

V_MIN = -25.0
V_MAX = 0.0
TARGET_SIZE = (512, 512)
MAX_FILE_SIZE_BYTES = 300 * 1024  # 300 KB


def main():
    if not TIMESERIES_PATH.exists():
        print(f"Error: Timeseries file not found at {TIMESERIES_PATH}")
        sys.exit(1)

    with open(TIMESERIES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = data.get("records", [])
    valid_records = [r for r in records if not r.get("excluded")]

    if not valid_records:
        print("Error: No valid (non-excluded) records found in timeseries.json")
        sys.exit(1)

    first_record = valid_records[0]
    last_record = valid_records[-1]

    # Find fraction at -16 dB for each valid record
    def get_frac16(rec):
        grid = rec.get("referenceGrid", [])
        entry = next((item for item in grid if item.get("thresholdDb") == -16), None)
        return entry.get("windowFraction", 0.0) if entry else 0.0

    def get_area16(rec):
        grid = rec.get("referenceGrid", [])
        entry = next((item for item in grid if item.get("thresholdDb") == -16), None)
        return entry.get("lowBackscatterAreaKm2", 0.0) if entry else 0.0

    # Intermediate records (excluding boundary first and last)
    intermediate_records = valid_records[1:-1]
    sorted_intermediate = sorted(intermediate_records, key=get_frac16)
    interior_min_record = sorted_intermediate[0]
    interior_max_record = sorted_intermediate[-1]

    selected_records = [
        (first_record, "first_date_global_max", "First acquisition / maximum low-backscatter area"),
        (interior_max_record, "intermediate_max", "Intermediate high low-backscatter area"),
        (interior_min_record, "intermediate_min", "Intermediate low low-backscatter area"),
        (last_record, "last_date_global_min", "Last acquisition / minimum low-backscatter area"),
    ]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    index_entries = []

    for rec, role_key, role_desc in selected_records:
        date_str = rec["date"]
        clean_date = date_str.replace("-", "")
        tif_filename = f"{clean_date}_HH.tif"
        tif_path = SAMPLES_DIR / tif_filename

        if not tif_path.exists():
            print(f"Error: Sample GeoTIFF {tif_path} not found.")
            sys.exit(1)

        with rasterio.open(tif_path) as src:
            arr = src.read(1)

        # Convert linear power (gamma0) to dB
        arr_db = 10.0 * np.log10(np.maximum(arr, 1e-7))

        # Linear fixed stretch: [-25 dB, 0 dB] -> [0, 255]
        norm = np.clip((arr_db - V_MIN) / (V_MAX - V_MIN), 0.0, 1.0)
        gray = (norm * 255.0).astype(np.uint8)

        # Downscale to 512x512 using PIL Bilinear
        img = Image.fromarray(gray, mode="L")
        img_resized = img.resize(TARGET_SIZE, resample=Image.Resampling.BILINEAR)

        out_filename = f"{date_str}_HH_preview.png"
        out_path = OUTPUT_DIR / out_filename
        img_resized.save(out_path, optimize=True)

        file_size = os.path.getsize(out_path)
        if file_size > MAX_FILE_SIZE_BYTES:
            print(f"Warning: {out_filename} is {file_size} bytes, exceeding {MAX_FILE_SIZE_BYTES} bytes cap.")
            sys.exit(1)

        print(f"Generated {out_filename}: {file_size} bytes ({file_size / 1024:.1f} KB)")

        index_entries.append({
            "date": date_str,
            "filename": out_filename,
            "granuleId": rec.get("granuleId"),
            "crid": rec.get("crid", data.get("crid")),
            "dataMaturity": rec.get("dataMaturity", data.get("dataMaturity")),
            "selectionRole": role_key,
            "selectionDescription": role_desc,
            "medianHhDb": rec.get("medianHhDb"),
            "fractionAtMinus16Db": get_frac16(rec),
            "areaKm2AtMinus16Db": get_area16(rec),
            "fileSizeBytes": file_size,
        })

    index_data = {
        "dataset": "NISAR L2 GCOV Hakaluki Haor Previews",
        "crid": data.get("crid", "P05023"),
        "dataMaturity": data.get("dataMaturity", "PROVISIONAL"),
        "stretch": f"{V_MIN} dB to {V_MAX} dB, linear grayscale (0 = {V_MIN} dB, 255 = {V_MAX} dB)",
        "method": "Bilinear downsampling from 1024x1024 (10m UTM 46N) to 512x512 pixels",
        "rule": (
            "4 NON-excluded dates chosen: first acquisition (2026-06-23, max fraction 0.6541), "
            "intermediate high (2026-08-10, fraction 0.6365), intermediate low (2026-10-09, fraction 0.4398), "
            "and last acquisition (2026-10-21, min fraction 0.3777) at reference threshold -16 dB."
        ),
        "excludedDate": "2026-08-22",
        "excludedReason": "Radiometric outlier (|m_d - M| = 40.00 dB > 2.62 dB); no preview raster generated.",
        "previews": index_entries,
    }

    index_path = OUTPUT_DIR / "index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2)

    print(f"Wrote index to {index_path}")
    print("Preview generation completed successfully.")


if __name__ == "__main__":
    main()

