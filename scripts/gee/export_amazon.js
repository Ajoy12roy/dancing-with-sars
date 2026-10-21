/**
 * Google Earth Engine Export Script: Amazon Rainforest Canopy Loss (Deforestation)
 * Project: Dancing with the SARs (NASA Space Apps Challenge 2026)
 *
 * Dataset: COPERNICUS/S1_GRD (Sentinel-1 Ground Range Detected)
 * Swath Mode: IW (Interferometric Wide)
 * AOI: Rondônia, Brazilian Amazon
 */

// 1. Define Area of Interest (AOI) Bounding Box [west, south, east, north]
var aoi = ee.Geometry.Rectangle([
  -62.200068924662965, // west
  -10.350029377511479, // south
  -61.99992427936114,  // east
  -10.14988473220965   // north
]);

// 2. Acquisition Date Ranges (Two-year interval)
// Baseline (Image A - January 2021)
var startDateA = '2021-01-01';
var endDateA = '2021-01-15'; // Reference date: 2021-01-01

// Comparison (Image B - January 2023)
var startDateB = '2023-01-01';
var endDateB = '2023-01-15'; // Reference date: 2023-01-01

// 3. Bands & Resolution
var bands = ['VV']; // Sample GeoTIFF has 1 band (VV).
// NOTE: Cross-polarization (VH) provides superior volume scattering sensitivity for forest canopy.
// When exporting fresh imagery, consider adding 'VH' to bands.
var scale = 20;     // Spatial resolution: ~20m (0.000179663° in EPSG:4326)
var crs = 'EPSG:4326';

// 4. Filter Sentinel-1 GRD Collection
var s1Collection = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'));

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
  description: 'amazon_image_a',
  folder: 'dancing-with-sars-amazon',
  fileNamePrefix: 'image_a',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: imageB,
  description: 'amazon_image_b',
  folder: 'dancing-with-sars-amazon',
  fileNamePrefix: 'image_b',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});
