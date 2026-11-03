"""
python-service/test_nisar_timeseries.py

Unit tests for NISAR time series analysis and Otsu thresholding (nisar_timeseries.py).
Tests use synthetic georeferenced GeoTIFF rasters.
"""

from pathlib import Path
import pytest
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.crs import CRS

from nisar_timeseries import (
    otsu_from_counts,
    compute_pooled_histogram_and_otsu,
    compute_water_timeseries,
    generate_change_result
)


@pytest.fixture
def synthetic_timeseries_tifs(tmp_path):
    """Creates two synthetic GeoTIFFs with bimodal backscatter distribution (water vs land)."""
    tifs = []
    # 50 x 50 grid at 10m spacing in UTM Zone 46N
    transform = from_origin(500000.0, 2750000.0, 10.0, 10.0)
    crs = CRS.from_epsg(32646)

    for i, date_str in enumerate(["2026-06-23", "2026-07-05"]):
        tif_path = tmp_path / f"{date_str.replace('-', '')}_HH.tif"

        # Bimodal data with realistic normal distributions:
        # Water: -20 dB +/- 1.5 dB -> ~0.01
        # Land: -8 dB +/- 1.5 dB -> ~0.158
        np.random.seed(42 + i)
        land_db = np.random.normal(-8.0, 1.5, size=(50, 50))
        water_db = np.random.normal(-20.0, 1.5, size=(50, 50))

        db_arr = land_db.copy()
        water_size = 20 + i * 10
        db_arr[:water_size, :water_size] = water_db[:water_size, :water_size]

        data = (10.0 ** (db_arr / 10.0)).astype(np.float32)

        profile = {
            "driver": "GTiff",
            "count": 1,
            "dtype": "float32",
            "width": 50,
            "height": 50,
            "crs": crs,
            "transform": transform,
            "nodata": np.nan
        }

        with rasterio.open(tif_path, "w", **profile) as dst:
            dst.write(data, 1)
            dst.update_tags(
                source_granule=f"NISAR_TEST_{date_str}",
                polarization="HHHH",
                units="linear power (gamma0)",
                data_maturity="PROVISIONAL",
                crid="P05023"
            )

        tifs.append({
            "date": date_str,
            "granule_id": f"NISAR_TEST_{date_str}",
            "hh_path": str(tif_path)
        })

    return tifs


def test_pooled_histogram_and_otsu(synthetic_timeseries_tifs):
    hh_paths = [Path(rec["hh_path"]) for rec in synthetic_timeseries_tifs]
    bin_centers, total_counts, otsu_th, eta, is_bimodal, diag = compute_pooled_histogram_and_otsu(
        hh_paths, min_db=-30.0, max_db=5.0, bin_width=0.25
    )

    assert len(bin_centers) == len(total_counts)
    # Otsu threshold should cleanly split -20 dB (water) and -8.2 dB (land)
    assert -18.0 <= otsu_th <= -10.0
    assert eta >= 0.40
    assert is_bimodal is True
    assert diag["total_valid_pixels"] == 5000  # 2 rasters * 2500 pixels


def test_compute_water_timeseries(synthetic_timeseries_tifs):
    res = compute_water_timeseries(
        synthetic_timeseries_tifs,
        default_threshold=-15.0,
        sweep_offsets=[-2.0, 0.0, 2.0],
        min_pixels=5,
        filter_size=3
    )

    assert res["aoiId"] == "nisar-hakaluki-2026"
    assert res["thresholdValueDb"] == -15.0
    assert len(res["records"]) == 2

    rec0 = res["records"][0]
    rec1 = res["records"][1]
    # Date 2 had larger water area
    assert rec1["waterAreaKm2"] > rec0["waterAreaKm2"]
    assert rec0["minAreaKm2"] <= rec0["waterAreaKm2"] <= rec0["maxAreaKm2"]


def test_generate_change_result(synthetic_timeseries_tifs, tmp_path):
    out_dir = tmp_path / "precomputed"
    out_sens = tmp_path / "sens.json"

    res = generate_change_result(
        date_a_rec=synthetic_timeseries_tifs[0],
        date_b_rec=synthetic_timeseries_tifs[1],
        default_threshold=-15.0,
        sweep_offsets=[-2.0, -1.0, 0.0, 1.0, 2.0],
        out_precomputed_dir=out_dir,
        out_sensitivity_path=out_sens,
        min_pixels=5,
        filter_size=3
    )

    assert (out_dir / "result.json").exists()
    assert (out_dir / "change-map.png").exists()
    assert (out_dir / "before.png").exists()
    assert (out_dir / "after.png").exists()
    assert out_sens.exists()

    assert res["aoiId"] == "nisar-hakaluki-2026"
    assert "categories" in res
    assert "metrics" in res


def test_otsu_synthetic_two_gaussians():
    """
    Step 2a unit test: Synthetic mixture of two Gaussians with known means.
    Verifies that the recovered Otsu threshold lies strictly between the means
    and 0.0 <= eta <= 1.0.
    """
    bin_edges = np.arange(-30.0, 5.25, 0.25)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2.0

    mean_water = -20.0
    mean_land = -8.0
    np.random.seed(42)
    sample_water = np.random.normal(mean_water, 1.5, size=20000)
    sample_land = np.random.normal(mean_land, 1.5, size=20000)
    mixture = np.concatenate([sample_water, sample_land])

    counts, _ = np.histogram(mixture, bins=bin_edges)
    threshold, sigma_b_sq, sigma_t_sq, eta = otsu_from_counts(bin_centers, counts)

    # Threshold must lie strictly between the two component means
    assert mean_water < threshold < mean_land
    # Inter-class variance ratio must strictly satisfy 0 <= eta <= 1
    assert 0.0 <= eta <= 1.0
    # For well-separated modes, eta should be substantial (>= 0.70)
    assert eta >= 0.70
    assert sigma_b_sq <= sigma_t_sq


def test_otsu_unimodal_vs_bimodal_eta():
    """
    Step 2a unit test: Verifies that eta of a unimodal sample is clearly lower
    than eta of a well-separated bimodal sample.
    """
    bin_edges = np.arange(-30.0, 5.25, 0.25)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2.0

    np.random.seed(123)
    # 1. Unimodal sample: single broad Gaussian
    unimodal_sample = np.random.normal(-14.0, 3.5, size=40000)
    counts_uni, _ = np.histogram(unimodal_sample, bins=bin_edges)
    th_uni, _, _, eta_uni = otsu_from_counts(bin_centers, counts_uni)

    # 2. Well-separated bimodal sample: two distinct narrow modes
    mode1 = np.random.normal(-22.0, 1.0, size=20000)
    mode2 = np.random.normal(-6.0, 1.0, size=20000)
    bimodal_sample = np.concatenate([mode1, mode2])
    counts_bi, _ = np.histogram(bimodal_sample, bins=bin_edges)
    th_bi, _, _, eta_bi = otsu_from_counts(bin_centers, counts_bi)

    assert 0.0 <= eta_uni <= 1.0
    assert 0.0 <= eta_bi <= 1.0
    # Bimodal eta must be substantially higher than unimodal eta
    assert eta_bi - eta_uni > 0.20
    assert eta_bi >= 0.90

