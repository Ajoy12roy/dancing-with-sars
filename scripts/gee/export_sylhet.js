/**
 * Google Earth Engine Export Script: Sylhet Flood Inundation
 * Project: Dancing with the SARs (NASA Space Apps Challenge 2026)
 *
 * Dataset: COPERNICUS/S1_GRD (Sentinel-1 Ground Range Detected)
 * Swath Mode: IW (Interferometric Wide)
 * AOI: Sylhet Division, Bangladesh (Surma River Basin)
 */

// 1. Define Area of Interest (AOI) Bounding Box [west, south, east, north]
var aoi = ee.Geometry.Rectangle([
  91.79991686251485, // west
  24.8499160415415,  // south
  91.95011517801963, // east
  24.98017175773883  // north
]);

// 2. Acquisition Date Ranges
// Baseline (Image A - Pre-monsoon / dry baseline)
var startDateA = '2022-05-01';
var endDateA = '2022-05-10';

// Comparison (Image B - Peak monsoon flood)
var startDateB = '2022-06-20';
var endDateB = '2022-06-21';

// 3. Bands & Resolution
var bands = ['VV']; // Sample data contains 1 band: VV
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
  description: 'sylhet_image_a',
  folder: 'dancing-with-sars-sylhet',
  fileNamePrefix: 'image_a',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: imageB,
  description: 'sylhet_image_b',
  folder: 'dancing-with-sars-sylhet',
  fileNamePrefix: 'image_b',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});
