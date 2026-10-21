/**
 * Google Earth Engine Export Script: Tanguar Haor Seasonal Surface Water
 * Project: Dancing with the SARs (NASA Space Apps Challenge 2026)
 *
 * Dataset: COPERNICUS/S1_GRD (Sentinel-1 Ground Range Detected)
 * Swath Mode: IW (Interferometric Wide)
 * AOI: Tanguar Haor Ramsar Wetland Basin, Sunamganj, Bangladesh
 */

// 1. Define Area of Interest (AOI) Bounding Box [west, south, east, north]
var aoi = ee.Geometry.Rectangle([
  90.97975500811373, // west
  25.0497911922581,  // south
  91.20020157883665, // east
  25.220111770127158 // north
]);

// 2. Acquisition Date Ranges (Dry season baseline to monsoon wetland maximum)
// Baseline (Image A - Pre-monsoon dry season)
var startDateA = '2023-02-01';
var endDateA = '2023-02-28'; // Reference date: 2023-02-15

// Comparison (Image B - Peak monsoon expansion)
var startDateB = '2023-08-01';
var endDateB = '2023-08-31'; // Reference date: 2023-08-15

// 3. Bands & Resolution
var bands = ['VV', 'VH']; // Sample data contains 2 bands: VV, VH
var scale = 30;           // Spatial resolution: ~30m (0.000269495° in EPSG:4326)
var crs = 'EPSG:4326';

// 4. Filter Sentinel-1 GRD Collection
var s1Collection = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'));

// TODO: Confirm orbit pass ('DESCENDING' or 'ASCENDING') if single-pass filtering was used:
// s1Collection = s1Collection.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

// TODO: Confirm relative orbit number if a specific repeat cycle track was isolated:
// s1Collection = s1Collection.filter(ee.Filter.eq('relativeOrbitNumber_start', <orbitNumber>));

// 5. Select Images
// TODO: Confirm composite reducer (.mosaic(), .first(), or .mean() if multiple acquisitions in date window):
var imageA = s1Collection
  .filterDate(startDateA, ee.Date(endDateA).advance(1, 'day'))
  .select(bands)
  .mosaic()
  .clip(aoi);

var imageB = s1Collection
  .filterDate(startDateB, ee.Date(endDateB).advance(1, 'day'))
  .select(bands)
  .mosaic()
  .clip(aoi);

// 6. Export Tasks to Google Drive
Export.image.toDrive({
  image: imageA,
  description: 'tanguar_image_a',
  folder: 'dancing-with-sars-tanguar',
  fileNamePrefix: 'image_a',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: imageB,
  description: 'tanguar_image_b',
  folder: 'dancing-with-sars-tanguar',
  fileNamePrefix: 'image_b',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});
