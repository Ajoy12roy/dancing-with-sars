#!/usr/bin/env python3
"""
Calculate Sylhet Population in Mapped New-Water Extent (Count-Conserving Areal Weighting).
Read-only execution against tracked SAR samples and local WorldPop raster.
"""

import os
import sys
import math
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.windows import Window

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPTS_DIR = os.path.join(REPO_ROOT, "scripts", "exposure")
sys.path.insert(0, SCRIPTS_DIR)

import reproduce_sylhet_masks

def compute_sylhet_exposure(
    worldpop_path: str = None,
    image_a_path: str = None,
    image_b_path: str = None,
    thresholds: list = None
):
    if worldpop_path is None:
        worldpop_path = os.path.join(REPO_ROOT, "data", "samples", "worldpop", "bgd_ppp_2020.tif")
    if not os.path.exists(worldpop_path):
        # Fallback to python-service/scratch if data/samples path not found
        fallback = os.path.join(REPO_ROOT, "python-service", "scratch", "bgd_ppp_2020.tif")
        if os.path.exists(fallback):
            worldpop_path = fallback
        else:
            raise FileNotFoundError(f"WorldPop raster not found at {worldpop_path} or {fallback}")

    if thresholds is None:
        thresholds = [-18.0, -17.0, -16.0, -15.0, -14.0]

    sar_results = reproduce_sylhet_masks.get_sylhet_masks_and_areas(
        image_a_path=image_a_path,
        image_b_path=image_b_path,
        thresholds=thresholds
    )

    baseline = sar_results[-16.0]
    sar_bounds = baseline["bounds"]
    sar_transform = baseline["transform"]
    sar_crs = baseline["crs"]

    # Compute valid SAR observation mask
    if image_a_path is None:
        image_a_path = os.path.join(REPO_ROOT, "python-service", "samples", "sylhet", "image_a.tif")
    if image_b_path is None:
        image_b_path = os.path.join(REPO_ROOT, "python-service", "samples", "sylhet", "image_b.tif")

    with rasterio.open(image_a_path) as sa, rasterio.open(image_b_path) as sb:
        da = sa.read(1)
        db = sb.read(1)
        valid_sar = (da != sa.nodata) & (db != sb.nodata) & np.isfinite(da) & np.isfinite(db)

    aoi_valid_pixels = int(np.sum(valid_sar))
    aoi_total_area_km2 = round(float(aoi_valid_pixels * baseline["pixel_area_km2"]), 2)

    with rasterio.open(worldpop_path) as wp:
        wp_crs = wp.crs
        wp_transform = wp.transform
        wp_nodata = wp.nodata if wp.nodata is not None else -99999.0

        col_off_f = (sar_bounds.left - wp_transform.c) / wp_transform.a
        row_off_f = (sar_bounds.top - wp_transform.f) / wp_transform.e
        col_right_f = (sar_bounds.right - wp_transform.c) / wp_transform.a
        row_bot_f = (sar_bounds.bottom - wp_transform.f) / wp_transform.e

        c0 = max(0, math.floor(col_off_f) - 2)
        r0 = max(0, math.floor(row_off_f) - 2)
        c1 = min(wp.width, math.ceil(col_right_f) + 2)
        r1 = min(wp.height, math.ceil(row_bot_f) + 2)

        win = Window(c0, r0, c1 - c0, r1 - r0)
        pop_raw = wp.read(1, window=win)
        win_transform = rasterio.windows.transform(win, wp_transform)

        # Handle nodata and negative population values
        pop = np.where(pop_raw == wp_nodata, 0.0, pop_raw).astype(np.float64)
        pop = np.where(pop < 0.0, 0.0, pop)

    # Warp AOI valid mask to WorldPop grid (areal fraction covered by AOI)
    aoi_fraction = np.zeros(pop.shape, dtype=np.float32)
    reproject(
        source=valid_sar.astype(np.float32),
        destination=aoi_fraction,
        src_transform=sar_transform,
        src_crs=sar_crs,
        dst_transform=win_transform,
        dst_crs=wp_crs,
        resampling=Resampling.average
    )

    aoi_total_pop_raw = float(np.sum(pop * aoi_fraction))

    threshold_rows = []
    for t in thresholds:
        info = sar_results[t]
        water_mask = info["mask"].astype(np.float32)
        water_fraction = np.zeros(pop.shape, dtype=np.float32)

        reproject(
            source=water_mask,
            destination=water_fraction,
            src_transform=sar_transform,
            src_crs=sar_crs,
            dst_transform=win_transform,
            dst_crs=wp_crs,
            resampling=Resampling.average
        )

        exposed_pop = float(np.sum(pop * water_fraction))
        exposed_pct = round(float((exposed_pop / aoi_total_pop_raw) * 100.0), 2)

        # Conservation check for this threshold: water + non-water = aoi
        non_water_mask = (valid_sar & (~info["mask"])).astype(np.float32)
        non_water_fraction = np.zeros(pop.shape, dtype=np.float32)
        reproject(
            source=non_water_mask,
            destination=non_water_fraction,
            src_transform=sar_transform,
            src_crs=sar_crs,
            dst_transform=win_transform,
            dst_crs=wp_crs,
            resampling=Resampling.average
        )
        non_exposed_pop = float(np.sum(pop * non_water_fraction))
        partition_sum = exposed_pop + non_exposed_pop
        abs_err = abs(aoi_total_pop_raw - partition_sum)
        rel_err = abs_err / aoi_total_pop_raw

        threshold_rows.append({
            "threshold_db": t,
            "flooded_area_km2": info["area_km2"],
            "pixel_count": info["pixel_count"],
            "estimated_people_in_extent": round(exposed_pop),
            "estimated_people_in_extent_exact": exposed_pop,
            "population_share_pct": exposed_pct,
            "conservation_relative_error": rel_err
        })

    return {
        "aoi_total_area_km2": aoi_total_area_km2,
        "aoi_total_population": round(aoi_total_pop_raw),
        "aoi_total_population_exact": aoi_total_pop_raw,
        "threshold_rows": threshold_rows
    }

if __name__ == "__main__":
    res = compute_sylhet_exposure()
    print("=== SYLHET EXPOSURE RESULTS (COUNT-CONSERVING AREAL WEIGHTING) ===")
    print(f"AOI Total Area: {res['aoi_total_area_km2']:.2f} km2")
    print(f"AOI Total Population: {res['aoi_total_population']:,} people")
    print("\nThreshold Sweep Details:")
    for row in res["threshold_rows"]:
        t = row["threshold_db"]
        area = row["flooded_area_km2"]
        pop = row["estimated_people_in_extent"]
        pct = row["population_share_pct"]
        err = row["conservation_relative_error"]
        print(f"  {t:+.1f} dB: {area:.2f} km2 | {pop:,} people ({pct:.2f}% of AOI) | rel err: {err:.2e}")
