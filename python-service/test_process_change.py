import os
import numpy as np
import pytest
from rasterio.transform import from_origin
from rasterio.crs import CRS
import rasterio

from process_change import run_change_detection, to_db

def test_to_db_conversion():
    """Verify linear vs dB scale detection and conversion."""
    # Has negative values, assuming already in dB
    db_data = np.array([100.0, 10.0, 1.0, 0.1, -1.0])
    res_db = to_db(db_data)
    np.testing.assert_array_equal(res_db, db_data)
    
    # Strictly positive (with NaN), assuming linear power
    linear_data = np.array([100.0, 10.0, 1.0, 0.1, np.nan])
    res_linear = to_db(linear_data)
    expected = np.array([20.0, 10.0, 0.0, -10.0, np.nan])
    np.testing.assert_allclose(res_linear, expected, atol=1e-5, rtol=1e-5)

def test_run_change_detection(tmpdir):
    """
    Test the core change detection math using a small synthetic numpy array pair.
    This avoids needing real satellite data to verify correctness.
    """
    # Image A: 10x10 array of constant value -10.0 (in dB)
    data_a = np.full((10, 10), -10.0, dtype=np.float32)
    
    # Image B: 10x10 array. Let's make a 5x5 region in the center change to -5.0
    data_b = np.full((10, 10), -10.0, dtype=np.float32)
    data_b[2:7, 2:7] = -5.0  # Difference is 5.0 (which is > 3.0 threshold)
    
    # Use a projected CRS for simple math (UTM) and a 1000m x 1000m pixel size
    # So 1 pixel = 1 km^2
    from affine import Affine
    transform = Affine.translation(0, 10000) @ Affine.scale(1000, -1000)
    crs = CRS.from_epsg(32631)
    
    path_a = os.path.join(tmpdir, 'image_a.tif')
    path_b = os.path.join(tmpdir, 'image_b.tif')
    
    for path, data in [(path_a, data_a), (path_b, data_b)]:
        with rasterio.open(
            path, 'w', driver='GTiff',
            height=data.shape[0], width=data.shape[1],
            count=1, dtype=data.dtype,
            crs=crs, transform=transform
        ) as dst:
            dst.write(data, 1)
            
    out_png = os.path.join(tmpdir, 'out.png')
    out_json = os.path.join(tmpdir, 'out.json')
    
    # Run pipeline with a 1x1 filter to avoid smoothing out our distinct 5x5 block 
    # for the exact deterministic test math.
    res = run_change_detection(
        path_a, 
        path_b, 
        threshold=3.0, 
        filter_size=1, 
        output_png=out_png, 
        output_json=out_json
    )
    
    # Math expectations:
    # Total pixels = 100
    # Changed pixels = 25 (the 5x5 block)
    # Percent changed = 25.0%
    assert res['percentChanged'] == 25.0
    
    # Affected area: 25 pixels * 1 km^2 = 25.0 km^2
    assert res['affectedAreaKm2'] == 25.0
    
    # Confidence: Mean change is 5.0. Threshold is 3.0.
    # Formula: min(100, (5.0 / 3.0) * 50) = min(100, 1.666 * 50) = min(100, 83.333) = 83.33
    assert res['confidence'] == 83.33
    
    # Assert output files were generated
    assert os.path.exists(out_png)
    assert os.path.exists(out_json)
