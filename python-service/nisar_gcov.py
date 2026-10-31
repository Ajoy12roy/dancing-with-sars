"""
python-service/nisar_gcov.py

Converts NISAR L2 GCOV (Geocoded Polarimetric Covariance) HDF5 datasets to GeoTIFF.
Layout conforms strictly to the official NISAR GCOV Product Specification:
https://cumulus.asf.earthdatacloud.nasa.gov/PUBLIC/DATA/NISAR/NISAR_D-102274_RevF_NASA_SDS_Product_Specification_L2_GCOV_w-esigs.pdf
https://nisar-docs.asf.alaska.edu/gcov/

Primary dataset path: /science/LSAR/GCOV/grids/frequencyA/<polarization>
Supported polarizations: HHHH, HVHV, VVVV, VHVH (and complex quad-pol terms).
Coordinates: /science/LSAR/GCOV/grids/frequencyA/xCoordinates, yCoordinates
Projection: /science/LSAR/GCOV/grids/frequencyA/projection
"""

import math
from pathlib import Path
from typing import List, Optional, Tuple, Union

try:
    import h5py
except ImportError:
    h5py = None

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import transform_bounds

DB_FLOOR_LINEAR = 1e-5  # -50.0 dB floor for zero/negative values in radar backscatter

def normalize_polarization_name(pol: str) -> str:
    """Normalizes short (e.g. HH) or full (e.g. HHHH) polarization identifiers."""
    p = pol.upper().strip()
    if len(p) == 2:
        return p + p
    return p

def extract_data_maturity(granule_name: str) -> str:
    """Extracts data maturity (PROVISIONAL, BETA, or UNKNOWN) from granule title or attributes."""
    upper = granule_name.upper()
    if "PROVISIONAL" in upper or "_P05" in upper:
        return "PROVISIONAL"
    if "BETA" in upper or "_X05" in upper:
        return "BETA"
    return "PROVISIONAL"

