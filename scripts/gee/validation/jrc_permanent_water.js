/**
 * Google Earth Engine Export Script: JRC Global Surface Water Occurrence
 * Project: Dancing with the SARs (TerraPulse)
 *
 * Dataset: JRC/GSW1_4/GlobalSurfaceWater
 * Band: occurrence (percentage of time 1984-2021 water was present, 0-100)
 *
 * Provides an independent, empirical baseline of permanent/semi-permanent water
 * to compare against our Sentinel-1 SAR change detections.
 * Water pixels with occurrence >= 80% define the long-term permanent water baseline.
 */

// 1. Ready Case Study Bounding Boxes [west, south, east, north] (EPSG:4326)
var CASES = {
  'sylhet': ee.Geometry.Rectangle([91.7999, 24.8499, 91.9501, 24.9802]),
  'jamuna': ee.Geometry.Rectangle([89.6498, 24.2998, 89.9500, 24.5501]),
  'amazon': ee.Geometry.Rectangle([-62.2001, -10.3500, -61.9999, -10.1499]),
  'tanguar': ee.Geometry.Rectangle([90.9798, 25.0498, 91.2002, 25.2201]),
  'cox-bazar-kutupalong-2017': ee.Geometry.Rectangle([92.0832, 21.1379, 92.2369, 21.2822]),
  'feni-2024': ee.Geometry.Rectangle([91.3127, 22.9390, 91.4877, 23.1011]),
  'hakaluki-haor': ee.Geometry.Rectangle([91.9816, 24.5790, 92.1587, 24.7410]),
  'padma-naria': ee.Geometry.Rectangle([90.2327, 23.3100, 90.4277, 23.4900]),
  'rio-grande-do-sul-2024': ee.Geometry.Rectangle([-51.3649, -30.1651, -51.0549, -29.8949]),
  'sindh-pakistan-2022': ee.Geometry.Rectangle([67.4507, 26.2199, 67.8501, 26.5800])
};

// 2. Load JRC Global Surface Water Dataset
var jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');
var occurrence = jrc.select('occurrence');

// Optional: create a binary permanent water mask (occurrence >= 80%)
var permanentWater = occurrence.gte(80).selfMask();

// 3. Visualization Parameters
var visParams = {
  min: 0,
  max: 100,
  palette: ['ffffff', 'fffcb8', 'ffff00', '3be285', '003366']
};

// Center preview on Sylhet by default
Map.centerObject(CASES['sylhet'], 11);
Map.addLayer(occurrence.clip(CASES['sylhet']), visParams, 'JRC Water Occurrence (%)');
Map.addLayer(permanentWater.clip(CASES['sylhet']), {palette: ['#2C5C61']}, 'Permanent Water (>=80%)');

// 4. Batch Export Tasks for All 10 Cases
// Run these tasks from the "Tasks" tab in Earth Engine Code Editor
Object.keys(CASES).forEach(function(caseId) {
  var aoi = CASES[caseId];

  Export.image.toDrive({
    image: occurrence.clip(aoi),
    description: 'jrc_occurrence_' + caseId,
    folder: 'dancing-with-sars-reference',
    fileNamePrefix: 'jrc_occurrence_' + caseId,
    region: aoi,
    scale: 30, // Native 30m Landsat resolution
    crs: 'EPSG:4326',
    maxPixels: 1e9
  });
});
