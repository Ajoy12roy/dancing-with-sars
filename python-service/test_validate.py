"""
Unit tests for python-service/validate.py

Tests metric calculation (IoU, precision, recall, F1) using synthetic binary arrays,
and tests reproject/resample logic with in-memory Affine transforms and CRS.
No network calls.
"""

import pytest
import numpy as np
from rasterio.transform import from_origin
from rasterio.crs import CRS
from validate import compute_binary_metrics, reproject_raster_to_grid


def test_binary_metrics_perfect_agreement():
    """When prediction and reference match identically, IoU, precision, recall, and F1 must be 1.0."""
    pred = np.zeros((10, 10), dtype=bool)
    pred[2:7, 2:7] = True
    ref = pred.copy()

    metrics = compute_binary_metrics(pred, ref, pixel_area_km2=0.01)

    assert metrics["iou"] == 1.0
    assert metrics["precision"] == 1.0
    assert metrics["recall"] == 1.0
    assert metrics["f1"] == 1.0
    assert metrics["ourAreaKm2"] == 0.25  # 25 pixels * 0.01
    assert metrics["referenceAreaKm2"] == 0.25
    assert metrics["overlapKm2"] == 0.25
    assert metrics["validPixelFraction"] == 1.0


def test_binary_metrics_no_overlap():
    """When prediction and reference have zero overlap, IoU, precision, recall, and F1 must be 0.0."""
    pred = np.zeros((10, 10), dtype=bool)
    pred[0:4, 0:4] = True  # 16 pixels top-left

    ref = np.zeros((10, 10), dtype=bool)
    ref[6:10, 6:10] = True  # 16 pixels bottom-right

    metrics = compute_binary_metrics(pred, ref, pixel_area_km2=0.01)

    assert metrics["iou"] == 0.0
    assert metrics["precision"] == 0.0
    assert metrics["recall"] == 0.0
    assert metrics["f1"] == 0.0
    assert metrics["ourAreaKm2"] == 0.16
    assert metrics["referenceAreaKm2"] == 0.16
    assert metrics["overlapKm2"] == 0.0


def test_binary_metrics_partial_overlap():
    """
    Test 50% overlap of each set:
    pred has 20 pixels, ref has 20 pixels, overlap is 10 pixels.
    TP = 10, FP = 10, FN = 10 -> union = 30.
    IoU = 10 / 30 = 0.3333. Precision = 10/20 = 0.5. Recall = 10/20 = 0.5. F1 = 20/40 = 0.5.
    """
    pred = np.zeros((10, 10), dtype=bool)
    pred[0, 0:20] = True if pred.shape[1] >= 20 else False  # reshape to 1D equivalent
    # Using 10x10 array:
    pred = np.zeros((10, 10), dtype=bool)
    pred.flat[0:20] = True  # 20 pixels

    ref = np.zeros((10, 10), dtype=bool)
    ref.flat[10:30] = True  # 20 pixels, overlaps indices 10..19

    metrics = compute_binary_metrics(pred, ref, pixel_area_km2=0.01)

    assert metrics["iou"] == 0.3333
    assert metrics["precision"] == 0.5
    assert metrics["recall"] == 0.5
    assert metrics["f1"] == 0.5
    assert metrics["ourAreaKm2"] == 0.20
    assert metrics["referenceAreaKm2"] == 0.20
    assert metrics["overlapKm2"] == 0.10


def test_binary_metrics_with_valid_mask():
    """Pixels outside the valid mask must be completely excluded from metrics and area."""
    pred = np.zeros((10, 10), dtype=bool)
    pred[0:5, 0:5] = True  # 25 pixels

    ref = np.zeros((10, 10), dtype=bool)
    ref[0:5, 0:5] = True  # 25 pixels

    # Mask out the bottom half and right half
    valid = np.zeros((10, 10), dtype=bool)
    valid[0:3, 0:3] = True  # Only 9 pixels valid in the 25-pixel patch

    metrics = compute_binary_metrics(pred, ref, valid_mask=valid, pixel_area_km2=0.01)

    assert metrics["iou"] == 1.0
    assert metrics["precision"] == 1.0
    assert metrics["recall"] == 1.0
    assert metrics["ourAreaKm2"] == 0.09
    assert metrics["referenceAreaKm2"] == 0.09
    assert metrics["overlapKm2"] == 0.09
    assert metrics["validPixelFraction"] == 0.09  # 9 / 100 pixels valid


def test_reproject_raster_to_grid_synthetic():
    """Test reprojecting synthetic in-memory raster data to a target grid."""
    src_data = np.zeros((20, 20), dtype=np.uint8)
    src_data[5:15, 5:15] = 1  # 10x10 central block

    # Source transform: origin at (90.0, 25.0), pixel size 0.01 deg
    src_transform = from_origin(90.0, 25.0, 0.01, 0.01)
    src_crs = CRS.from_epsg(4326)

    # Target transform: exact same grid coordinates
    target_shape = (20, 20)
    target_transform = src_transform
    target_crs = src_crs

    dst = reproject_raster_to_grid(
        src_data=src_data,
        src_transform=src_transform,
        src_crs=src_crs,
        target_shape=target_shape,
        target_transform=target_transform,
        target_crs=target_crs,
    )

    assert dst.shape == (20, 20)
    assert np.array_equal(dst, src_data)
