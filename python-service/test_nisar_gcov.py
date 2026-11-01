"""
python-service/test_nisar_gcov.py

Unit tests for NISAR GCOV HDF5 to GeoTIFF conversion tool (python-service/nisar_gcov.py).
Tests use synthetic HDF5 structures constructed strictly according to the official NISAR GCOV specification.
"""

import tempfile
from pathlib import Path
import pytest

# Skip this entire test module if h5py is not installed
h5py = pytest.importorskip("h5py")

import numpy as np
import rasterio
from nisar_gcov import (
    gcov_to_geotiff,
    DB_FLOOR_LINEAR,
    extract_crid,
    extract_data_maturity,
    open_h5_source
)

@pytest.fixture
def synthetic_nisar_h5(tmp_path):
    """Creates a miniature synthetic NISAR GCOV HDF5 file matching official schema."""
    h5_file = tmp_path / "NISAR_L2_PR_GCOV_023_141_A_014_4005_DHDH_A_20260623T231316_20260623T231350_P05023_N_F_J_001.h5"
    
    # 20 rows x 20 cols grid at 10m resolution in UTM Zone 46N (EPSG:32646)
    x_coords = np.linspace(500000.0, 500190.0, 20)  # dx = 10m
    y_coords = np.linspace(2750190.0, 2750000.0, 20) # dy = -10m
    
    # Linear gamma0 power values (e.g., 0.001 to 0.5)
    data = np.full((20, 20), 0.05, dtype=np.float32)
    data[0:5, 0:5] = 0.01   # water-like low backscatter (-20 dB)
    data[5:10, 5:10] = 0.25 # vegetation-like backscatter (-6 dB)
    data[15, 15] = np.nan   # nodata
    data[16, 16] = -9999.0  # custom fill value

    with h5py.File(h5_file, "w") as f:
        grid_grp = f.create_group("/science/LSAR/GCOV/grids/frequencyA")
        
        # Projection dataset with EPSG attribute
        proj_ds = grid_grp.create_dataset("projection", data=32646)
        proj_ds.attrs["epsg"] = 32646
        proj_ds.attrs["grid_mapping_name"] = "transverse_mercator"
        
        # Coordinate arrays
        grid_grp.create_dataset("xCoordinates", data=x_coords)
        grid_grp.create_dataset("yCoordinates", data=y_coords)
        
        # HHHH dataset
        ds = grid_grp.create_dataset("HHHH", data=data)
        ds.attrs["_FillValue"] = -9999.0
        ds.attrs["units"] = "dimensionless"
        
        # HVHV dataset
        grid_grp.create_dataset("HVHV", data=data * 0.1)

    return h5_file

def test_full_extraction_linear(synthetic_nisar_h5, tmp_path):
    out_tif = tmp_path / "full_linear.tif"
    result = gcov_to_geotiff(
        h5_path=synthetic_nisar_h5,
        bbox=None,
        polarization="HH",
        out_path=out_tif,
        to_db=False
    )
    assert Path(result).exists()
    
    with rasterio.open(out_tif) as src:
        assert src.count == 1
        assert src.shape == (20, 20)
        assert src.crs.to_epsg() == 32646
        tags = src.tags()
        assert tags["polarization"] == "HHHH"
        assert tags["units"] == "linear power (gamma0)"
        assert tags["data_maturity"] == "PROVISIONAL"
        
        arr = src.read(1)
        # Nodata handling
        assert np.isnan(arr[15, 15])
        assert np.isnan(arr[16, 16]) # -9999 masked to NaN
        assert np.isclose(arr[0, 0], 0.01)

def test_cropped_extraction_db(synthetic_nisar_h5, tmp_path):
    out_tif = tmp_path / "crop_db.tif"
    # Crop subwindow: x in [500000, 500050], y in [2750140, 2750190]
    bbox = [500000.0, 2750140.0, 500050.0, 2750190.0]
    
    result = gcov_to_geotiff(
        h5_path=synthetic_nisar_h5,
        bbox=bbox,
        polarization="HHHH",
        out_path=out_tif,
        to_db=True
    )
    assert Path(result).exists()
    
    with rasterio.open(out_tif) as src:
        assert src.crs.to_epsg() == 32646
        tags = src.tags()
        assert tags["units"] == "dB"
        
        arr = src.read(1)
        assert arr.shape[0] < 20 and arr.shape[1] < 20
        # 0.01 in dB is 10 * log10(0.01) = -20.0 dB
        assert np.isclose(arr[0, 0], -20.0, atol=0.1)

def test_missing_polarization_raises(synthetic_nisar_h5, tmp_path):
    out_tif = tmp_path / "invalid.tif"
    with pytest.raises(KeyError, match="not found"):
        gcov_to_geotiff(
            h5_path=synthetic_nisar_h5,
            bbox=None,
            polarization="VVVV",
            out_path=out_tif
        )


def test_extract_crid_and_maturity():
    name = "NISAR_L2_PR_GCOV_023_141_A_014_4005_DHDH_A_20260623T231316_20260623T231350_P05023_N_F_J_001.h5"
    assert extract_crid(name) == "P05023"
    assert extract_data_maturity(name) == "PROVISIONAL"

    beta_name = "NISAR_L2_BETA_GCOV_023_141_A_014_4005_DHDH_A_20260623T231316_20260623T231350_X05023_N_F_J_001.h5"
    assert extract_crid(beta_name) == "X05023"
    assert extract_data_maturity(beta_name) == "BETA"


def test_max_size_capping(synthetic_nisar_h5, tmp_path):
    out_tif = tmp_path / "capped.tif"
    # Full dataset is 20x20. Default keeps full size
    gcov_to_geotiff(
        h5_path=synthetic_nisar_h5,
        bbox=None,
        polarization="HH",
        out_path=out_tif,
        to_db=False
    )
    with rasterio.open(out_tif) as src:
        assert src.shape == (20, 20)

    # With bbox covering 10x10, capped at max_size=4
    bbox = [500000.0, 2750090.0, 500100.0, 2750190.0]
    out_tif_capped = tmp_path / "capped_sub.tif"
    gcov_to_geotiff(
        h5_path=synthetic_nisar_h5,
        bbox=bbox,
        polarization="HH",
        out_path=out_tif_capped,
        to_db=False,
        max_size=4
    )
    with rasterio.open(out_tif_capped) as src:
        assert src.shape == (4, 4)
        assert src.tags()["crid"] == "P05023"
        assert src.tags()["data_maturity"] == "PROVISIONAL"


def test_open_h5_source_context(synthetic_nisar_h5):
    with open_h5_source(synthetic_nisar_h5) as (h5, name):
        assert name.endswith(".h5")
        assert "/science/LSAR/GCOV/grids/frequencyA" in h5
