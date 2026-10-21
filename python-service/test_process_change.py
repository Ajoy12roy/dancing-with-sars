import os
import numpy as np
import pytest
from rasterio.transform import from_origin
from rasterio.crs import CRS
from affine import Affine
import rasterio
from PIL import Image

from process_change import (
    run_change_detection, 
    to_db, 
    calculate_pixel_area_km2,
    get_band_and_polarization,
    compute_water_mask,
    compute_water_transition,
    filter_small_components,
    export_grayscale_png
)

def test_to_db_conversion():
    """Verify linear vs dB scale detection and conversion."""
    db_data = np.array([100.0, 10.0, 1.0, 0.1, -1.0])
    res_db = to_db(db_data)
    np.testing.assert_array_equal(res_db, db_data)
    
    linear_data = np.array([100.0, 10.0, 1.0, 0.1, np.nan])
    res_linear = to_db(linear_data)
    expected = np.array([20.0, 10.0, 0.0, -10.0, np.nan])
    np.testing.assert_allclose(res_linear, expected, atol=1e-5, rtol=1e-5)

def test_db_detection_automatic():
    sar_db = np.array([[-18.5, -22.0, -12.0], [-35.0, 2.5, -16.0]], dtype=np.float32)
    res_sar = to_db(sar_db)
    np.testing.assert_array_equal(res_sar, sar_db)

    linear_power = np.array([[0.01, 0.1], [1.0, 0.001]], dtype=np.float32)
    res_linear = to_db(linear_power)
    expected_db = np.array([[-20.0, -10.0], [0.0, -30.0]], dtype=np.float32)
    np.testing.assert_allclose(res_linear, expected_db, atol=1e-4)

    with_nodata = np.array([[-15.0, -9999.0], [np.inf, -25.0]], dtype=np.float32)
    res_nodata = to_db(with_nodata, nodata=-9999.0)
    assert np.isnan(res_nodata[0, 1])
    assert np.isnan(res_nodata[1, 0])
    assert res_nodata[0, 0] == -15.0
    assert res_nodata[1, 1] == -25.0

def test_pixel_area_equator_1deg():
    transform_equator = Affine.translation(0, 1) @ Affine.scale(1.0, -1.0)
    crs_geo = CRS.from_epsg(4326)
    area_equator_km2 = calculate_pixel_area_km2(transform_equator, crs_geo, center_lat=0.0)

    assert 12290.0 <= area_equator_km2 <= 12320.0
    assert pytest.approx(area_equator_km2, abs=15.0) == 12308.9

    area_60deg_km2 = calculate_pixel_area_km2(transform_equator, crs_geo, center_lat=60.0)
    assert pytest.approx(area_60deg_km2, rel=1e-3) == (area_equator_km2 * 0.5)

    transform_utm = Affine.translation(500000, 4000000) @ Affine.scale(500.0, -500.0)
    crs_utm = CRS.from_epsg(32631)
    area_utm_km2 = calculate_pixel_area_km2(transform_utm, crs_utm)
    assert pytest.approx(area_utm_km2, abs=1e-5) == 0.25

def test_band_selection(tmpdir):
    transform = Affine.translation(0, 10) @ Affine.scale(1, -1)
    crs = CRS.from_epsg(4326)

    p2 = os.path.join(tmpdir, 'two_band.tif')
    with rasterio.open(
        p2, 'w', driver='GTiff',
        height=10, width=10, count=2, dtype=np.float32,
        crs=crs, transform=transform
    ) as dst:
        dst.write(np.full((10, 10), -15.0, dtype=np.float32), 1)
        dst.write(np.full((10, 10), -22.0, dtype=np.float32), 2)

    with rasterio.open(p2) as src:
        b_vv, p_vv = get_band_and_polarization(src, requested_polarization="VV")
        assert (b_vv, p_vv) == (1, "VV")
        b_vh, p_vh = get_band_and_polarization(src, requested_polarization="VH")
        assert (b_vh, p_vh) == (2, "VH")

    p1 = os.path.join(tmpdir, 'one_band.tif')
    with rasterio.open(
        p1, 'w', driver='GTiff',
        height=10, width=10, count=1, dtype=np.float32,
        crs=crs, transform=transform
    ) as dst:
        dst.write(np.full((10, 10), -15.0, dtype=np.float32), 1)

    with rasterio.open(p1) as src:
        b_vv, p_vv = get_band_and_polarization(src, requested_polarization="VV")
        assert (b_vv, p_vv) == (1, "VV")
        b_vh, p_vh = get_band_and_polarization(src, requested_polarization="VH")
        assert (b_vh, p_vh) == (1, "VV")

