import os
import json
import argparse
from datetime import datetime
import numpy as np
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling, transform_bounds
from rasterio.crs import CRS
from scipy.ndimage import median_filter, label, binary_dilation
from PIL import Image

MAX_PIXELS_DECIMATE = 100_000_000
DEFAULT_WATER_THRESHOLD_VV = -16.0
DEFAULT_WATER_THRESHOLD_VH = -22.0
DEFAULT_MIN_PIXELS = 20

def to_db(array, nodata=None, return_scale=False):
    """
    Detect the data scale automatically and convert to dB if needed.
    - If values are mostly negative and within roughly -50..+10 dB, the data is already in dB,
      so 10*log10 is not applied again.
    - If values are all positive (linear power), converts to dB using 10*log10.
    - Logs which scale was detected.
    - Masks nodata and non-finite values to np.nan so they are excluded from every statistic.
    """
    if np.issubdtype(array.dtype, np.floating):
        arr = array.copy()
    else:
        arr = array.astype(np.float32)

    if nodata is not None:
        arr[arr == nodata] = np.nan
    arr[~np.isfinite(arr)] = np.nan

    valid_mask = np.isfinite(arr)
    valid_vals = arr[valid_mask]

    if valid_vals.size == 0:
        print("dB detection: No finite valid values found in array.")
        return (arr, "unknown") if return_scale else arr

    min_val = float(np.min(valid_vals))
    max_val = float(np.max(valid_vals))
    neg_count = int(np.sum(valid_vals < 0))
    neg_ratio = neg_count / valid_vals.size

    is_db = False
    if neg_count > 0:
        if (neg_ratio >= 0.5 and min_val >= -60.0 and max_val <= 25.0) or (min_val < 0 and max_val <= 150.0):
            is_db = True

    if is_db:
        scale_str = "dB"
        print(f"dB detection: Detected dB scale (min={min_val:.2f}, max={max_val:.2f}, negative_fraction={neg_ratio:.2%}). Retaining dB values without conversion.")
        return (arr, scale_str) if return_scale else arr
    else:
        scale_str = "linear"
        print(f"dB detection: Detected linear power scale (min={min_val:.4f}, max={max_val:.4f}, strictly non-negative). Converting to dB using 10*log10.")
        db_arr = np.full_like(arr, np.nan, dtype=np.float32)
        pos_mask = valid_mask & (arr > 0)
        db_arr[pos_mask] = 10.0 * np.log10(arr[pos_mask])
        return (db_arr, scale_str) if return_scale else db_arr

def get_band_and_polarization(src, requested_polarization="VV", requested_band=None):
    """
    Band selection:
    If file has 2 bands, treat band 1 as VV and band 2 as VH.
    If 1 band, treat it as VV.
    Exposes which band and polarization is used.
    """
    total_bands = src.count
    if requested_band is not None:
        band = requested_band
        if total_bands >= 2:
            pol = "VV" if band == 1 else "VH"
        else:
            pol = "VV"
    elif requested_polarization is not None:
        pol_req = str(requested_polarization).upper()
        if pol_req == "VH" and total_bands >= 2:
            band = 2
            pol = "VH"
        else:
            band = 1
            pol = "VV"
    else:
        band = 1
        pol = "VV"

    print(f"Band selection: File has {total_bands} band(s). Selected band {band} ({pol}).")
    return band, pol

def calculate_pixel_area_km2(transform, crs, center_lat=None, bounds=None):
    """
    Estimate pixel area in square kilometers based on transform and CRS.
    - If CRS is geographic (degrees, e.g. EPSG:4326):
      pixel area in m^2 is (res_x_deg * 111320 * cos(lat)) * (res_y_deg * 110574)
      using raster center latitude.
      area_km2 = area_m2 / 1_000_000.0
    - If CRS is projected:
      res_x * res_y in CRS units (converted to meters if needed).
    - Never uses raw degree resolution as if it were metres.
    """
    dx = abs(transform.a)
    dy = abs(transform.e)

    is_geographic = False
    if crs:
        try:
            is_geographic = crs.is_geographic
        except Exception:
            is_geographic = False
    else:
        if dx < 1.0 and dy < 1.0:
            is_geographic = True

    if is_geographic:
        lat = 0.0
        if center_lat is not None:
            lat = center_lat
        elif bounds is not None:
            lat = (bounds.top + bounds.bottom) / 2.0
        elif abs(transform.f) <= 90.0:
            lat = transform.f

        lat_rad = np.radians(lat)
        width_m = dx * 111320.0 * np.cos(lat_rad)
        height_m = dy * 110574.0
        area_m2 = width_m * height_m
        area_km2 = area_m2 / 1_000_000.0
    else:
        unit_factor = 1.0
        if crs:
            try:
                if hasattr(crs, 'linear_units_factor'):
                    factor = crs.linear_units_factor[1]
                    if factor > 0:
                        unit_factor = factor
            except Exception:
                unit_factor = 1.0
        area_km2 = ((dx * unit_factor) * (dy * unit_factor)) / 1_000_000.0

    return float(area_km2)

