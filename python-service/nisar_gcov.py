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

from contextlib import contextmanager
import math
import os
from pathlib import Path
from typing import Any, List, Optional, Tuple, Union

try:
    import fsspec
except ImportError:
    fsspec = None

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
    upper = str(granule_name).upper()
    if "PROVISIONAL" in upper or "_P05" in upper or "_PR_" in upper:
        return "PROVISIONAL"
    if "BETA" in upper or "_X05" in upper:
        return "BETA"
    return "PROVISIONAL"


def extract_crid(granule_name: str) -> str:
    """Extracts Composite Release ID (CRID), e.g. P05023, from granule title or attributes."""
    upper = str(granule_name).upper()
    stem = Path(upper).stem
    parts = stem.split("_")
    for part in parts:
        if len(part) == 6 and part[0] in ("P", "X", "R") and part[1:].isdigit():
            return part
    return "UNKNOWN"


@contextmanager
def open_h5_source(source: Union[str, Path, Any]):
    """
    Context manager to safely open local paths, HTTP/HTTPS streaming URLs (via fsspec),
    or reuse open h5py File/Group objects and file-like objects.
    """
    if h5py is None:
        raise ImportError(
            "h5py is required for NISAR GCOV processing. "
            "Please install it using 'pip install -r python-service/requirements-nisar.txt'"
        )

    # Explicit tuple of (h5_obj, granule_name)
    if isinstance(source, tuple) and len(source) == 2:
        yield source[0], str(source[1])
        return

    # Already an h5py File or Group
    if isinstance(source, (h5py.File, h5py.Group)):
        granule_name = getattr(source.file, "filename", "NISAR_GCOV")
        yield source.file, Path(str(granule_name)).name
        return

    # HTTP/HTTPS Streaming URL
    str_source = str(source)
    if str_source.startswith("http://") or str_source.startswith("https://"):
        if fsspec is None:
            raise ImportError("fsspec is required for streaming HTTP NISAR reads.")
        token = os.environ.get("EARTHDATA_TOKEN", "")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        fs = fsspec.filesystem("http", headers=headers)
        f = fs.open(str_source, mode="rb", block_size=2 * 1024 * 1024, cache_type="readahead")
        granule_name = Path(str_source.split("?")[0]).name
        h5 = h5py.File(f, "r")
        try:
            yield h5, granule_name
        finally:
            h5.close()
            f.close()
        return

    # File-like object (with read & seek)
    if hasattr(source, "read") and hasattr(source, "seek"):
        granule_name = getattr(source, "name", "NISAR_GCOV")
        h5 = h5py.File(source, "r")
        try:
            yield h5, Path(str(granule_name)).name
        finally:
            h5.close()
        return

    # Local filesystem path
    h5_file = Path(source).resolve()
    if not h5_file.exists():
        raise FileNotFoundError(f"NISAR HDF5 file not found: {h5_file}")
    with h5py.File(h5_file, "r") as h5:
        yield h5, h5_file.name


def gcov_to_geotiff(
    h5_path: Union[str, Path, Any],
    bbox: Optional[List[float]],
    polarization: str,
    out_path: Union[str, Path],
    to_db: bool = False,
    frequency: str = "A",
    max_size: Optional[int] = None
) -> str:
    """
    Extracts a spatial subwindow for a given polarization from a NISAR GCOV HDF5 file (local or streamed)
    and writes it as a georeferenced float32 GeoTIFF.

    Parameters:
    -----------
    h5_path: Path, URL, or file-like object for the NISAR GCOV HDF5 file.
    bbox: Optional [west, south, east, north] bounding box. If None, full extent is extracted.
    polarization: Polarization channel, e.g. 'HHHH' or 'HH', 'HVHV' or 'HV'.
    out_path: Target path for the output GeoTIFF.
    to_db: If True, converts linear backscatter power to decibels (10*log10) with 1e-5 floor.
    frequency: Radar frequency sub-band, default 'A' (L-band primary).
    max_size: Optional maximum dimension (in pixels) to cap the extracted subwindow height and width.

    Returns:
    --------
    Absolute path of the written GeoTIFF file.
    """
    pol_ds_name = normalize_polarization_name(polarization)
    grid_group_path = f"/science/LSAR/GCOV/grids/frequency{frequency}"
    ds_path = f"{grid_group_path}/{pol_ds_name}"

    out_file = Path(out_path).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)

    with open_h5_source(h5_path) as (h5, granule_name):
        if ds_path not in h5:
            available = list(h5.get(grid_group_path, {}).keys())
            raise KeyError(
                f"Dataset '{ds_path}' not found in {granule_name}. "
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
            if hasattr(proj_obj, "attrs"):
                if "epsg_code" in proj_obj.attrs:
                    epsg_code = int(proj_obj.attrs["epsg_code"])
                elif "epsg" in proj_obj.attrs:
                    epsg_code = int(proj_obj.attrs["epsg"])
                elif "spatial_ref" in proj_obj.attrs:
                    wkt_str = proj_obj.attrs["spatial_ref"]
                    if isinstance(wkt_str, bytes):
                        wkt_str = wkt_str.decode("utf-8")
            if epsg_code is None and proj_obj.shape == () and np.issubdtype(proj_obj.dtype, np.integer):
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
            if y_res < 0:  # north-up descending
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

            if max_size is not None:
                if (col_max - col_min) > max_size:
                    col_max = col_min + max_size
                if (row_max - row_min) > max_size:
                    row_max = row_min + max_size

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

        # Calculate Affine Transform from coordinates (center pixel convention)
        origin_x = float(sliced_x[0] - x_res / 2.0)
        origin_y = float(sliced_y[0] - y_res / 2.0)
        transform = from_origin(origin_x, origin_y, abs(x_res), abs(y_res))

        data_maturity = extract_data_maturity(granule_name)
        crid = extract_crid(granule_name)

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
                source_granule=granule_name,
                polarization=pol_ds_name,
                units=units_tag,
                data_maturity=data_maturity,
                crid=crid,
                frequency=f"frequency{frequency}"
            )

    return str(out_file)
