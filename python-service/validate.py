#!/usr/bin/env python3
"""
Independent Comparison & Validation Engine — Dancing with the SARs (TerraPulse)

Evaluates our SAR-derived change masks against independent reference rasters or vectors.
Computes standard spatial agreement metrics (Precision, Recall, IoU / Jaccard, F1 / Dice),
area comparisons, and valid-pixel fractions.

Enforces an absolute integrity check:
Our pipeline must recompute and verify that ourAreaKm2 matches the headline result in
data/precomputed/<caseId>/result.json within 0.05 km² before executing comparison.
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, List, Optional, Tuple, Union

import numpy as np

# Ensure python-service is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from process_change import (
    run_change_detection,
    to_db,
    read_raster_windowed,
    calculate_pixel_area_km2,
    compute_water_mask,
    compute_water_transition,
    filter_small_components,
    get_band_and_polarization,
)
from scipy.ndimage import median_filter, binary_dilation, label

try:
    import rasterio
    from rasterio.warp import reproject, Resampling
    from rasterio.features import rasterize
except ImportError:
    rasterio = None
    reproject = None
    Resampling = None
    rasterize = None


def compute_binary_metrics(
    pred_mask: np.ndarray,
    ref_mask: np.ndarray,
    valid_mask: Optional[np.ndarray] = None,
    pixel_area_km2: float = 0.0001,
) -> Dict[str, float]:
    """
    Compute binary classification metrics between predicted and reference masks.
    Only pixels where valid_mask is True are considered.
    """
    if pred_mask.shape != ref_mask.shape:
        raise ValueError(f"Shape mismatch: pred {pred_mask.shape} vs ref {ref_mask.shape}")

    if valid_mask is None:
        valid_mask = np.ones(pred_mask.shape, dtype=bool)
    else:
        if valid_mask.shape != pred_mask.shape:
            raise ValueError(f"Shape mismatch: valid_mask {valid_mask.shape} vs pred {pred_mask.shape}")
        valid_mask = valid_mask.astype(bool)

    pred = pred_mask.astype(bool) & valid_mask
    ref = ref_mask.astype(bool) & valid_mask

    tp = int(np.sum(pred & ref))
    fp = int(np.sum(pred & (~ref)))
    fn = int(np.sum((~pred) & ref))
    tn = int(np.sum((~pred) & (~ref) & valid_mask))
    valid_count = int(np.sum(valid_mask))

    total_pixels = pred_mask.size
    valid_pixel_fraction = float(valid_count / total_pixels) if total_pixels > 0 else 0.0

    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else (1.0 if (tp + fp + fn) == 0 else 0.0)
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else (1.0 if (tp + fp + fn) == 0 else 0.0)
    iou = float(tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else (1.0 if (tp + fp + fn) == 0 else 0.0)
    f1 = float((2 * tp) / (2 * tp + fp + fn)) if (2 * tp + fp + fn) > 0 else (1.0 if (tp + fp + fn) == 0 else 0.0)

    our_area_km2 = float(np.sum(pred) * pixel_area_km2)
    ref_area_km2 = float(np.sum(ref) * pixel_area_km2)
    overlap_km2 = float(tp * pixel_area_km2)

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "iou": round(iou, 4),
        "f1": round(f1, 4),
        "ourAreaKm2": round(our_area_km2, 2),
        "referenceAreaKm2": round(ref_area_km2, 2),
        "overlapKm2": round(overlap_km2, 2),
        "validPixelFraction": round(valid_pixel_fraction, 4),
    }


def reproject_raster_to_grid(
    src_data: np.ndarray,
    src_transform,
    src_crs,
    target_shape: Tuple[int, int],
    target_transform,
    target_crs,
    resampling_method=None,
) -> np.ndarray:
    """
    Reproject and resample a 2D source raster array onto target grid coordinates.
    Defaults to nearest-neighbor for categorical masks.
    """
    if rasterio is None:
        raise RuntimeError("rasterio is required for raster reprojection")

    if resampling_method is None:
        resampling_method = Resampling.nearest

    dst_arr = np.zeros(target_shape, dtype=src_data.dtype)
    reproject(
        source=src_data,
        destination=dst_arr,
        src_transform=src_transform,
        src_crs=src_crs,
        dst_transform=target_transform,
        dst_crs=target_crs,
        resampling=resampling_method,
    )
    return dst_arr


def get_case_change_mask_and_meta(
    case_id: str,
    repo_root: str
) -> Tuple[np.ndarray, np.ndarray, float, Any, Any, Dict[str, Any]]:
    """
    Recomputes the change mask for a case study using process_change functions,
    verifying strict integrity against data/precomputed/<case_id>/result.json.
    Returns: (change_mask, valid_mask, pixel_area_km2, transform, crs, stored_result)
    """
    precomputed_json_path = os.path.join(repo_root, "data", "precomputed", case_id, "result.json")
    if not os.path.exists(precomputed_json_path):
        raise FileNotFoundError(f"Missing precomputed result.json for {case_id}")

    with open(precomputed_json_path, "r", encoding="utf-8") as f:
        stored_result = json.load(f)

    stored_aff = float(stored_result.get("affectedAreaKm2", 0.0))
    mode = stored_result.get("mode", "flood")
    params = stored_result.get("params", {})

    image_a_path = os.path.join(repo_root, "data", "samples", case_id, "image_a.tif")
    image_b_path = os.path.join(repo_root, "data", "samples", case_id, "image_b.tif")

    if not os.path.exists(image_a_path) or not os.path.exists(image_b_path):
        raise FileNotFoundError(f"Samples GeoTIFFs missing for {case_id}")

    # Mandatory integrity check via run_change_detection
    water_threshold = params.get("waterThresholdDb", -16.0)
    loss_threshold_db = params.get("lossThresholdDb", -3.0)
    min_pixels = params.get("minPixels", 20)
    river_buffer = params.get("riverBuffer", 5)
    filter_size = params.get("filterSize", 5)
    band = params.get("band", 1)
    polarization = params.get("polarization", "VV")

    if mode == "deforestation":
        check_run = run_change_detection(
            image_a_path=image_a_path,
            image_b_path=image_b_path,
            mode=mode,
            loss_threshold_db=loss_threshold_db,
            min_pixels=min_pixels,
            filter_size=filter_size,
            band=band,
            polarization=polarization,
        )
    else:
        check_run = run_change_detection(
            image_a_path=image_a_path,
            image_b_path=image_b_path,
            mode=mode,
            water_threshold=water_threshold,
            min_pixels=min_pixels,
            river_buffer=river_buffer,
            filter_size=filter_size,
            band=band,
            polarization=polarization,
        )

    computed_aff = float(check_run.get("affectedAreaKm2", 0.0))
    if abs(computed_aff - stored_aff) > 0.05:
        raise RuntimeError(
            f"Integrity check failed: computed area differs from headline "
            f"({computed_aff:.2f} km² computed vs {stored_aff:.2f} km² headline)"
        )

    # Reconstruct binary change mask on the native grid
    with rasterio.open(image_a_path) as src_a, rasterio.open(image_b_path) as src_b:
        crs_a = src_a.crs
        transform_a = src_a.transform
        bounds_a = src_a.bounds

        band_a, pol_a = get_band_and_polarization(src_a, requested_polarization=polarization, requested_band=band)
        band_b, pol_b = get_band_and_polarization(src_b, requested_polarization=polarization, requested_band=band)

        data_a_raw = read_raster_windowed(src_a, band=band_a)
        data_b_raw = read_raster_windowed(src_b, band=band_b)
        data_a_db = to_db(data_a_raw, nodata=src_a.nodata)
        data_b_db = to_db(data_b_raw, nodata=src_b.nodata)

    valid_mask = np.isfinite(data_a_db) & np.isfinite(data_b_db)
    data_a_db_filled = np.nan_to_num(data_a_db, nan=0.0)
    data_b_db_filled = np.nan_to_num(data_b_db, nan=0.0)

    data_a_filtered = median_filter(data_a_db_filled, size=filter_size) if filter_size > 1 else data_a_db_filled
    data_b_filtered = median_filter(data_b_db_filled, size=filter_size) if filter_size > 1 else data_b_db_filled

    center_lat = (bounds_a.top + bounds_a.bottom) / 2.0
    pixel_area_km2 = calculate_pixel_area_km2(transform_a, crs_a, center_lat=center_lat, bounds=bounds_a)

    if mode == "flood":
        water_mask_a = compute_water_mask(data_a_filtered, polarization=pol_a, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        water_mask_b = compute_water_mask(data_b_filtered, polarization=pol_b, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        transition = compute_water_transition(water_mask_a, water_mask_b)
        change_mask = (transition == 2) & valid_mask

    elif mode == "surface-water":
        water_mask_a = compute_water_mask(data_a_filtered, polarization=pol_a, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        water_mask_b = compute_water_mask(data_b_filtered, polarization=pol_b, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        transition = compute_water_transition(water_mask_a, water_mask_b)
        change_mask = ((transition == 2) | (transition == 3)) & valid_mask

    elif mode == "river-erosion":
        water_mask_a = compute_water_mask(data_a_filtered, polarization=pol_a, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        water_mask_b = compute_water_mask(data_b_filtered, polarization=pol_b, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        transition = compute_water_transition(water_mask_a, water_mask_b)
        river_mask = (transition == 1) & valid_mask
        dilated_river = binary_dilation(river_mask, structure=np.ones((3, 3), dtype=bool), iterations=river_buffer) if (river_buffer > 0 and np.any(river_mask)) else river_mask

        erosion_mask = np.zeros(data_a_filtered.shape, dtype=bool)
        class2 = (transition == 2) & valid_mask
        if np.any(class2):
            labeled_c2, num_c2 = label(class2, structure=np.ones((3, 3), dtype=np.uint8))
            if num_c2 > 0:
                intersecting_c2 = set(np.unique(labeled_c2[dilated_river])) - {0}
                if intersecting_c2:
                    erosion_mask = np.isin(labeled_c2, list(intersecting_c2))

        accretion_mask = np.zeros(data_a_filtered.shape, dtype=bool)
        class3 = (transition == 3) & valid_mask
        if np.any(class3):
            labeled_c3, num_c3 = label(class3, structure=np.ones((3, 3), dtype=np.uint8))
            if num_c3 > 0:
                intersecting_c3 = set(np.unique(labeled_c3[dilated_river])) - {0}
                if intersecting_c3:
                    accretion_mask = np.isin(labeled_c3, list(intersecting_c3))

        change_mask = (erosion_mask | accretion_mask) & valid_mask

    elif mode == "deforestation":
        diff_backscatter = data_b_filtered - data_a_filtered
        raw_defor = ((diff_backscatter < loss_threshold_db) & valid_mask).astype(np.uint8)
        change_mask = (filter_small_components(raw_defor, min_pixels=min_pixels) == 1) & valid_mask

    else:
        diff_val = np.abs(data_b_filtered - data_a_filtered)
        change_mask = (diff_val > 3.0) & valid_mask

    # Final sanity check against headline
    mask_aff = float(np.sum(change_mask) * pixel_area_km2)
    if abs(mask_aff - stored_aff) > 0.05:
        raise RuntimeError(
            f"Integrity check failed: computed area differs from headline "
            f"({mask_aff:.2f} km² mask vs {stored_aff:.2f} km² headline)"
        )

    return change_mask, valid_mask, pixel_area_km2, transform_a, crs_a, stored_result


def run_comparison(
    case_id: str,
    reference_path: str,
    reference_name: str,
    reference_source: str,
    reference_date: str,
    reference_res_m: float,
    repo_root: Optional[str] = None,
    out_dir: Optional[str] = None,
    notes: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Runs comparison between our change mask and an independent reference dataset.
    Saves result to data/validation/<case-id>.json.
    """
    if repo_root is None:
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    change_mask, valid_mask, pixel_area_km2, target_transform, target_crs, stored_result = (
        get_case_change_mask_and_meta(case_id, repo_root)
    )

    if not os.path.exists(reference_path):
        raise FileNotFoundError(f"Reference file not found: {reference_path}")

    # Load reference raster or vector
    is_vector = reference_path.lower().endswith((".geojson", ".json", ".shp"))
    target_shape = change_mask.shape

    if is_vector:
        if rasterize is None:
            raise RuntimeError("rasterio.features.rasterize is required for vector references")
        with open(reference_path, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)
        features = geojson_data.get("features", [])
        shapes = [f["geometry"] for f in features if f.get("geometry")]
        if shapes:
            ref_mask = rasterize(
                shapes=shapes,
                out_shape=target_shape,
                transform=target_transform,
                fill=0,
                default_value=1,
                dtype=np.uint8,
            ).astype(bool)
        else:
            ref_mask = np.zeros(target_shape, dtype=bool)
    else:
        with rasterio.open(reference_path) as ref_src:
            ref_arr = ref_src.read(1)
            ref_mask = reproject_raster_to_grid(
                src_data=ref_arr,
                src_transform=ref_src.transform,
                src_crs=ref_src.crs,
                target_shape=target_shape,
                target_transform=target_transform,
                target_crs=target_crs,
                resampling_method=Resampling.nearest,
            ).astype(bool)

    metrics = compute_binary_metrics(
        pred_mask=change_mask,
        ref_mask=ref_mask,
        valid_mask=valid_mask,
        pixel_area_km2=pixel_area_km2,
    )

    result_payload: Dict[str, Any] = {
        "caseId": case_id,
        "referenceName": reference_name,
        "referenceSource": reference_source,
        "referenceDate": reference_date,
        "referenceResolutionMeters": reference_res_m,
        "metrics": metrics,
        "notes": notes or [],
    }

    if out_dir is None:
        out_dir = os.path.join(repo_root, "data", "validation")
    os.makedirs(out_dir, exist_ok=True)

    out_file = os.path.join(out_dir, f"{case_id}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result_payload, f, indent=2)

    return result_payload


def main():
    parser = argparse.ArgumentParser(description="Independent comparison engine for TerraPulse case studies.")
    parser.add_argument("--case-id", required=True, help="Target case study ID (e.g. sylhet)")
    parser.add_argument("--ref-path", required=True, help="Path to reference GeoTIFF or GeoJSON")
    parser.add_argument("--ref-name", required=True, help="Name of reference dataset (e.g. Copernicus EMS EMSR720)")
    parser.add_argument("--ref-source", required=True, help="Provider or source (e.g. Copernicus Emergency Management Service)")
    parser.add_argument("--ref-date", required=True, help="Reference observation date or period")
    parser.add_argument("--ref-resolution", type=float, default=20.0, help="Reference resolution in meters")
    parser.add_argument("--note", action="append", help="Explanatory note(s) for the comparison")
    parser.add_argument("--out-dir", default=None, help="Directory to save output JSON (default: data/validation)")

    args = parser.parse_args()
    try:
        res = run_comparison(
            case_id=args.case_id,
            reference_path=args.ref_path,
            reference_name=args.ref_name,
            reference_source=args.ref_source,
            reference_date=args.ref_date,
            reference_res_m=args.ref_resolution,
            out_dir=args.out_dir,
            notes=args.note,
        )
        print(json.dumps(res, indent=2))
    except Exception as ex:
        print(f"[ERROR] {ex}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