def read_raster_windowed(src, band=1, max_pixels=MAX_PIXELS_DECIMATE):
    """
    Read a raster band using windowed block iteration with rasterio.
    Masks nodata pixels and non-finite values to np.nan.
    If the raster has more than max_pixels (default 100M), reads a decimated version
    (rasterio out_shape) and logs that this happened.
    """
    total_pixels = src.height * src.width
    if total_pixels > max_pixels:
        scale = np.sqrt(total_pixels / float(max_pixels))
        out_h = int(round(src.height / scale))
        out_w = int(round(src.width / scale))
        print(f"Decimation: Raster has {total_pixels:,} pixels (> {max_pixels:,}). Reading decimated version ({out_h} x {out_w}).")
        data = src.read(band, out_shape=(out_h, out_w), resampling=Resampling.bilinear).astype(np.float32)
        if src.nodata is not None:
            data[data == src.nodata] = np.nan
        data[~np.isfinite(data)] = np.nan
        return data

    data = np.empty((src.height, src.width), dtype=np.float32)
    for _, window in src.block_windows(band):
        block = src.read(band, window=window).astype(np.float32)
        if src.nodata is not None:
            block[block == src.nodata] = np.nan
        row_slice = slice(int(window.row_off), int(window.row_off + window.height))
        col_slice = slice(int(window.col_off), int(window.col_off + window.width))
        data[row_slice, col_slice] = block
    data[~np.isfinite(data)] = np.nan
    return data

def filter_small_components(mask: np.ndarray, min_pixels: int = 20) -> np.ndarray:
    """
    Remove connected components in binary mask smaller than min_pixels using scipy.ndimage.label.
    mask: uint8 array where 1 = target, 0 = background (or bool array).
    Returns uint8 array of same shape.
    """
    if min_pixels <= 1:
        return mask.astype(np.uint8)

    structure = np.ones((3, 3), dtype=np.uint8)
    labeled, num_features = label(mask, structure=structure)
    if num_features == 0:
        return mask.astype(np.uint8)

    component_sizes = np.bincount(labeled.ravel())
    too_small = component_sizes < min_pixels
    too_small[0] = False  # Keep background label 0

    clean_mask = mask.astype(np.uint8, copy=True)
    clean_mask[too_small[labeled]] = 0
    return clean_mask

def compute_water_mask(
    band_db: np.ndarray,
    polarization: str = "VV",
    water_threshold: float = None,
    min_pixels: int = 20,
    filter_size: int = 5
) -> np.ndarray:
    """
    Water mask function:
    1. After median filter, water = band_dB < water_threshold.
       Defaults: VV -16 dB, VH -22 dB.
    2. Drops connected components smaller than min_pixels (default 20) using scipy.ndimage.label.
    3. Stored as uint8 array only (1 = water, 0 = non-water).
    """
    if water_threshold is None:
        threshold = -22.0 if str(polarization).upper() == "VH" else -16.0
    else:
        threshold = float(water_threshold)

    valid_mask = np.isfinite(band_db)

    if filter_size > 1:
        filled = np.nan_to_num(band_db, nan=0.0)
        filtered = median_filter(filled, size=filter_size)
    else:
        filtered = band_db

    raw_water = ((filtered < threshold) & valid_mask).astype(np.uint8)
    water_mask = filter_small_components(raw_water, min_pixels=min_pixels)
    return water_mask

def compute_water_transition(mask_a: np.ndarray, mask_b: np.ndarray) -> np.ndarray:
    """
    Transition function:
    Given water mask A and water mask B, returns a uint8 class raster:
      0 = land in both (0 -> 0)
      1 = persistent water (1 -> 1)
      2 = new water (land to water: 0 -> 1)
      3 = lost water (water to land: 1 -> 0)
    """
    if mask_a.shape != mask_b.shape:
        raise ValueError(f"Mask shapes must match: {mask_a.shape} vs {mask_b.shape}")

    a = mask_a.astype(bool)
    b = mask_b.astype(bool)

    transition = np.zeros(mask_a.shape, dtype=np.uint8)
    transition[a & b] = 1       # Persistent water
    transition[(~a) & b] = 2    # New water (land to water)
    transition[a & (~b)] = 3    # Lost water (water to land)
    # (~a) & (~b) is already 0  # Land in both

    return transition