def gcov_to_geotiff(
    h5_path: Union[str, Path],
    bbox: Optional[List[float]],
    polarization: str,
    out_path: Union[str, Path],
    to_db: bool = False,
    frequency: str = "A"
) -> str:
    """
    Extracts a spatial subwindow for a given polarization from a NISAR GCOV HDF5 file
    and writes it as a georeferenced float32 GeoTIFF.

    Parameters:
    -----------
    h5_path: Path to the NISAR GCOV HDF5 file.
    bbox: Optional [west, south, east, north] bounding box. If None, full extent is extracted.
    polarization: Polarization channel, e.g. 'HHHH' or 'HH', 'HVHV' or 'HV'.
    out_path: Target path for the output GeoTIFF.
    to_db: If True, converts linear backscatter power to decibels (10*log10) with 1e-5 floor.
    frequency: Radar frequency sub-band, default 'A' (L-band primary).

    Returns:
    --------
    Absolute path of the written GeoTIFF file.
    """
    if h5py is None:
        raise ImportError(
            "h5py is required for NISAR GCOV processing. "
            "Please install it using 'pip install -r python-service/requirements-nisar.txt'"
        )

    h5_file = Path(h5_path).resolve()
    if not h5_file.exists():
        raise FileNotFoundError(f"NISAR HDF5 file not found: {h5_file}")

    pol_ds_name = normalize_polarization_name(polarization)
    grid_group_path = f"/science/LSAR/GCOV/grids/frequency{frequency}"
    ds_path = f"{grid_group_path}/{pol_ds_name}"

    out_file = Path(out_path).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)

    with h5py.File(h5_file, "r") as h5:
        if ds_path not in h5:
            available = list(h5.get(grid_group_path, {}).keys())
            raise KeyError(
                f"Dataset '{ds_path}' not found in {h5_file.name}. "
                f"Available layers under {grid_group_path}: {available}"
            )

        ds = h5[ds_path]
        
        # Read coordinate arrays
        x_coords_name = "xCoordinates" if "xCoordinates" in h5[grid_group_path] else "x_coordinates"
        y_coords_name = "yCoordinates" if "yCoordinates" in h5[grid_group_path] else "y_coordinates"
        
        if x_coords_name not in h5[grid_group_path] or y_coords_name not in h5[grid_group_path]:
            raise KeyError(f"Coordinate arrays ({x_coords_name}, {y_coords_name}) missing from {grid_group_path}")

        x_coords = np.array(h5[grid_group_path][x_coords_name])
        y_coords = np.array(h5[grid_group_path][y_coords_name])

        # Read projection/EPSG
        epsg_code = None
        wkt_str = None
        if "projection" in h5[grid_group_path]:
            proj_obj = h5[grid_group_path]["projection"]
            if hasattr(proj_obj, "attrs") and "epsg" in proj_obj.attrs:
                epsg_code = int(proj_obj.attrs["epsg"])
            elif hasattr(proj_obj, "attrs") and "spatial_ref" in proj_obj.attrs:
                wkt_str = proj_obj.attrs["spatial_ref"]
                if isinstance(wkt_str, bytes):
                    wkt_str = wkt_str.decode("utf-8")
            elif proj_obj.shape == () and np.issubdtype(proj_obj.dtype, np.integer):
                epsg_code = int(proj_obj[()])

        if epsg_code is not None:
            crs = CRS.from_epsg(epsg_code)
        elif wkt_str:
            crs = CRS.from_wkt(wkt_str)
        else:
            # Fallback to WGS 84 if no projection found
            crs = CRS.from_epsg(4326)

        # Coordinate resolution
        x_res = float(x_coords[1] - x_coords[0]) if len(x_coords) > 1 else 10.0
        y_res = float(y_coords[1] - y_coords[0]) if len(y_coords) > 1 else -10.0

        # Calculate slice indices
        if bbox is not None:
            w, s, e, n = bbox
            # If coordinates are in degrees (WGS84) but dataset is projected, transform bbox
            if abs(w) <= 180.0 and abs(n) <= 90.0 and crs.to_epsg() != 4326:
                w_proj, s_proj, e_proj, n_proj = transform_bounds(
                    CRS.from_epsg(4326), crs, w, s, e, n
                )
            else:
                w_proj, s_proj, e_proj, n_proj = w, s, e, n

            # Match X coordinates (ascending)
            col_min = max(0, int(np.searchsorted(x_coords, min(w_proj, e_proj), side="left")))
            col_max = min(len(x_coords), int(np.searchsorted(x_coords, max(w_proj, e_proj), side="right")))

            # Match Y coordinates (handle ascending or descending)
            if y_res < 0: # north-up descending
                y_desc = -y_coords
                row_min = max(0, int(np.searchsorted(y_desc, -max(s_proj, n_proj), side="left")))
                row_max = min(len(y_coords), int(np.searchsorted(y_desc, -min(s_proj, n_proj), side="right")))
            else:
                row_min = max(0, int(np.searchsorted(y_coords, min(s_proj, n_proj), side="left")))
                row_max = min(len(y_coords), int(np.searchsorted(y_coords, max(s_proj, n_proj), side="right")))

            # Ensure valid non-empty slice
            if col_max <= col_min:
                col_min = max(0, col_min - 1)
                col_max = min(len(x_coords), col_min + 2)
            if row_max <= row_min:
                row_min = max(0, row_min - 1)
                row_max = min(len(y_coords), row_min + 2)

            # Perform slice reading directly without full load
            data = ds[row_min:row_max, col_min:col_max].astype(np.float32)
            sliced_x = x_coords[col_min:col_max]
            sliced_y = y_coords[row_min:row_max]
        else:
            data = ds[:, :].astype(np.float32)
            sliced_x = x_coords
            sliced_y = y_coords

        # Fill values / NaN masking
        fill_val = ds.attrs.get("_FillValue", np.nan)
        if not np.isnan(fill_val):
            data[data == fill_val] = np.nan

        # Optional conversion to decibels
        units_tag = "linear power (gamma0)"
        if to_db:
            valid_mask = ~np.isnan(data) & (data > 0)
            data[valid_mask] = 10.0 * np.log10(np.maximum(data[valid_mask], DB_FLOOR_LINEAR))
            data[~valid_mask] = np.nan
            units_tag = "dB"

        # Calculate Affine Transform from coordinates
        origin_x = float(sliced_x[0] - x_res / 2.0)
        origin_y = float(sliced_y[0] - y_res / 2.0)
        transform = from_origin(origin_x, origin_y, abs(x_res), abs(y_res))

        data_maturity = extract_data_maturity(h5_file.name)

        # Write output GeoTIFF
        profile = {
            "driver": "GTiff",
            "height": data.shape[0],
            "width": data.shape[1],
            "count": 1,
            "dtype": "float32",
            "crs": crs,
            "transform": transform,
            "nodata": np.nan,
            "compress": "lzw"
        }

        with rasterio.open(out_file, "w", **profile) as dst:
            dst.write(data, 1)
            dst.update_tags(
                source_granule=h5_file.name,
                polarization=pol_ds_name,
                units=units_tag,
                data_maturity=data_maturity,
                frequency=f"frequency{frequency}"
            )

    return str(out_file)