def test_water_mask_and_noise_removal():
    band_db = np.full((10, 10), -10.0, dtype=np.float32)
    band_db[1:6, 1:6] = -20.0
    band_db[7:9, 7:9] = -22.0
    band_db[0, 9] = -25.0

    mask = compute_water_mask(band_db, polarization="VV", water_threshold=-16.0, min_pixels=20, filter_size=1)

    assert mask.dtype == np.uint8
    assert np.sum(mask == 1) == 25
    assert np.sum(mask == 0) == 75
    assert np.all(mask[1:6, 1:6] == 1)
    assert np.all(mask[7:9, 7:9] == 0)
    assert mask[0, 9] == 0

def test_water_transition():
    mask_a = np.array([
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0]
    ], dtype=np.uint8)

    mask_b = np.array([
        [1, 1, 1, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ], dtype=np.uint8)

    transition = compute_water_transition(mask_a, mask_b)

    assert transition.dtype == np.uint8
    assert np.sum(transition == 0) == 8
    assert np.sum(transition == 1) == 4
    assert np.sum(transition == 2) == 2
    assert np.sum(transition == 3) == 2
    assert transition.size == 16

def test_mode_flood(tmpdir):
    """
    Test 'flood' mode:
    10x10 raster, UTM 1000m x 1000m pixels (1 pixel = 1 km^2).
    Image A: 10 pixels water (-20 dB), 90 pixels land (-10 dB).
    Image B: 10 persistent water + 25 new water pixels (-20 dB).
    Hand-computed:
      flooded area = 25.0 km^2
      persistent water = 10.0 km^2
      percentChanged = 25.0%
    """
    transform = Affine.translation(0, 10000) @ Affine.scale(1000, -1000)
    crs = CRS.from_epsg(32631)

    data_a = np.full((10, 10), -10.0, dtype=np.float32)
    data_a[0:2, 0:5] = -20.0  # 10 water pixels

    data_b = np.full((10, 10), -10.0, dtype=np.float32)
    data_b[0:2, 0:5] = -20.0  # 10 persistent water
    data_b[3:8, 3:8] = -20.0  # 25 new water pixels

    p_a = os.path.join(tmpdir, 'flood_a.tif')
    p_b = os.path.join(tmpdir, 'flood_b.tif')
    for path, d in [(p_a, data_a), (p_b, data_b)]:
        with rasterio.open(path, 'w', driver='GTiff', height=10, width=10, count=1, dtype=np.float32, crs=crs, transform=transform) as dst:
            dst.write(d, 1)

    out_png = os.path.join(tmpdir, 'flood.png')
    out_json = os.path.join(tmpdir, 'flood.json')

    res = run_change_detection(
        p_a, p_b,
        mode="flood",
        filter_size=1,
        water_threshold=-16.0,
        min_pixels=1,
        output_png=out_png,
        output_json=out_json
    )

    assert res['mode'] == 'flood'
    assert res['affectedAreaKm2'] == 25.0
    assert res['metrics']['floodedAreaKm2'] == 25.0
    assert res['metrics']['persistentWaterKm2'] == 10.0
    assert res['metrics']['recededWaterKm2'] == 0.0
    assert res['percentChanged'] == 25.0
    assert res['totalAreaKm2'] == 100.0
    assert len(res['categories']) == 3
    assert os.path.exists(out_png)
    assert os.path.exists(out_json)

def test_mode_surface_water(tmpdir):
    """
    Test 'surface-water' mode:
    10x10 raster, 1 km^2 per pixel.
    Image A: 20 pixels water.
    Image B: 10 persistent, 10 lost, 15 new.
    Hand-computed:
      waterAreaAKm2 = 20.0 km^2
      waterAreaBKm2 = 25.0 km^2
      waterDeltaKm2 = 5.0 km^2
      waterDeltaPercent = 25.0%
      affectedAreaKm2 = 15 + 10 = 25.0 km^2
    """
    transform = Affine.translation(0, 10000) @ Affine.scale(1000, -1000)
    crs = CRS.from_epsg(32631)

    data_a = np.full((10, 10), -10.0, dtype=np.float32)
    data_a[0:4, 0:5] = -20.0  # 20 water pixels

    data_b = np.full((10, 10), -10.0, dtype=np.float32)
    data_b[0:2, 0:5] = -20.0  # 10 persistent
    data_b[4:7, 0:5] = -20.0  # 15 new water

    p_a = os.path.join(tmpdir, 'sw_a.tif')
    p_b = os.path.join(tmpdir, 'sw_b.tif')
    for path, d in [(p_a, data_a), (p_b, data_b)]:
        with rasterio.open(path, 'w', driver='GTiff', height=10, width=10, count=1, dtype=np.float32, crs=crs, transform=transform) as dst:
            dst.write(d, 1)

    res = run_change_detection(p_a, p_b, mode="surface-water", filter_size=1, water_threshold=-16.0, min_pixels=1)

    assert res['mode'] == 'surface-water'
    assert res['metrics']['waterAreaAKm2'] == 20.0
    assert res['metrics']['waterAreaBKm2'] == 25.0
    assert res['metrics']['waterDeltaKm2'] == 5.0
    assert res['metrics']['waterDeltaPercent'] == 25.0
    assert res['affectedAreaKm2'] == 25.0
    assert res['metrics']['newWaterKm2'] == 15.0
    assert res['metrics']['lostWaterKm2'] == 10.0
    assert res['metrics']['persistentWaterKm2'] == 10.0

def test_mode_river_erosion(tmpdir):
    """
    Test 'river-erosion' mode:
    River is col 5 (10 pixels, 10 km^2).
    Buffer = 2 pixels.
    Erosion: (2, 4) is adjacent to river (1 km^2).
    Accretion: (5, 6) is adjacent to river (1 km^2).
    Other new water: (0, 0) is distant (1 km^2).
    Other lost water: (9, 0) is distant (1 km^2).
    Dates: 2022-01-01 to 2024-01-01 (730 days).
    """
    transform = Affine.translation(0, 10000) @ Affine.scale(1000, -1000)
    crs = CRS.from_epsg(32631)

    data_a = np.full((10, 10), -10.0, dtype=np.float32)
    data_a[:, 5] = -20.0   # River
    data_a[5, 6] = -20.0   # Accretion candidate (water in A)
    data_a[9, 0] = -20.0   # Distant lost water

    data_b = np.full((10, 10), -10.0, dtype=np.float32)
    data_b[:, 5] = -20.0   # Persistent River
    data_b[2, 4] = -20.0   # Erosion (new water adjacent to river)
    data_b[0, 0] = -20.0   # Distant new water

    p_a = os.path.join(tmpdir, 'river_a.tif')
    p_b = os.path.join(tmpdir, 'river_b.tif')
    for path, d in [(p_a, data_a), (p_b, data_b)]:
        with rasterio.open(path, 'w', driver='GTiff', height=10, width=10, count=1, dtype=np.float32, crs=crs, transform=transform) as dst:
            dst.write(d, 1)

    res = run_change_detection(
        p_a, p_b,
        mode="river-erosion",
        filter_size=1,
        water_threshold=-16.0,
        min_pixels=1,
        river_buffer=2,
        date_a="2022-01-01",
        date_b="2024-01-01"
    )

    assert res['mode'] == 'river-erosion'
    assert res['metrics']['erosionAreaKm2'] == 1.0
    assert res['metrics']['accretionAreaKm2'] == 1.0
    assert res['metrics']['netLandChangeKm2'] == 0.0
    assert res['metrics']['riverAreaKm2'] == 10.0
    assert res['metrics']['otherNewWaterAreaKm2'] == 1.0
    assert res['metrics']['otherLostWaterAreaKm2'] == 1.0
    assert res['affectedAreaKm2'] == 1.0
    assert res['dates']['days'] == 730
    assert pytest.approx(res['metrics']['erosionRateKm2PerYear'], abs=1e-3) == (1.0 / (730 / 365.25))
    assert res['categories'][0]['id'] == 'erosion'
    assert res['categories'][0]['label'] == 'Bank erosion (land-to-water near channel)'
    assert any("Erosion is estimated as land-to-water change" in w for w in res['warnings'])

def test_mode_deforestation(tmpdir):
    """
    Test 'deforestation' mode:
    2-band raster: band 1 = VV (-15 dB), band 2 = VH (-15 dB).
    Deforestation mode automatically selects band 2 (VH).
    Image A: VH = -15 dB everywhere.
    Image B: 20 pixels drop to -20 dB (diff = -5.0 dB <= -3.0 dB threshold).
             4 pixels drop to -20 dB (filtered out because < min_pixels=10).
    Hand-computed:
      forestLossKm2 = 20.0 km^2
    """
    transform = Affine.translation(0, 10000) @ Affine.scale(1000, -1000)
    crs = CRS.from_epsg(32631)

    data_a = np.full((10, 10), -15.0, dtype=np.float32)
    data_b = np.full((10, 10), -15.0, dtype=np.float32)
    data_b[1:5, 1:6] = -20.0  # 4x5 = 20 pixels loss
    data_b[7:9, 7:9] = -20.0  # 2x2 = 4 pixels noise

    p_a = os.path.join(tmpdir, 'defor_a.tif')
    p_b = os.path.join(tmpdir, 'defor_b.tif')

    for path, d in [(p_a, data_a), (p_b, data_b)]:
        with rasterio.open(path, 'w', driver='GTiff', height=10, width=10, count=2, dtype=np.float32, crs=crs, transform=transform) as dst:
            dst.write(np.full((10, 10), -12.0, dtype=np.float32), 1)  # VV
            dst.write(d, 2)  # VH

    res = run_change_detection(
        p_a, p_b,
        mode="deforestation",
        filter_size=1,
        loss_threshold_db=-3.0,
        min_pixels=10
    )

    assert res['mode'] == 'deforestation'
    assert res['band'] == 2
    assert res['polarization'] == 'VH'
    assert res['affectedAreaKm2'] == 20.0
    assert res['metrics']['forestLossKm2'] == 20.0
    assert res['percentChanged'] == 20.0
    assert len(res['warnings']) == 0

    # Test single band fallback warning
    p_single = os.path.join(tmpdir, 'single_band.tif')
    with rasterio.open(p_single, 'w', driver='GTiff', height=10, width=10, count=1, dtype=np.float32, crs=crs, transform=transform) as dst:
        dst.write(data_a, 1)

    res_single = run_change_detection(p_single, p_single, mode="deforestation", filter_size=1)
    assert res_single['polarization'] == 'VV'
    assert len(res_single['warnings']) > 0
    assert "VV-only input" in res_single['warnings'][0]

def test_run_change_detection(tmpdir):
    """
    Test generic change detection mode.
    """
    data_a = np.full((10, 10), -10.0, dtype=np.float32)
    data_b = np.full((10, 10), -10.0, dtype=np.float32)
    data_b[2:7, 2:7] = -5.0

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

    res = run_change_detection(
        path_a, 
        path_b, 
        threshold=3.0, 
        filter_size=1, 
        output_png=out_png, 
        output_json=out_json,
        mode="change"
    )

    assert res['percentChanged'] == 25.0
    assert res['affectedAreaKm2'] == 25.0
    assert res['confidence'] == 83.33
    assert os.path.exists(out_png)
    assert os.path.exists(out_json)

def test_export_grayscale_png(tmpdir):
    test_data = np.array([[-30.0, -25.0], [-12.5, 0.0], [5.0, np.nan]], dtype=np.float32)
    out_path = os.path.join(tmpdir, 'norm_test.png')
    export_grayscale_png(test_data, out_path, min_db=-25.0, max_db=0.0)

    assert os.path.exists(out_path)
    with Image.open(out_path) as img:
        assert img.mode == 'L'
        arr = np.array(img)
        assert arr[0, 0] == 0
        assert arr[0, 1] == 0
        assert arr[1, 0] == 127
        assert arr[1, 1] == 255
        assert arr[2, 0] == 255
        assert arr[2, 1] == 0

    wide_data = np.full((1000, 2000), -15.0, dtype=np.float32)
    wide_out = os.path.join(tmpdir, 'wide_test.png')
    export_grayscale_png(wide_data, wide_out, max_width=1600)

    with Image.open(wide_out) as img:
        assert img.width == 1600
        assert img.height == 800
        assert img.mode == 'L'

    normal_data = np.full((600, 800), -15.0, dtype=np.float32)
    normal_out = os.path.join(tmpdir, 'normal_test.png')
    export_grayscale_png(normal_data, normal_out, max_width=1600)

    with Image.open(normal_out) as img:
        assert img.width == 800
        assert img.height == 600
        assert img.mode == 'L'

def test_run_change_detection_with_before_after(tmpdir):
    data_a = np.full((10, 10), -20.0, dtype=np.float32)
    data_b = np.full((10, 10), -5.0, dtype=np.float32)

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

    out_png = os.path.join(tmpdir, 'change-map.png')
    out_json = os.path.join(tmpdir, 'result.json')
    before_png = os.path.join(tmpdir, 'before.png')
    after_png = os.path.join(tmpdir, 'after.png')

    res = run_change_detection(
        path_a,
        path_b,
        output_png=out_png,
        output_json=out_json,
        output_before_png=before_png,
        output_after_png=after_png,
        mode="change"
    )

    assert os.path.exists(before_png)
    assert os.path.exists(after_png)
    assert os.path.exists(out_png)
    assert os.path.exists(out_json)

    with Image.open(before_png) as img_a:
        assert img_a.mode == 'L'
        assert img_a.size == (10, 10)

    with Image.open(after_png) as img_b:
        assert img_b.mode == 'L'
        assert img_b.size == (10, 10)

def test_previews_regenerated_on_second_run(tmpdir):
    """
    Verify before.png and after.png are regenerated on a second run,
    not skipped when existing.
    """
    path_a = os.path.join(tmpdir, 'img_a.tif')
    path_b = os.path.join(tmpdir, 'img_b.tif')
    transform = Affine.translation(0, 10) @ Affine.scale(1, -1)
    crs = CRS.from_epsg(4326)

    # First run: initial images at -20 dB
    data_1 = np.full((10, 10), -20.0, dtype=np.float32)
    for p in [path_a, path_b]:
        with rasterio.open(p, 'w', driver='GTiff', height=10, width=10, count=1, dtype=np.float32, crs=crs, transform=transform) as dst:
            dst.write(data_1, 1)

    before_png = os.path.join(tmpdir, 'before.png')
    after_png = os.path.join(tmpdir, 'after.png')

    run_change_detection(path_a, path_b, output_before_png=before_png, output_after_png=after_png)
    with Image.open(before_png) as img:
        val_first = np.array(img)[0, 0]

    # Second run: update GeoTIFFs to completely different value (0.0 dB)
    data_2 = np.full((10, 10), 0.0, dtype=np.float32)
    for p in [path_a, path_b]:
        with rasterio.open(p, 'w', driver='GTiff', height=10, width=10, count=1, dtype=np.float32, crs=crs, transform=transform) as dst:
            dst.write(data_2, 1)

    run_change_detection(path_a, path_b, output_before_png=before_png, output_after_png=after_png)
    with Image.open(before_png) as img:
        val_second = np.array(img)[0, 0]

    assert val_first != val_second, "Preview image was not regenerated on second run!"

def test_result_json_no_stale_keys(tmpdir):
    """
    Verify that result.json written by process_change contains no stale keys
    beyond the fresh result (e.g. no merged placeholder keys like chartData or old names).
    """
    import subprocess
    import json
    import sys

    input_dir = os.path.join(tmpdir, 'input')
    output_dir = os.path.join(tmpdir, 'output')
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    path_a = os.path.join(input_dir, 'image_a.tif')
    path_b = os.path.join(input_dir, 'image_b.tif')
    transform = Affine.translation(0, 10) @ Affine.scale(1, -1)
    crs = CRS.from_epsg(4326)

    data = np.full((10, 10), -15.0, dtype=np.float32)
    for p in [path_a, path_b]:
        with rasterio.open(p, 'w', driver='GTiff', height=10, width=10, count=1, dtype=np.float32, crs=crs, transform=transform) as dst:
            dst.write(data, 1)

    result_json_path = os.path.join(output_dir, 'result.json')
    # Plant a stale result.json with old leftover keys
    stale_data = {
        "chartData": [{"category": "stale", "value": 999}],
        "name": "Old Placeholder Name",
        "dateBefore": "1999-01-01",
        "stale_custom_key": "should_be_gone"
    }
    with open(result_json_path, 'w') as f:
        json.dump(stale_data, f)

    script_path = os.path.join(os.path.dirname(__file__), 'process_change.py')
    cmd = [
        sys.executable, script_path,
        '--aoi', 'test_aoi',
        '--input-dir', input_dir,
        '--output-dir', output_dir,
        '--mode', 'flood'
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    assert res.returncode == 0, f"CLI failed: {res.stderr}"

    with open(result_json_path, 'r') as f:
        fresh_json = json.load(f)

    # Verify stale keys were NOT merged
    assert 'chartData' not in fresh_json
    assert 'name' not in fresh_json
    assert 'dateBefore' not in fresh_json
    assert 'stale_custom_key' not in fresh_json

    # Verify no duplicate files written
    assert not os.path.exists(os.path.join(output_dir, 'test_aoi_stats.json'))
    assert not os.path.exists(os.path.join(output_dir, 'test_aoi_change_map.png'))

    # Verify fresh keys
    assert fresh_json['mode'] == 'flood'
    assert fresh_json['changeMapUrl'] == 'change-map.png'
    assert fresh_json['aoiId'] == 'test_aoi'

def test_river_erosion_warning_always_present(tmpdir):
    """
    Verify that river-erosion mode always includes honest label and warning.
    """
    path_a = os.path.join(tmpdir, 'img_a.tif')
    path_b = os.path.join(tmpdir, 'img_b.tif')
    transform = Affine.translation(0, 10) @ Affine.scale(1, -1)
    crs = CRS.from_epsg(4326)

    data = np.full((10, 10), -15.0, dtype=np.float32)
    for p in [path_a, path_b]:
        with rasterio.open(p, 'w', driver='GTiff', height=10, width=10, count=1, dtype=np.float32, crs=crs, transform=transform) as dst:
            dst.write(data, 1)

    res = run_change_detection(path_a, path_b, mode="river-erosion")

    expected_warning = (
        "Erosion is estimated as land-to-water change connected to the persistent river channel. "
        "It also includes flow-stage differences and sandbar migration between the two dates, "
        "so it should be validated against optical imagery."
    )
    assert expected_warning in res['warnings']
    erosion_cat = next(c for c in res['categories'] if c['id'] == 'erosion')
    assert erosion_cat['label'] == 'Bank erosion (land-to-water near channel)'

