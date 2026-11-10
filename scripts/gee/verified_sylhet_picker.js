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
  91.8, // west
  24.85, // south
  91.95, // east
  24.98 // north
]);

// 2. Acquisition Date Ranges
// Baseline (Image A - Pre-monsoon / dry baseline)
var startDateA = '2022-05-01';
var endDateA = '2022-05-10';

// Comparison (Image B - Peak monsoon flood)
var startDateB = '2022-06-18';
var endDateB = '2022-06-22';

// 3. Bands & Resolution
var bands = ["VV"]; // Sample data contains 1 band: VV
var scale = 20;     // Spatial resolution: ~20m (0.000179663° in EPSG:4326)
var crs = 'EPSG:4326';

// 4. Filter Sentinel-1 GRD Collection
var s1Collection = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'));

// Single-geometry orbital pass and relative orbit selection
var PASS = 'DESCENDING';
var ORBIT = 77;

var endAExclusive = ee.Date(endDateA).advance(1, 'day');
var endBExclusive = ee.Date(endDateB).advance(1, 'day');

if (PASS !== null && ORBIT !== null) {
  var countA = s1Collection
    .filterDate(startDateA, endAExclusive)
    .filter(ee.Filter.eq('orbitProperties_pass', PASS))
    .filter(ee.Filter.eq('relativeOrbitNumber_start', ORBIT))
    .size()
    .getInfo();
  var countB = s1Collection
    .filterDate(startDateB, endBExclusive)
    .filter(ee.Filter.eq('orbitProperties_pass', PASS))
    .filter(ee.Filter.eq('relativeOrbitNumber_start', ORBIT))
    .size()
    .getInfo();

  if (countA === 0 || countB === 0) {
    print('Requested orbit group ' + PASS + ' track ' + ORBIT + ' has ' + countA + ' baseline and ' + countB + ' comparison images. Falling back to automatic single-geometry selection.');
    PASS = null;
    ORBIT = null;
  } else {
    print('Selected single-geometry orbit group: ' + PASS + ' track ' + ORBIT + ' (Baseline: ' + countA + ', Comparison: ' + countB + ').');
  }
}

if (PASS === null || ORBIT === null) {
  var beforePasses = s1Collection.filterDate(startDateA, endAExclusive).aggregate_array('orbitProperties_pass').getInfo();
  var beforeOrbits = s1Collection.filterDate(startDateA, endAExclusive).aggregate_array('relativeOrbitNumber_start').getInfo();
  var afterPasses = s1Collection.filterDate(startDateB, endBExclusive).aggregate_array('orbitProperties_pass').getInfo();
  var afterOrbits = s1Collection.filterDate(startDateB, endBExclusive).aggregate_array('relativeOrbitNumber_start').getInfo();

  var countMapA = {};
  for (var i = 0; i < beforePasses.length; i++) {
    var keyA = beforePasses[i] + '_' + beforeOrbits[i];
    countMapA[keyA] = (countMapA[keyA] || 0) + 1;
  }

  var countMapB = {};
  for (var j = 0; j < afterPasses.length; j++) {
    var keyB = afterPasses[j] + '_' + afterOrbits[j];
    countMapB[keyB] = (countMapB[keyB] || 0) + 1;
  }

  var allKeys = {};
  for (var kA in countMapA) { allKeys[kA] = true; }
  for (var kB in countMapB) { allKeys[kB] = true; }

  var candidates = [];
  print('Available single-geometry orbit groups:');
  for (var k in allKeys) {
    var parts = k.split('_');
    var p = parts[0];
    var orb = parseInt(parts[1], 10);
    var cA = countMapA[k] || 0;
    var cB = countMapB[k] || 0;
    print('  - Direction: ' + p + ', Track: ' + orb + ', Baseline images: ' + cA + ', Comparison images: ' + cB);
    if (cA > 0 && cB > 0) {
      candidates.push({ pass: p, orbit: orb, beforeCount: cA, afterCount: cB, minCount: Math.min(cA, cB) });
    }
  }

  if (candidates.length === 0) {
    print('No single orbit geometry has images in both windows. Widen a window or move the area.');
    throw new Error('No single orbit geometry has images in both windows. Widen a window or move the area.');
  }

  candidates.sort(function(a, b) {
    if (b.minCount !== a.minCount) {
      return b.minCount - a.minCount;
    }
    if (a.pass !== b.pass) {
      return a.pass === 'DESCENDING' ? -1 : 1;
    }
    return a.orbit - b.orbit;
  });

  PASS = candidates[0].pass;
  ORBIT = candidates[0].orbit;
  print('Selected single-geometry orbit group: ' + PASS + ' track ' + ORBIT + ' (used for both baseline and comparison windows).');
}

s1Collection = s1Collection
  .filter(ee.Filter.eq('orbitProperties_pass', PASS))
  .filter(ee.Filter.eq('relativeOrbitNumber_start', ORBIT));

// 5. Select Images
var imageA = s1Collection
  .filterDate(startDateA, endAExclusive)
  .select(bands)
  .mosaic()
  .clip(aoi);

var imageB = s1Collection
  .filterDate(startDateB, endBExclusive)
  .select(bands)
  .mosaic()
  .clip(aoi);

// 6. Export Tasks to Google Drive
Export.image.toDrive({
  image: imageA,
  description: 'terrapulse_aoi_image_a',
  folder: 'dancing-with-sars-terrapulse_aoi',
  fileNamePrefix: 'image_a',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: imageB,
  description: 'terrapulse_aoi_image_b',
  folder: 'dancing-with-sars-terrapulse_aoi',
  fileNamePrefix: 'image_b',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});
