"""
python-service/nisar_timeseries.py

Multi-temporal time series analysis and change detection for NASA NISAR L-band GCOV data.
Performs:
1. Pooled backscatter histogram across all dates and Otsu's optimal threshold calculation.
2. Inter-class variance ratio and bimodality check.
3. Multi-temporal water area time series extraction with ±2 dB sensitivity sweep.
4. Automatic change detection pair selection (earliest vs max-water date).
5. Precomputed case export for Terra Pulse UI (result.json, before.png, after.png, change-map.png).
6. Sensitivity JSON export for interactive threshold analysis.
"""

import os
import sys
import json
import math
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import rasterio
from rasterio.warp import transform_bounds
from rasterio.crs import CRS
from scipy.ndimage import gaussian_filter1d

# Ensure python-service is on path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from process_change import (
    to_db,
    calculate_pixel_area_km2,
    compute_water_mask,
    compute_water_transition,
    export_grayscale_png,
    run_change_detection,
    reproject_and_downscale_to_epsg4326
)


def get_git_commit_hash() -> str:
    """Retrieves current git commit hash, or 'UNKNOWN' if unavailable."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            cwd=str(Path(__file__).resolve().parent)
        )
        if res.returncode == 0:
            return res.stdout.strip()
    except Exception:
        pass
    return "UNKNOWN"


def compute_pooled_histogram_and_otsu(
    hh_tif_paths: List[Path],
    min_db: float = -30.0,
    max_db: float = 5.0,
    bin_width: float = 0.25
) -> Tuple[np.ndarray, np.ndarray, float, float, bool, Dict[str, Any]]:
    """
    Computes pooled HH dB histogram across all dates using 0.25 dB bins between -30 dB and +5 dB.
    Calculates the optimal water threshold using Otsu's method and verifies bimodality.

    Returns:
    --------
    bin_centers: 1D array of histogram bin centers
    total_counts: 1D array of pooled pixel counts
    otsu_threshold: Optimal threshold in dB
    eta_ratio: Inter-class variance ratio (between-class / total variance)
    is_bimodal: Boolean indicating whether histogram is distinctly bimodal
    diagnostics: Dictionary containing detailed histogram and peak diagnostics
    """
    bin_edges = np.arange(min_db, max_db + bin_width, bin_width)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2.0
    total_counts = np.zeros(len(bin_centers), dtype=np.int64)
    total_valid_pixels = 0

    all_mins = []
    all_maxs = []
    all_medians = []

    for p in hh_tif_paths:
        with rasterio.open(p) as src:
            data = src.read(1)
            nodata = src.nodata
            db_data = to_db(data, nodata=nodata)
            valid = db_data[np.isfinite(db_data)]
            if valid.size > 0:
                total_valid_pixels += valid.size
                all_mins.append(float(np.min(valid)))
                all_maxs.append(float(np.max(valid)))
                all_medians.append(float(np.median(valid)))
                counts, _ = np.histogram(valid, bins=bin_edges)
                total_counts += counts

    if total_valid_pixels == 0:
        raise ValueError("No valid finite backscatter pixels found across any raster.")

    # Normalized probabilities
    p = total_counts.astype(np.float64) / float(total_valid_pixels)

    # Otsu's method implementation
    omega = np.cumsum(p)
    mu = np.cumsum(p * bin_centers)
    mu_t = mu[-1]

    # Between-class variance for each possible threshold split
    # sigma_b_sq = (mu_t * omega - mu)**2 / (omega * (1 - omega))
    denominator = omega * (1.0 - omega)
    numerator = (mu_t * omega - mu) ** 2

    # Avoid divide-by-zero at boundaries
    valid_splits = (denominator > 1e-9)
    sigma_b_sq = np.zeros_like(p)
    sigma_b_sq[valid_splits] = numerator[valid_splits] / denominator[valid_splits]

    # Total variance
    sigma_t_sq = np.sum(p * ((bin_centers - mu_t) ** 2))

    max_idx = int(np.argmax(sigma_b_sq))
    otsu_threshold = float(bin_centers[max_idx])
    eta_ratio = float(sigma_b_sq[max_idx] / sigma_t_sq) if sigma_t_sq > 0 else 0.0

    # Bimodality check:
    # Smooth the histogram to suppress speckle noise
    smoothed = gaussian_filter1d(p, sigma=2.0)
    # Find local maxima
    local_maxima = []
    for i in range(1, len(smoothed) - 1):
        if smoothed[i - 1] < smoothed[i] and smoothed[i] > smoothed[i + 1]:
            # Peak prominence filter: must exceed 1% of max density
            if smoothed[i] > 0.01 * np.max(smoothed):
                local_maxima.append((i, bin_centers[i], smoothed[i]))

    # Identify water peak (< -14 dB) and land/vegetation peak (> -14 dB)
    water_peaks = [pk for pk in local_maxima if pk[1] < -14.0]
    land_peaks = [pk for pk in local_maxima if pk[1] >= -14.0]

    is_bimodal = (len(water_peaks) >= 1 and len(land_peaks) >= 1 and eta_ratio >= 0.40)

    diagnostics = {
        "total_valid_pixels": int(total_valid_pixels),
        "overall_min_db": round(float(min(all_mins)), 2) if all_mins else None,
        "overall_max_db": round(float(max(all_maxs)), 2) if all_maxs else None,
        "overall_median_db": round(float(np.median(all_medians)), 2) if all_medians else None,
        "otsu_threshold_db": round(otsu_threshold, 2),
        "inter_class_variance_ratio": round(eta_ratio, 4),
        "is_bimodal": bool(is_bimodal),
        "water_peaks": [{"db": round(p[1], 2), "prob": round(float(p[2]), 5)} for p in water_peaks],
        "land_peaks": [{"db": round(p[1], 2), "prob": round(float(p[2]), 5)} for p in land_peaks]
    }

    return bin_centers, total_counts, otsu_threshold, eta_ratio, is_bimodal, diagnostics


def compute_water_timeseries(
    hh_records: List[Dict[str, Any]],
    default_threshold: float,
    sweep_offsets: List[float] = [-2.0, -1.0, 0.0, 1.0, 2.0],
    min_pixels: int = 20,
    filter_size: int = 5
) -> Dict[str, Any]:
    """
    Computes per-date water area at default threshold and sensitivity sweep.
    """
    per_date_records = []
    sweep_values = [round(default_threshold + off, 2) for off in sweep_offsets]

    aoi_area_km2 = None

    for rec in hh_records:
        date_str = rec["date"]
        p = Path(rec["hh_path"])
        granule_id = rec["granule_id"]

        with rasterio.open(p) as src:
            data = src.read(1)
            nodata = src.nodata
            trans = src.transform
            crs = src.crs
            tags = src.tags()
            total_pixels = data.size

            pixel_area_km2 = calculate_pixel_area_km2(trans, crs)
            if aoi_area_km2 is None:
                aoi_area_km2 = round(total_pixels * pixel_area_km2, 2)

            db_data = to_db(data, nodata=nodata)
            valid_mask = np.isfinite(db_data)
            valid_fraction = float(np.sum(valid_mask) / total_pixels)

            # Water area at default threshold
            default_mask = compute_water_mask(
                db_data,
                polarization="HH",
                water_threshold=default_threshold,
                min_pixels=min_pixels,
                filter_size=filter_size
            )
            water_area_default = round(float(np.sum(default_mask == 1) * pixel_area_km2), 2)

            # Sweep areas
            sweep_areas = []
            for sw_val in sweep_values:
                sw_mask = compute_water_mask(
                    db_data,
                    polarization="HH",
                    water_threshold=sw_val,
                    min_pixels=min_pixels,
                    filter_size=filter_size
                )
                area = round(float(np.sum(sw_mask == 1) * pixel_area_km2), 2)
                sweep_areas.append(area)

            min_area = min(sweep_areas)
            max_area = max(sweep_areas)

            per_date_records.append({
                "date": date_str,
                "granule_id": granule_id,
                "waterAreaKm2": water_area_default,
                "minAreaKm2": min_area,
                "maxAreaKm2": max_area,
                "validFraction": round(valid_fraction, 4),
                "sweepAreas": sweep_areas
            })

    output_manifest = {
        "aoiId": "nisar-hakaluki-2026",
        "aoiAreaKm2": aoi_area_km2,
        "thresholdMethod": "Otsu pooled backscatter histogram (0.25 dB bins, [-30 dB, +5 dB])",
        "thresholdValueDb": round(default_threshold, 2),
        "sweepValuesDb": sweep_values,
        "dataMaturity": "PROVISIONAL",
        "crid": "P05023",
        "polarization": "HH",
        "units": "linear power (gamma0)",
        "computedBy": "python-service/nisar_timeseries.py",
        "gitCommit": get_git_commit_hash(),
        "records": per_date_records
    }

    return output_manifest


def generate_change_result(
    date_a_rec: Dict[str, Any],
    date_b_rec: Dict[str, Any],
    default_threshold: float,
    sweep_offsets: List[float],
    out_precomputed_dir: Path,
    out_sensitivity_path: Path,
    min_pixels: int = 20,
    filter_size: int = 5
) -> Dict[str, Any]:
    """
    Pairs earliest date versus maximum-water date and writes result.json, before.png,
    after.png, change-map.png, and sensitivity JSON.
    """
    out_precomputed_dir.mkdir(parents=True, exist_ok=True)
    out_sensitivity_path.parent.mkdir(parents=True, exist_ok=True)

    path_a = Path(date_a_rec["hh_path"])
    path_b = Path(date_b_rec["hh_path"])
    date_a = date_a_rec["date"]
    date_b = date_b_rec["date"]

    dt_a = datetime.strptime(date_a, "%Y-%m-%d")
    dt_b = datetime.strptime(date_b, "%Y-%m-%d")
    days_between = abs((dt_b - dt_a).days)

    out_result_json = out_precomputed_dir / "result.json"
    out_change_png = out_precomputed_dir / "change-map.png"
    out_before_png = out_precomputed_dir / "before.png"
    out_after_png = out_precomputed_dir / "after.png"

    print(f"\n--- Running Change Detection: {date_a} vs {date_b} (threshold={default_threshold:.2f} dB) ---")

    # Run change detection using existing pipeline
    change_metrics = run_change_detection(
        image_a_path=str(path_a),
        image_b_path=str(path_b),
        threshold=3.0,
        filter_size=filter_size,
        output_png=str(out_change_png),
        output_json=str(out_result_json),
        output_before_png=str(out_before_png),
        output_after_png=str(out_after_png),
        mode="surface-water",
        date_a=date_a,
        date_b=date_b,
        water_threshold=default_threshold,
        min_pixels=min_pixels,
        polarization="HH"
    )

    # Augment result.json with NISAR specific tags & plain selection notice
    with open(out_result_json, "r") as f:
        res = json.load(f)

    res["aoiId"] = "nisar-hakaluki-2026"
    res["polarization"] = "HH"
    res["band"] = 1
    res["dataMaturity"] = "PROVISIONAL"
    res["crid"] = "P05023"
    res["selectionMethod"] = (
        "Selected earliest acquisition vs maximum water extent date from time series observations "
        "(not linked to an externally declared disaster event)"
    )

    with open(out_result_json, "w") as f:
        json.dump(res, f, indent=2)

    # Compute sensitivity sweep across steps
    with rasterio.open(path_a) as src_a, rasterio.open(path_b) as src_b:
        data_a = src_a.read(1)
        data_b = src_b.read(1)
        trans_a = src_a.transform
        crs_a = src_a.crs
        pixel_area_km2 = calculate_pixel_area_km2(trans_a, crs_a)
        total_valid = np.isfinite(data_a) & np.isfinite(data_b)
        aoi_area = round(float(np.sum(total_valid) * pixel_area_km2), 2)

        data_a_db = to_db(data_a, nodata=src_a.nodata)
        data_b_db = to_db(data_b, nodata=src_b.nodata)

        sensitivity_steps = []
        for off in sweep_offsets:
            sw_val = round(default_threshold + off, 2)
            mask_a = compute_water_mask(data_a_db, polarization="HH", water_threshold=sw_val, min_pixels=min_pixels, filter_size=filter_size)
            mask_b = compute_water_mask(data_b_db, polarization="HH", water_threshold=sw_val, min_pixels=min_pixels, filter_size=filter_size)
            trans = compute_water_transition(mask_a, mask_b)
            # Surface water affected is new + lost (or new water for gain)
            new_w = float(np.sum((trans == 2) & total_valid) * pixel_area_km2)
            pct = round((new_w / aoi_area) * 100.0, 2) if aoi_area > 0 else 0.0
            sensitivity_steps.append({
                "value": sw_val,
                "areaKm2": round(new_w, 2),
                "percentChanged": pct
            })

    sensitivity_manifest = {
        "caseId": "nisar-hakaluki-2026",
        "mode": "surface-water",
        "parameterName": "water_threshold",
        "unit": "dB",
        "centre": round(default_threshold, 2),
        "steps": sensitivity_steps,
        "minAreaKm2": min([s["areaKm2"] for s in sensitivity_steps]),
        "maxAreaKm2": max([s["areaKm2"] for s in sensitivity_steps]),
        "computedBy": "python-service/nisar_timeseries.py",
        "gitCommit": get_git_commit_hash(),
        "dataMaturity": "PROVISIONAL",
        "crid": "P05023"
    }

    with open(out_sensitivity_path, "w") as f:
        json.dump(sensitivity_manifest, f, indent=2)

    return res
