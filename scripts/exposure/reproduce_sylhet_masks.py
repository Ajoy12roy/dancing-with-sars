#!/usr/bin/env python3
"""
Reproduce Sylhet Inundation Masks & Reconcile Stored Areas.
Read-only execution against tracked sample geotiffs using process_change.py.
"""

import os
import sys
import json
import rasterio
import numpy as np
from scipy.ndimage import median_filter

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PYTHON_SERVICE_DIR = os.path.join(REPO_ROOT, "python-service")
sys.path.insert(0, PYTHON_SERVICE_DIR)

import process_change

def get_sylhet_masks_and_areas(
    image_a_path: str = None,
    image_b_path: str = None,
    thresholds: list = None
):
    if image_a_path is None:
        image_a_path = os.path.join(PYTHON_SERVICE_DIR, "samples", "sylhet", "image_a.tif")
    if image_b_path is None:
        image_b_path = os.path.join(PYTHON_SERVICE_DIR, "samples", "sylhet", "image_b.tif")
    if thresholds is None:
        thresholds = [-18.0, -17.0, -16.0, -15.0, -14.0]

    with rasterio.open(image_a_path) as sa, rasterio.open(image_b_path) as sb:
        data_a = sa.read(1)
        data_b = sb.read(1)
        bounds = sa.bounds
        crs = sa.crs
        transform = sa.transform
        nodata_a = sa.nodata
        nodata_b = sb.nodata
        shape = sa.shape

    center_lat = (bounds.top + bounds.bottom) / 2.0
    pixel_area_km2 = process_change.calculate_pixel_area_km2(transform, crs, center_lat=center_lat, bounds=bounds)

    data_a_db = process_change.to_db(data_a, nodata=nodata_a)
    data_b_db = process_change.to_db(data_b, nodata=nodata_b)
    valid_mask = np.isfinite(data_a_db) & np.isfinite(data_b_db)

    data_a_filt = median_filter(np.nan_to_num(data_a_db, nan=0.0), size=5)
    data_b_filt = median_filter(np.nan_to_num(data_b_db, nan=0.0), size=5)

    results = {}
    for t in thresholds:
        mask_a = process_change.compute_water_mask(data_a_filt, polarization="VV", water_threshold=t, min_pixels=20, filter_size=1)
        mask_b = process_change.compute_water_mask(data_b_filt, polarization="VV", water_threshold=t, min_pixels=20, filter_size=1)
        transition = process_change.compute_water_transition(mask_a, mask_b)
        new_water_mask = (transition == 2) & valid_mask
        pixel_count = int(np.sum(new_water_mask))
        area_km2 = round(float(pixel_count * pixel_area_km2), 2)
        results[t] = {
            "mask": new_water_mask,
            "pixel_count": pixel_count,
            "area_km2": area_km2,
            "pixel_area_km2": pixel_area_km2,
            "shape": shape,
            "crs": crs,
            "transform": transform,
            "bounds": bounds
        }
    return results

if __name__ == "__main__":
    masks = get_sylhet_masks_and_areas()
    print("--- Sylhet Pipeline Mask Reproduction ---")
    for t, d in masks.items():
        print(f"Threshold {t:+.1f} dB: {d['pixel_count']} pixels -> {d['area_km2']:.2f} km2")
