import os
import json
import argparse
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from scipy.ndimage import median_filter
from PIL import Image

def to_db(array):
    """
    Convert array to dB scale if it appears to be linear power or amplitude.
    Typical SAR data in dB has negative values. If the array is strictly 
    non-negative, we assume it's in a linear scale.
    """
    # Create mask for valid pixels (not nan and > 0 for log)
    valid_mask = ~np.isnan(array) & (array > 0)
    
    # If there are no strictly negative valid values, assume it's linear
    has_negatives = np.any(~np.isnan(array) & (array < 0))
    if not has_negatives:
        db_array = np.full_like(array, np.nan, dtype=np.float32)
        # Apply 10*log10 (standard for power). 
        # If the input was amplitude, it should technically be 20*log10, 
        # but 10*log10 is robust for relative change thresholding if consistent.
        db_array[valid_mask] = 10 * np.log10(array[valid_mask])
        return db_array
    
    return array

def calculate_pixel_area_km2(transform, crs):
    """
    Estimate pixel area in square kilometers based on the transform and CRS.
    """
    dx = abs(transform.a)
    dy = abs(transform.e)
    
    if crs and crs.is_geographic:
        # Rough approximation for geographic CRS (e.g. WGS84 EPSG:4326)
        # 1 degree is approximately 111.32 km at the equator
        # This is a simplification; for high accuracy, reproject to an equal-area CRS.
        area_km2 = (dx * 111.32) * (dy * 111.32)
    else:
        # Assume linear units in meters for projected CRS (e.g. UTM)
        area_km2 = (dx * dy) / 1_000_000.0
        
    return area_km2

def run_change_detection(image_a_path, image_b_path, threshold=3.0, filter_size=5, output_png=None, output_json=None):
    """
    Runs deterministic SAR change-detection pipeline.
    
    threshold (float): Difference in dB to be considered change. 3.0 dB is chosen as 
                       default as it represents a doubling/halving of backscatter power, 
                       a common heuristic for significant structural/surface change in SAR.
    filter_size (int): Size of the median filter kernel to reduce speckle noise. Default is 5x5.
    """
    
    # 1. Load both rasters
    with rasterio.open(image_a_path) as src_a:
        crs_a = src_a.crs
        transform_a = src_a.transform
        data_a = src_a.read(1).astype(np.float32)
        if src_a.nodata is not None:
            data_a[data_a == src_a.nodata] = np.nan
            
    with rasterio.open(image_b_path) as src_b:
        data_b = src_b.read(1).astype(np.float32)
        
        # Check if CRS, transform, and extent match
        if (src_b.crs != crs_a) or (src_b.transform != transform_a) or (src_b.shape != data_a.shape):
            # Reproject image_b to match image_a's grid
            data_b_reproj = np.empty_like(data_a)
            reproject(
                source=data_b,
                destination=data_b_reproj,
                src_transform=src_b.transform,
                src_crs=src_b.crs,
                src_nodata=src_b.nodata,
                dst_transform=transform_a,
                dst_crs=crs_a,
                dst_nodata=np.nan,
                resampling=Resampling.bilinear
            )
            data_b = data_b_reproj
        else:
            if src_b.nodata is not None:
                data_b[data_b == src_b.nodata] = np.nan

    # 2. Convert to dB scale if linear
    data_a_db = to_db(data_a)
    data_b_db = to_db(data_b)
    
    valid_mask = ~np.isnan(data_a_db) & ~np.isnan(data_b_db)
    
    # Replace NaNs with 0 temporarily for median filtering
    data_a_db_filled = np.nan_to_num(data_a_db, 0)
    data_b_db_filled = np.nan_to_num(data_b_db, 0)
    
    # 3. Speckle noise reduction using median filter
    data_a_filtered = median_filter(data_a_db_filled, size=filter_size)
    data_b_filtered = median_filter(data_b_db_filled, size=filter_size)
    
    # 4. Compute pixel-wise difference in dB
    diff = np.abs(data_b_filtered - data_a_filtered)
    diff[~valid_mask] = np.nan
    
    # 5. Apply threshold to produce binary change mask
    change_mask = (diff >= threshold) & valid_mask
    
    # Compute Statistics
    total_valid = np.sum(valid_mask)
    changed_pixels = np.sum(change_mask)
    
    percent_changed = 0.0
    affected_area_km2 = 0.0
    confidence = 0.0
    
    if total_valid > 0:
        # percent_changed = (changed pixels / total valid pixels) * 100
        percent_changed = float((changed_pixels / total_valid) * 100.0)
        
        # affected_area_km2 = changed pixel count * pixel area
        pixel_area_km2 = calculate_pixel_area_km2(transform_a, crs_a)
        affected_area_km2 = float(changed_pixels * pixel_area_km2)
        
        if changed_pixels > 0:
            mean_change_val = np.nanmean(diff[change_mask])
            # confidence: a simple score based on how far the mean changed-pixel value is above the threshold.
            # Formula: min(100, (mean_change_val / threshold) * 50).
            # Explanation: If the mean change exactly equals the threshold, confidence is 50%.
            # If the mean change is double the threshold (or more), confidence is 100%.
            # This provides a bounded, explainable metric of how "extreme" the average detected change is.
            confidence = float(min(100.0, (mean_change_val / threshold) * 50.0))

    # Export PNG
    if output_png:
        # Create an RGBA image for perceptually distinct color-coded preview
        h, w = change_mask.shape
        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        
        # Background pixels (valid but no change): Dark slate (matches survey-teal/annotation-rust palette style)
        rgba[valid_mask & ~change_mask] = [30, 41, 59, 255]
        
        # Changed pixels: Annotation Rust (#C45946 -> 196, 89, 70) 
        # This is colorblind-safe and stands out sharply against the dark background.
        rgba[change_mask] = [196, 89, 70, 255] 
        
        img = Image.fromarray(rgba, 'RGBA')
        img.save(output_png)

    # Export JSON
    result_dict = {
        "changeMapUrl": os.path.basename(output_png) if output_png else "",
        "percentChanged": round(percent_changed, 2),
        "affectedAreaKm2": round(affected_area_km2, 2),
        "confidence": round(confidence, 2)
    }
    
    if output_json:
        with open(output_json, 'w') as f:
            json.dump(result_dict, f, indent=2)
            
    return result_dict

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deterministic SAR Change Detection Pipeline")
    parser.add_argument("--aoi", type=str, required=True, help="Area of Interest ID")
    parser.add_argument("--input-dir", type=str, required=True, help="Directory containing image_a.tif and image_b.tif")
    parser.add_argument("--output-dir", type=str, required=True, help="Directory to save outputs")
    parser.add_argument("--threshold", type=float, default=3.0, help="Change threshold in dB (default: 3.0)")
    
    args = parser.parse_args()
    
    image_a = os.path.join(args.input_dir, "image_a.tif")
    image_b = os.path.join(args.input_dir, "image_b.tif")
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    out_png = os.path.join(args.output_dir, f"{args.aoi}_change_map.png")
    out_json = os.path.join(args.output_dir, f"{args.aoi}_stats.json")
    
    if not os.path.exists(image_a) or not os.path.exists(image_b):
        print(f"Error: Required input files not found in {args.input_dir}.")
        print("Note: The real-data path has not been verified yet, as sample GeoTIFF files are missing.")
        exit(1)
        
    print(f"Running SAR change detection for AOI: {args.aoi}")
    res = run_change_detection(
        image_a, 
        image_b, 
        threshold=args.threshold, 
        output_png=out_png, 
        output_json=out_json
    )
    
    print("Processing complete. Results:")
    print(json.dumps(res, indent=2))