def reproject_and_downscale_to_epsg4326(
    arr, 
    src_transform, 
    src_crs, 
    src_bounds, 
    max_width=2000, 
    resampling=Resampling.nearest
):
    """
    Reproject 2D array to EPSG:4326 using nearest-neighbour resampling,
    limiting output width to max_width.
    """
    h, w = arr.shape
    is_4326 = False
    if src_crs:
        try:
            is_4326 = (src_crs.to_epsg() == 4326)
        except Exception:
            pass

    if is_4326 or src_crs is None or src_bounds is None or src_transform is None:
        if w > max_width:
            img = Image.fromarray(arr)
            new_w = max_width
            new_h = max(1, int(round(h * (new_w / float(w)))))
            resample_filter = Image.Resampling.NEAREST if resampling == Resampling.nearest else Image.Resampling.LANCZOS
            return np.array(img.resize((new_w, new_h), resample=resample_filter))
        return arr

    dst_crs = CRS.from_epsg(4326)
    try:
        left, bottom, right, top = src_bounds.left, src_bounds.bottom, src_bounds.right, src_bounds.top
        dst_transform, dst_w, dst_h = calculate_default_transform(
            src_crs, dst_crs, w, h, left=left, bottom=bottom, right=right, top=top
        )
        if dst_w > max_width:
            ratio = dst_h / float(dst_w)
            dst_w = max_width
            dst_h = max(1, int(round(dst_w * ratio)))
            dst_transform, _, _ = calculate_default_transform(
                src_crs, dst_crs, w, h, left=left, bottom=bottom, right=right, top=top,
                dst_width=dst_w, dst_height=dst_h
            )
        dst_arr = np.zeros((dst_h, dst_w), dtype=arr.dtype)
        reproject(
            source=arr,
            destination=dst_arr,
            src_transform=src_transform,
            src_crs=src_crs,
            dst_transform=dst_transform,
            dst_crs=dst_crs,
            resampling=resampling
        )
        return dst_arr
    except Exception as e:
        print(f"Reprojection notice: {e}. Outputting downscaled image in native coordinates.")
        if w > max_width:
            img = Image.fromarray(arr)
            new_w = max_width
            new_h = max(1, int(round(h * (new_w / float(w)))))
            resample_filter = Image.Resampling.NEAREST if resampling == Resampling.nearest else Image.Resampling.LANCZOS
            return np.array(img.resize((new_w, new_h), resample=resample_filter))
        return arr

def export_grayscale_png(
    image_input, 
    output_png_path, 
    min_db=-25.0, 
    max_db=0.0, 
    max_width=1600, 
    band=1,
    src_transform=None,
    src_crs=None,
    src_bounds=None
):
    """
    Exports a SAR GeoTIFF or 2D array to an 8-bit grayscale PNG.
    - If image_input is a filepath, reads GeoTIFF with rasterio windowed reading.
    - Converts to dB scale if necessary using to_db().
    - Clips values to sensible dB range (min_db to max_db, default -25 to 0 dB).
    - Normalizes to 0-255 uint8 grayscale.
    - Reprojects to EPSG:4326 if needed and downscales if wider than max_width (~1600px).
    """
    if isinstance(image_input, str):
        with rasterio.open(image_input) as src:
            nodata = src.nodata
            data = read_raster_windowed(src, band=band)
            if src_transform is None:
                src_transform = src.transform
            if src_crs is None:
                src_crs = src.crs
            if src_bounds is None:
                src_bounds = src.bounds
    else:
        nodata = None
        data = np.copy(image_input)

    # Convert to dB scale if linear
    data_db = to_db(data, nodata=nodata)

    # Reproject to EPSG:4326 if CRS is provided
    if src_crs is not None and src_bounds is not None and src_transform is not None:
        data_db = reproject_and_downscale_to_epsg4326(
            data_db, 
            src_transform, 
            src_crs, 
            src_bounds, 
            max_width=max_width, 
            resampling=Resampling.bilinear
        )

    # Clip values to dB range (-25 to 0)
    clipped = np.clip(data_db, min_db, max_db)

    # Normalize to 0-255
    db_range = max_db - min_db
    if db_range <= 0:
        norm = np.zeros_like(clipped)
    else:
        norm = ((clipped - min_db) / db_range) * 255.0

    # Invalid / nodata pixels default to 0 (black)
    gray_8bit = np.nan_to_num(norm, nan=0.0).astype(np.uint8)

    img = Image.fromarray(gray_8bit, mode='L')

    # Downscale if wider than max_width, keeping aspect ratio
    if img.width > max_width:
        ratio = img.height / float(img.width)
        new_width = max_width
        new_height = max(1, int(round(new_width * ratio)))
        img = img.resize((new_width, new_height), resample=Image.Resampling.LANCZOS)

    output_dir = os.path.dirname(os.path.abspath(output_png_path))
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    img.save(output_png_path, format='PNG')
    return output_png_path

