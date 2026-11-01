// ========================================================================
// Radar Method Metadata & Constants — Dancing with the SARs (Terra Pulse)
// Reflects exact deterministic processing parameters from python-service/process_change.py
// Do NOT modify python-service/process_change.py — this module provides clean
// frontend references and documented code line numbers to avoid hardcoded guesses.
// ========================================================================

/**
 * Radar Processing Parameters & Pipeline Constants
 * Referenced directly from python-service/process_change.py (read-only):
 *
 * - lines 12-15: Global constants (MAX_PIXELS_DECIMATE, DEFAULT_WATER_THRESHOLD_VV/VH, DEFAULT_MIN_PIXELS)
 * - lines 17-63: to_db() - auto-detects linear vs dB scale, converts linear via 10*log10
 * - lines 93-143: calculate_pixel_area_km2() - latitude-corrected geographic or projected pixel area in km²
 * - lines 175-195: filter_small_components() - drops connected components smaller than min_pixels (default 20) via scipy.ndimage.label
 * - lines 197-226: compute_water_mask() - 5-pixel median filter, threshold comparison, filter_small_components
 * - lines 390-412: run_change_detection() - pipeline orchestration with default parameter definitions
 * - lines 556-557: data_a_filtered/data_b_filtered - 5-pixel median filter on valid values
 * - lines 571-600: flood mode - water mask transition (class 2 = new water/flooded)
 * - lines 601-639: surface-water mode - transition classes 2 (new water) and 3 (lost water)
 * - lines 640-728: river-erosion mode - binary_dilation with 5 iterations, connected components
 * - lines 729-750: deforestation mode - loss_threshold_db = -3.0 dB drop, filter_small_components(min_pixels=20)
 */
export const RADAR_METHOD_METADATA = {
  sourceFile: 'python-service/process_change.py',
  filterSize: 5, // line 197, 394, 556: median_filter kernel size = 5 pixels
  minPixels: 20, // line 15, 175: DEFAULT_MIN_PIXELS = 20 (filter_small_components)
  defaultWaterThresholdVV: -16.0, // line 13: DEFAULT_WATER_THRESHOLD_VV = -16.0 dB
  defaultWaterThresholdVH: -22.0, // line 14: DEFAULT_WATER_THRESHOLD_VH = -22.0 dB
  defaultLossThresholdDb: -3.0, // line 410, 730: loss_threshold_db = -3.0 dB
  defaultRiverBufferIterations: 5, // line 409, 648: river_buffer = 5
  lineReferences: {
    constants: 'lines 12-15',
    dbDetection: 'lines 17-63 (to_db)',
    pixelAreaKm2: 'lines 93-143 (calculate_pixel_area_km2)',
    filterSmallComponents: 'lines 175-195 (filter_small_components)',
    computeWaterMask: 'lines 197-226 (compute_water_mask)',
    medianFilterCall: 'lines 556-557',
    floodMode: 'lines 571-600',
    surfaceWaterMode: 'lines 601-639',
    riverErosionMode: 'lines 640-728',
    deforestationMode: 'lines 729-750',
  },
} as const;

/**
 * Returns mode-specific radar methodology explanation based strictly on process_change.py constants.
 * Every line is kept under 190 characters.
 */
export function getRadarMethodExplanation(mode: string): string {
  switch (mode) {
    case 'flood':
      return `We smooth Sentinel-1 radar backscatter with a ${RADAR_METHOD_METADATA.filterSize}-pixel median filter, then flag pixels that drop below the threshold as open water.`;
    case 'deforestation':
      return `We smooth Sentinel-1 radar backscatter with a ${RADAR_METHOD_METADATA.filterSize}-pixel median filter, then flag pixels where backscatter dropped by more than the threshold between pre- and post-dates.`;
    case 'river-erosion':
      return `We compare land-to-water transitions using radar backscatter smoothing and thresholding, filtering patches smaller than ${RADAR_METHOD_METADATA.minPixels} pixels.`;
    case 'surface-water':
      return `We smooth Sentinel-1 radar backscatter and flag pixels below the threshold as surface water, filtering isolated speckle.`;
    default:
      return `We smooth Sentinel-1 radar backscatter with a ${RADAR_METHOD_METADATA.filterSize}-pixel median filter and apply deterministic thresholding.`;
  }
}