def run_change_detection(
    image_a_path, 
    image_b_path, 
    threshold=3.0, 
    filter_size=5, 
    output_png=None, 
    output_json=None,
    output_before_png=None,
    output_after_png=None,
    min_db=-25.0,
    max_db=0.0,
    max_width=1600,
    mode="flood",
    date_a=None,
    date_b=None,
    band=None,
    polarization=None,
    water_threshold=None,
    min_pixels=20,
    river_buffer=5,
    loss_threshold_db=-3.0
):
    """
    Runs deterministic SAR change-detection pipeline.
    Modes: flood, surface-water, river-erosion, deforestation, change.
    """
    # Validate mode
    valid_modes = ["flood", "river-erosion", "deforestation", "surface-water", "change"]
    if mode not in valid_modes:
        raise ValueError(f"Invalid mode '{mode}'. Expected one of: {valid_modes}")

    # Parse and validate dates
    days = None
    if date_a and date_b:
        try:
            dt_a = datetime.strptime(str(date_a).strip(), "%Y-%m-%d").date()
            dt_b = datetime.strptime(str(date_b).strip(), "%Y-%m-%d").date()
            days = abs((dt_b - dt_a).days)
        except Exception:
            raise ValueError(f"Invalid date format for --date-a/--date-b ({date_a}, {date_b}). Expected YYYY-MM-DD.")
    elif date_a:
        try:
            datetime.strptime(str(date_a).strip(), "%Y-%m-%d").date()
        except Exception:
            raise ValueError(f"Invalid date format for --date-a ({date_a}). Expected YYYY-MM-DD.")
    elif date_b:
        try:
            datetime.strptime(str(date_b).strip(), "%Y-%m-%d").date()
        except Exception:
            raise ValueError(f"Invalid date format for --date-b ({date_b}). Expected YYYY-MM-DD.")

    dates_info = {
        "a": str(date_a).strip() if date_a else None,
        "b": str(date_b).strip() if date_b else None,
        "days": days
    }

    warnings = []

    # Band & Polarization selection
    requested_pol = polarization
    if mode == "deforestation" and requested_pol is None:
        requested_pol = "VH"

    with rasterio.open(image_a_path) as src_a:
        crs_a = src_a.crs
        transform_a = src_a.transform
        bounds_a = src_a.bounds
        nodata_a = src_a.nodata
        band_a, pol_a = get_band_and_polarization(src_a, requested_polarization=requested_pol, requested_band=band)
        data_a = read_raster_windowed(src_a, band=band_a)
        orig_shape_a = (src_a.height, src_a.width)

    if mode == "deforestation" and pol_a != "VH":
        warnings.append("VV-only input is less sensitive to forest loss when only one band is present. Cross-polarization (VH) provides superior volume scattering sensitivity.")

    # Compute geographic bounding box in EPSG:4326 if valid CRS and bounds exist
    bounds_dict = None
    center_coords = None
    if crs_a is not None and bounds_a is not None:
        try:
            if crs_a.is_geographic:
                w, s, e, n = bounds_a.left, bounds_a.bottom, bounds_a.right, bounds_a.top
            else:
                w, s, e, n = transform_bounds(crs_a, 'EPSG:4326', bounds_a.left, bounds_a.bottom, bounds_a.right, bounds_a.top)
            if -90 <= s <= 90 and -90 <= n <= 90 and -180 <= w <= 180 and -180 <= e <= 180:
                bounds_dict = {
                    "south": float(s),
                    "west": float(w),
                    "north": float(n),
                    "east": float(e)
                }
                center_coords = [float((n + s) / 2.0), float((w + e) / 2.0)]
        except Exception:
            bounds_dict = None
            center_coords = None
            
    with rasterio.open(image_b_path) as src_b:
        nodata_b = src_b.nodata
        band_b, pol_b = get_band_and_polarization(src_b, requested_polarization=requested_pol, requested_band=band)
        data_b = read_raster_windowed(src_b, band=band_b)
        
        # Check if CRS, transform, and extent match
        if (src_b.crs != crs_a) or (src_b.transform != transform_a) or (data_b.shape != data_a.shape):
            # Reproject image_b to match image_a's grid
            data_b_reproj = np.empty_like(data_a)
            reproject(
                source=data_b,
                destination=data_b_reproj,
                src_transform=src_b.transform,
                src_crs=src_b.crs,
                src_nodata=nodata_b,
                dst_transform=transform_a,
                dst_crs=crs_a,
                dst_nodata=np.nan,
                resampling=Resampling.bilinear
            )
            data_b = data_b_reproj

    # Check for decimation resolution scaling
    scale_y_a = orig_shape_a[0] / float(data_a.shape[0])
    scale_x_a = orig_shape_a[1] / float(data_a.shape[1])
    if scale_x_a != 1.0 or scale_y_a != 1.0:
        from affine import Affine
        eff_dx = abs(transform_a.a) * scale_x_a
        eff_dy = abs(transform_a.e) * scale_y_a
        eff_transform = Affine(eff_dx, transform_a.b, transform_a.c, transform_a.d, -eff_dy, transform_a.f)
        print(f"Decimation: Computing areas using effective resolution: {eff_dx:.6f} x {eff_dy:.6f}.")
    else:
        eff_transform = transform_a

    # Export before and after 8-bit grayscale PNGs if requested (keep if they already exist)
    if output_before_png:
        if not os.path.exists(output_before_png):
            export_grayscale_png(
                data_a, output_before_png, min_db=min_db, max_db=max_db, max_width=max_width,
                src_transform=transform_a, src_crs=crs_a, src_bounds=bounds_a
            )
        else:
            print(f"Preview: Keeping existing {output_before_png}")
    if output_after_png:
        if not os.path.exists(output_after_png):
            export_grayscale_png(
                data_b, output_after_png, min_db=min_db, max_db=max_db, max_width=max_width,
                src_transform=transform_a, src_crs=crs_a, src_bounds=bounds_a
            )
        else:
            print(f"Preview: Keeping existing {output_after_png}")

    # Convert to dB scale with auto-detection and nodata masking
    data_a_db, scale_a = to_db(data_a, nodata=nodata_a, return_scale=True)
    data_b_db, scale_b = to_db(data_b, nodata=nodata_b, return_scale=True)
    
    valid_mask = np.isfinite(data_a_db) & np.isfinite(data_b_db)
    
    # Median filter on valid values
    data_a_db_filled = np.nan_to_num(data_a_db, nan=0.0)
    data_b_db_filled = np.nan_to_num(data_b_db, nan=0.0)
    
    data_a_filtered = median_filter(data_a_db_filled, size=filter_size) if filter_size > 1 else data_a_db_filled
    data_b_filtered = median_filter(data_b_db_filled, size=filter_size) if filter_size > 1 else data_b_db_filled
    
    # Compute pixel area and valid stats
    center_lat = center_coords[0] if center_coords else None
    pixel_area_km2 = calculate_pixel_area_km2(eff_transform, crs_a, center_lat=center_lat, bounds=bounds_a)
    total_valid_pixels = int(np.sum(valid_mask))
    total_area_km2 = round(float(total_valid_pixels * pixel_area_km2), 2)

    diff = np.abs(data_b_filtered - data_a_filtered)
    diff[~valid_mask] = np.nan

    # Mode processing
    cat_overlay = np.zeros(data_a.shape, dtype=np.uint8)

    if mode == "flood":
        water_mask_a = compute_water_mask(data_a_filtered, polarization=pol_a, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        water_mask_b = compute_water_mask(data_b_filtered, polarization=pol_b, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        transition = compute_water_transition(water_mask_a, water_mask_b)

        # Class 2 = new water = flooded
        affected_mask = (transition == 2) & valid_mask
        affected_pixels = int(np.sum(affected_mask))
        affected_area_km2 = round(float(affected_pixels * pixel_area_km2), 2)
        flooded_area_km2 = affected_area_km2
        persistent_water_km2 = round(float(np.sum((transition == 1) & valid_mask) * pixel_area_km2), 2)
        receded_water_km2 = round(float(np.sum((transition == 3) & valid_mask) * pixel_area_km2), 2)

        categories = [
            {"id": "flooded", "label": "Flooded Area", "areaKm2": flooded_area_km2, "kind": "loss"},
            {"id": "persistent_water", "label": "Persistent Water", "areaKm2": persistent_water_km2, "kind": "persistent"},
            {"id": "receded_water", "label": "Receded Water", "areaKm2": receded_water_km2, "kind": "gain"}
        ]
        metrics = {
            "floodedAreaKm2": flooded_area_km2,
            "persistentWaterKm2": persistent_water_km2,
            "recededWaterKm2": receded_water_km2
        }

        # Category mapping for overlay:
        # 1: persistent water (#7D8A92), 2: flooded (#A8462E), 3: receded (#2C5C61)
        cat_overlay[(transition == 1) & valid_mask] = 1
        cat_overlay[(transition == 2) & valid_mask] = 2
        cat_overlay[(transition == 3) & valid_mask] = 3

    elif mode == "surface-water":
        water_mask_a = compute_water_mask(data_a_filtered, polarization=pol_a, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        water_mask_b = compute_water_mask(data_b_filtered, polarization=pol_b, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        transition = compute_water_transition(water_mask_a, water_mask_b)

        water_a_km2 = round(float(np.sum((water_mask_a == 1) & valid_mask) * pixel_area_km2), 2)
        water_b_km2 = round(float(np.sum((water_mask_b == 1) & valid_mask) * pixel_area_km2), 2)
        water_delta_km2 = round(water_b_km2 - water_a_km2, 2)
        water_delta_pct = round(((water_b_km2 - water_a_km2) / water_a_km2) * 100.0, 2) if water_a_km2 > 0 else 0.0

        # affectedAreaKm2 = area of classes 2 + 3
        affected_mask = ((transition == 2) | (transition == 3)) & valid_mask
        affected_pixels = int(np.sum(affected_mask))
        affected_area_km2 = round(float(affected_pixels * pixel_area_km2), 2)
        new_water_km2 = round(float(np.sum((transition == 2) & valid_mask) * pixel_area_km2), 2)
        lost_water_km2 = round(float(np.sum((transition == 3) & valid_mask) * pixel_area_km2), 2)
        persistent_km2 = round(float(np.sum((transition == 1) & valid_mask) * pixel_area_km2), 2)

        categories = [
            {"id": "new_water", "label": "New Surface Water", "areaKm2": new_water_km2, "kind": "gain"},
            {"id": "lost_water", "label": "Lost Surface Water", "areaKm2": lost_water_km2, "kind": "loss"},
            {"id": "persistent_water", "label": "Persistent Water", "areaKm2": persistent_km2, "kind": "persistent"}
        ]
        metrics = {
            "waterAreaAKm2": water_a_km2,
            "waterAreaBKm2": water_b_km2,
            "waterDeltaKm2": water_delta_km2,
            "waterDeltaPercent": water_delta_pct,
            "newWaterKm2": new_water_km2,
            "lostWaterKm2": lost_water_km2,
            "persistentWaterKm2": persistent_km2
        }

        # Category mapping for overlay:
        # 1: persistent (#7D8A92), 2: lost water (#A8462E hazard), 3: new water (#2C5C61 gain)
        cat_overlay[(transition == 1) & valid_mask] = 1
        cat_overlay[(transition == 3) & valid_mask] = 2
        cat_overlay[(transition == 2) & valid_mask] = 3

    elif mode == "river-erosion":
        water_mask_a = compute_water_mask(data_a_filtered, polarization=pol_a, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        water_mask_b = compute_water_mask(data_b_filtered, polarization=pol_b, water_threshold=water_threshold, min_pixels=min_pixels, filter_size=1)
        transition = compute_water_transition(water_mask_a, water_mask_b)

        river_mask = (transition == 1) & valid_mask
        if river_buffer > 0 and np.any(river_mask):
            structure = np.ones((3, 3), dtype=bool)
            dilated_river = binary_dilation(river_mask, structure=structure, iterations=river_buffer)
        else:
            dilated_river = river_mask

        # Erosion: new-water components (class 2) that intersect dilated river
        erosion_mask = np.zeros(data_a.shape, dtype=bool)
        other_new_water_mask = np.zeros(data_a.shape, dtype=bool)
        class2 = (transition == 2) & valid_mask
        if np.any(class2):
            labeled_c2, num_c2 = label(class2, structure=np.ones((3, 3), dtype=np.uint8))
            if num_c2 > 0:
                intersecting_c2 = set(np.unique(labeled_c2[dilated_river])) - {0}
                if intersecting_c2:
                    is_erosion = np.zeros(num_c2 + 1, dtype=bool)
                    for lbl in intersecting_c2:
                        is_erosion[lbl] = True
                    erosion_mask = is_erosion[labeled_c2]
                other_new_water_mask = class2 & (~erosion_mask)

        # Accretion: lost-water components (class 3) that intersect dilated river
        accretion_mask = np.zeros(data_a.shape, dtype=bool)
        other_lost_water_mask = np.zeros(data_a.shape, dtype=bool)
        class3 = (transition == 3) & valid_mask
        if np.any(class3):
            labeled_c3, num_c3 = label(class3, structure=np.ones((3, 3), dtype=np.uint8))
            if num_c3 > 0:
                intersecting_c3 = set(np.unique(labeled_c3[dilated_river])) - {0}
                if intersecting_c3:
                    is_accretion = np.zeros(num_c3 + 1, dtype=bool)
                    for lbl in intersecting_c3:
                        is_accretion[lbl] = True
                    accretion_mask = is_accretion[labeled_c3]
                other_lost_water_mask = class3 & (~accretion_mask)

        erosion_km2 = round(float(np.sum(erosion_mask) * pixel_area_km2), 2)
        accretion_km2 = round(float(np.sum(accretion_mask) * pixel_area_km2), 2)
        net_land_change_km2 = round(accretion_km2 - erosion_km2, 2)
        river_area_km2 = round(float(np.sum(river_mask) * pixel_area_km2), 2)
        other_new_km2 = round(float(np.sum(other_new_water_mask) * pixel_area_km2), 2)
        other_lost_km2 = round(float(np.sum(other_lost_water_mask) * pixel_area_km2), 2)

        affected_mask = erosion_mask
        affected_pixels = int(np.sum(erosion_mask))
        affected_area_km2 = erosion_km2

        erosion_rate = None
        if days is not None and days > 0:
            erosion_rate = round(float(erosion_km2 / (days / 365.25)), 4)

        categories = [
            {"id": "erosion", "label": "River Bank Erosion", "areaKm2": erosion_km2, "kind": "loss"},
            {"id": "accretion", "label": "River Accretion / Deposition", "areaKm2": accretion_km2, "kind": "gain"},
            {"id": "persistent_river", "label": "Persistent River Channel", "areaKm2": river_area_km2, "kind": "persistent"},
            {"id": "other_new_water", "label": "Other New Water", "areaKm2": other_new_km2, "kind": "other"},
            {"id": "other_lost_water", "label": "Other Lost Water", "areaKm2": other_lost_km2, "kind": "other"}
        ]
        metrics = {
            "erosionAreaKm2": erosion_km2,
            "accretionAreaKm2": accretion_km2,
            "netLandChangeKm2": net_land_change_km2,
            "erosionRateKm2PerYear": erosion_rate,
            "riverAreaKm2": river_area_km2,
            "otherNewWaterAreaKm2": other_new_km2,
            "otherLostWaterAreaKm2": other_lost_km2
        }

        # Category mapping for overlay:
        # 1: persistent river (#7D8A92), 2: erosion (#A8462E hazard), 3: accretion (#2C5C61 opposite)
        # 4: other new water, 5: other lost water
        cat_overlay[river_mask] = 1
        cat_overlay[erosion_mask] = 2
        cat_overlay[accretion_mask] = 3
        cat_overlay[other_new_water_mask] = 4
        cat_overlay[other_lost_water_mask] = 5

    elif mode == "deforestation":
        thresh_val = -abs(loss_threshold_db)
        diff_db = data_b_filtered - data_a_filtered
        loss_raw = ((diff_db <= thresh_val) & valid_mask).astype(np.uint8)
        loss_clean = filter_small_components(loss_raw, min_pixels=min_pixels)
        loss_mask = (loss_clean == 1) & valid_mask

        affected_mask = loss_mask
        affected_pixels = int(np.sum(loss_mask))
        forest_loss_km2 = round(float(affected_pixels * pixel_area_km2), 2)
        affected_area_km2 = forest_loss_km2

        categories = [
            {"id": "forest_loss", "label": "Forest Canopy Loss", "areaKm2": forest_loss_km2, "kind": "loss"}
        ]
        metrics = {
            "forestLossKm2": forest_loss_km2,
            "lossThresholdDb": thresh_val
        }

        # Category mapping for overlay:
        # 2: forest loss (#A8462E)
        cat_overlay[loss_mask] = 2

    elif mode == "change":
        # Legacy change mode
        change_mask = (diff >= threshold) & valid_mask
        affected_mask = change_mask
        affected_pixels = int(np.sum(change_mask))
        affected_area_km2 = round(float(affected_pixels * pixel_area_km2), 2)

        categories = [
            {"id": "change", "label": "Detected Change", "areaKm2": affected_area_km2, "kind": "loss"}
        ]
        metrics = {
            "changedAreaKm2": affected_area_km2
        }
        cat_overlay[change_mask] = 2

    # Confidence and Signal Strength
    # Keep: mean abs dB change over affected pixels, clipped at 10 dB, scaled to 0-100
    if affected_pixels > 0 and np.any(affected_mask):
        mean_abs_db = float(np.nanmean(diff[affected_mask]))
        if mode == "change":
            confidence = round(float(min(100.0, (mean_abs_db / threshold) * 50.0)), 2)
        else:
            clipped_db = min(10.0, max(0.0, mean_abs_db))
            confidence = round(float((clipped_db / 10.0) * 100.0), 2)
    else:
        confidence = 0.0

    signal_strength = confidence
    percent_changed = round(float((affected_pixels / total_valid_pixels) * 100.0), 2) if total_valid_pixels > 0 else 0.0

    # Parameters recorded
    water_thresh_used = water_threshold if water_threshold is not None else (-22.0 if pol_a == "VH" else -16.0)
    params_dict = {
        "mode": mode,
        "waterThresholdDb": water_thresh_used,
        "minPixels": min_pixels,
        "riverBuffer": river_buffer if mode == "river-erosion" else None,
        "lossThresholdDb": -abs(loss_threshold_db) if mode == "deforestation" else None,
        "detectedScaleA": scale_a,
        "detectedScaleB": scale_b,
        "band": band_a,
        "polarization": pol_a,
        "filterSize": filter_size
    }

    # Export change-map.png with EPSG:4326 reprojection and design system colors
    if output_png:
        reprojected_cat = reproject_and_downscale_to_epsg4326(
            cat_overlay, 
            transform_a, 
            crs_a, 
            bounds_a, 
            max_width=2000, 
            resampling=Resampling.nearest
        )
        
        # Colors:
        # 0: transparent [0, 0, 0, 0]
        # 1: persistent water neutral #7D8A92 @ 50% alpha [125, 138, 146, 128]
        # 2: flagged hazard #A8462E [168, 70, 46, 255]
        # 3: opposite change #2C5C61 [44, 92, 97, 255]
        # 4: other new water [44, 92, 97, 75]
        # 5: other lost water [168, 70, 46, 75]
        h_out, w_out = reprojected_cat.shape
        rgba = np.zeros((h_out, w_out, 4), dtype=np.uint8)
        rgba[reprojected_cat == 1] = [125, 138, 146, 128]
        rgba[reprojected_cat == 2] = [168, 70, 46, 255]
        rgba[reprojected_cat == 3] = [44, 92, 97, 255]
        rgba[reprojected_cat == 4] = [44, 92, 97, 75]
        rgba[reprojected_cat == 5] = [168, 70, 46, 75]

        output_png_dir = os.path.dirname(os.path.abspath(output_png))
        if output_png_dir:
            os.makedirs(output_png_dir, exist_ok=True)
        img = Image.fromarray(rgba, 'RGBA')
        img.save(output_png)

    # Export JSON
    result_dict = {
        "mode": mode,
        "changeMapUrl": os.path.basename(output_png) if output_png else "",
        "percentChanged": percent_changed,
        "affectedAreaKm2": affected_area_km2,
        "confidence": confidence,
        "signalStrength": signal_strength,
        "totalAreaKm2": total_area_km2,
        "bounds": bounds_dict,
        "dates": dates_info,
        "categories": categories,
        "metrics": metrics,
        "params": params_dict,
        "warnings": warnings,
        "band": band_a,
        "polarization": pol_a,
    }
    if bounds_dict is not None and center_coords is not None:
        result_dict["center"] = center_coords
    if output_before_png:
        result_dict["beforeImageUrl"] = os.path.basename(output_before_png)
    if output_after_png:
        result_dict["afterImageUrl"] = os.path.basename(output_after_png)

    if output_json:
        output_json_dir = os.path.dirname(os.path.abspath(output_json))
        if output_json_dir:
            os.makedirs(output_json_dir, exist_ok=True)
        with open(output_json, 'w') as f:
            json.dump(result_dict, f, indent=2)

    return result_dict

if __name__ == "__main__":
    import shutil
    parser = argparse.ArgumentParser(description="Deterministic SAR Change Detection Pipeline")
    parser.add_argument("--aoi", type=str, required=True, help="Area of Interest ID")
    parser.add_argument("--input-dir", type=str, required=True, help="Directory containing image_a.tif and image_b.tif")
    parser.add_argument("--output-dir", type=str, required=True, help="Directory to save outputs")
    parser.add_argument("--threshold", type=float, default=3.0, help="Change threshold in dB (default: 3.0)")
    parser.add_argument("--mode", type=str, default="flood", choices=["flood", "river-erosion", "deforestation", "surface-water", "change"], help="Analysis mode: flood, river-erosion, deforestation, surface-water (default: flood)")
    parser.add_argument("--date-a", type=str, default=None, help="Capture date for image A (ISO format YYYY-MM-DD)")
    parser.add_argument("--date-b", type=str, default=None, help="Capture date for image B (ISO format YYYY-MM-DD)")
    parser.add_argument("--water-threshold", type=float, default=None, help="Water detection threshold in dB (default: -16 for VV, -22 for VH)")
    parser.add_argument("--min-pixels", type=int, default=20, help="Minimum connected component size to retain in water mask (default: 20)")
    parser.add_argument("--river-buffer", type=int, default=5, help="River buffer dilation distance in pixels (default: 5)")
    parser.add_argument("--loss-threshold-db", type=float, default=-3.0, help="Deforestation backscatter loss threshold in dB (default: -3.0)")
    parser.add_argument("--band", type=int, default=None, help="Band index to use (1 for VV, 2 for VH)")
    parser.add_argument("--polarization", type=str, default=None, help="SAR polarization ('VV' or 'VH')")

    args = parser.parse_args()

    # Input validation
    if args.date_a:
        try:
            datetime.strptime(args.date_a.strip(), "%Y-%m-%d")
        except ValueError:
            print(f"Error: Invalid date format for --date-a: '{args.date_a}'. Expected ISO format YYYY-MM-DD.")
            exit(1)
    if args.date_b:
        try:
            datetime.strptime(args.date_b.strip(), "%Y-%m-%d")
        except ValueError:
            print(f"Error: Invalid date format for --date-b: '{args.date_b}'. Expected ISO format YYYY-MM-DD.")
            exit(1)

    image_a = os.path.join(args.input_dir, "image_a.tif")
    image_b = os.path.join(args.input_dir, "image_b.tif")

    os.makedirs(args.output_dir, exist_ok=True)

    out_png = os.path.join(args.output_dir, f"{args.aoi}_change_map.png")
    change_map_png = os.path.join(args.output_dir, "change-map.png")
    out_json = os.path.join(args.output_dir, f"{args.aoi}_stats.json")
    result_json = os.path.join(args.output_dir, "result.json")
    before_png = os.path.join(args.output_dir, "before.png")
    after_png = os.path.join(args.output_dir, "after.png")

    if not os.path.exists(image_a) or not os.path.exists(image_b):
        missing = image_a if not os.path.exists(image_a) else image_b
        print(f"Error: Required input file not found: {missing}")
        exit(1)

    print(f"Running SAR change detection (mode: {args.mode}) for AOI: {args.aoi}")
    res = run_change_detection(
        image_a, 
        image_b, 
        threshold=args.threshold, 
        output_png=out_png, 
        output_json=out_json,
        output_before_png=before_png,
        output_after_png=after_png,
        mode=args.mode,
        date_a=args.date_a,
        date_b=args.date_b,
        band=args.band,
        polarization=args.polarization.upper() if args.polarization else None,
        water_threshold=args.water_threshold,
        min_pixels=args.min_pixels,
        river_buffer=args.river_buffer,
        loss_threshold_db=args.loss_threshold_db
    )

    # Save change-map.png as well
    if os.path.abspath(out_png) != os.path.abspath(change_map_png):
        shutil.copy2(out_png, change_map_png)

    # Save / update result.json preserving any existing UI attributes (name, dates, chartData)
    if os.path.abspath(out_json) != os.path.abspath(result_json):
        if os.path.exists(result_json):
            try:
                with open(result_json, "r") as f:
                    combined = json.load(f)
                combined.update(res)
                with open(result_json, "w") as f:
                    json.dump(combined, f, indent=2)
            except Exception:
                shutil.copy2(out_json, result_json)
        else:
            shutil.copy2(out_json, result_json)

    print("Processing complete. Results:")
    print(json.dumps(res, indent=2))
