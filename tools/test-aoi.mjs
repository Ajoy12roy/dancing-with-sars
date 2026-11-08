// tools/test-aoi.mjs
// Comprehensive unit test suite for Area of Interest (AOI) library (lib/aoi.ts)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ── In-memory TypeScript module loader ──
const moduleCache = new Map();

function loadTsModule(filePath) {
  const resolvedPath = path.resolve(filePath);
  if (moduleCache.has(resolvedPath)) {
    return moduleCache.get(resolvedPath);
  }

  let src = fs.readFileSync(resolvedPath, 'utf8');
  src = src.replace(/from\s+['"]@\/(.*?)['"]/g, (m, p) => {
    const abs = path.resolve(rootDir, p).replace(/\\/g, '/');
    return `from '${abs}'`;
  });
  src = src.replace(/require\(['"]@\/(.*?)['"]\)/g, (m, p) => {
    const abs = path.resolve(rootDir, p).replace(/\\/g, '/');
    return `require('${abs}')`;
  });

  const transpiled = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  });

  const mod = { exports: {} };
  moduleCache.set(resolvedPath, mod.exports);

  const customRequire = (reqPath) => {
    if (reqPath.endsWith('.json')) {
      return JSON.parse(fs.readFileSync(reqPath, 'utf8'));
    }
    const candidateTs = reqPath.endsWith('.ts') ? reqPath : `${reqPath}.ts`;
    if (fs.existsSync(candidateTs)) {
      return loadTsModule(candidateTs);
    }
    if (fs.existsSync(reqPath)) {
      return loadTsModule(reqPath);
    }
    return require(reqPath);
  };

  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText} \n})`,
    { filename: resolvedPath }
  );
  wrapper(mod.exports, customRequire, mod, resolvedPath, path.dirname(resolvedPath));
  moduleCache.set(resolvedPath, mod.exports);
  return mod.exports;
}

const aoiModule = loadTsModule(path.resolve(rootDir, 'lib/aoi.ts'));
const {
  normalizeBbox,
  bboxFromCorners,
  computeBboxDimensions,
  validateBbox,
  clampBboxToLimits,
  computeExportScale,
  validateDateWindows,
  suggestWindowsForEvent,
  groupAsfResults,
  generateGeeScript,
  MIN_SIDE_KM,
  MAX_SIDE_KM,
  MAX_AREA_KM2,
  SEASONAL_WARNING_TEXT,
} = aoiModule;

console.log('Running Area Picker (lib/aoi.ts) Test Suite...\n');

// ── 1. Geodesic area and distance math at latitude 0 and 24 ──
console.log('Test 1: Geodesic area and distance math...');
assert.equal(MIN_SIDE_KM, 2);
assert.equal(MAX_SIDE_KM, 30);
assert.equal(MAX_AREA_KM2, 900);

const cBox = bboxFromCorners([92, 25], [91, 24]);
assert.deepEqual(cBox, { west: 91, south: 24, east: 92, north: 25 });
const normBox = normalizeBbox({ west: 10, south: 20, east: 5, north: 15 });
assert.deepEqual(normBox, { west: 5, south: 15, east: 10, north: 20 });
// 1 deg latitude difference should be approx 111.2 km (authalic Earth radius)
const equatorBox = { west: 0, south: 0, east: 1, north: 1 };
const dimsEquator = computeBboxDimensions(equatorBox);
assert.ok(
  Math.abs(dimsEquator.heightKm - 111.2) < 0.3,
  `Expected height ~111.2 km at equator, got ${dimsEquator.heightKm}`
);
assert.ok(
  Math.abs(dimsEquator.widthKm - 111.2) < 0.3,
  `Expected width ~111.2 km at equator, got ${dimsEquator.widthKm}`
);

// At latitude 24 (e.g. Bangladesh / Sylhet latitude)
const sylhetLatBox = { west: 91, south: 24, east: 92, north: 25 };
const dimsSylhet = computeBboxDimensions(sylhetLatBox);
assert.ok(
  Math.abs(dimsSylhet.heightKm - 111.2) < 0.3,
  `Expected height ~111.2 km at lat 24-25, got ${dimsSylhet.heightKm}`
);
// Width at mid-lat 24.5 should be approx 111.2 * cos(24.5 deg) = 111.2 * 0.90996 = ~101.2 km
const expectedWidth24 = 111.195 * Math.cos(24.5 * (Math.PI / 180));
assert.ok(
  Math.abs(dimsSylhet.widthKm - expectedWidth24) < 0.3,
  `Expected width ~${expectedWidth24.toFixed(1)} km at lat 24.5, got ${dimsSylhet.widthKm}`
);
console.log('✓ Geodesic math verified at equator and lat 24');

// ── 2. Clamping and Scale rule for boxes of 3, 10, 20 and 30 km ──
console.log('Test 2: Scale rule for 3, 10, 20, 30 km boxes...');
const testBoxes = [
  { widthKm: 3, heightKm: 3, expectedScale: 10, expectedMaxPix: 300 },
  { widthKm: 10, heightKm: 10, expectedScale: 10, expectedMaxPix: 1000 },
  { widthKm: 20, heightKm: 20, expectedScale: 20, expectedMaxPix: 1000 },
  { widthKm: 30, heightKm: 30, expectedScale: 20, expectedMaxPix: 1500 },
];

for (const tb of testBoxes) {
  const rec = computeExportScale({ widthKm: tb.widthKm, heightKm: tb.heightKm, areaKm2: tb.widthKm * tb.heightKm }, 1);
  assert.equal(rec.scale, tb.expectedScale, `Scale for ${tb.widthKm}km box should be ${tb.expectedScale}`);
  assert.ok(rec.pixelsX <= 1500, `PixelsX ${rec.pixelsX} must be <= 1500`);
  assert.ok(rec.pixelsY <= 1500, `PixelsY ${rec.pixelsY} must be <= 1500`);
  assert.equal(Math.max(rec.pixelsX, rec.pixelsY), tb.expectedMaxPix, `Max pixels should match ${tb.expectedMaxPix}`);
  assert.ok(rec.uncompressedBytes > 0, 'Uncompressed bytes should be > 0');
  assert.ok(rec.note.includes('Compressed GeoTIFF'), 'Should include compressed explanation note');
}
console.log('✓ Scale rule verified for 3km, 10km, 20km, 30km boxes');

// Clamping limits validation
const tooSmall = { west: 91.0, south: 24.0, east: 91.005, north: 24.005 }; // < 1 km
const valSmall = validateBbox(tooSmall);
assert.equal(valSmall.valid, false);
assert.ok(valSmall.reason.includes('must be at least 2 km'));

const tooLarge = { west: 90.0, south: 24.0, east: 91.0, north: 25.0 }; // ~100 km
const valLarge = validateBbox(tooLarge);
assert.equal(valLarge.valid, false);
assert.ok(valLarge.reason.includes('must be at most 30 km'));

const clamped = clampBboxToLimits(tooLarge);
const dimsClamped = computeBboxDimensions(clamped);
assert.ok(dimsClamped.widthKm <= 30.01, `Clamped width ${dimsClamped.widthKm} should be <= 30 km`);
assert.ok(dimsClamped.heightKm <= 30.01, `Clamped height ${dimsClamped.heightKm} should be <= 30 km`);
console.log('✓ Clamping limits and reasons verified');

// ── 3. Date Handling and Validation ──
console.log('Test 3: Date handling and validation...');
// Valid non-overlapping windows
const v1 = validateDateWindows(
  { start: '2022-05-01', end: '2022-05-15' },
  { start: '2022-06-01', end: '2022-06-15' }
);
assert.equal(v1.valid, true);

// Overlapping windows
const vOverlap = validateDateWindows(
  { start: '2022-05-01', end: '2022-05-20' },
  { start: '2022-05-15', end: '2022-06-01' }
);
assert.equal(vOverlap.valid, false);
assert.ok(vOverlap.reason.includes('cannot overlap'));

// Window > 60 days
const vLong = validateDateWindows(
  { start: '2022-01-01', end: '2022-03-15' }, // 74 days
  { start: '2022-04-01', end: '2022-04-10' }
);
assert.equal(vLong.valid, false);
assert.ok(vLong.reason.includes('exceeds maximum of 60 days'));

// Event date suggest helper
const suggested = suggestWindowsForEvent('2022-06-20');
assert.equal(suggested.after.start, '2022-06-20');
assert.equal(suggested.after.end, '2022-07-01');
assert.equal(suggested.before.end, '2022-06-08');
assert.equal(suggested.before.start, '2022-05-04');
const vSuggested = validateDateWindows(suggested.before, suggested.after);
assert.equal(vSuggested.valid, true);

assert.ok(SEASONAL_WARNING_TEXT.includes('same season'));
console.log('✓ Date validation and event suggestion helper verified');

// ── 4. ASF Grouping and "Usable" Rule ──
console.log('Test 4: ASF grouping and usability rule...');
const mockGranules = [
  // Track 77 Descending: 2 before, 1 after -> usable!
  { platform: 'Sentinel-1A', flightDirection: 'DESCENDING', pathNumber: 77, startTime: '2022-05-05T00:00:00Z' },
  { platform: 'Sentinel-1A', flightDirection: 'DESCENDING', pathNumber: 77, startTime: '2022-05-17T00:00:00Z' },
  { platform: 'Sentinel-1A', flightDirection: 'DESCENDING', pathNumber: 77, startTime: '2022-06-10T00:00:00Z' },
  // Track 141 Ascending: 1 before, 0 after -> NOT usable
  { platform: 'Sentinel-1A', flightDirection: 'ASCENDING', pathNumber: 141, startTime: '2022-05-08T00:00:00Z' },
  // Track 91 Descending: 0 before, 2 after -> NOT usable
  { platform: 'Sentinel-1A', flightDirection: 'DESCENDING', pathNumber: 91, startTime: '2022-06-05T00:00:00Z' },
  { platform: 'Sentinel-1A', flightDirection: 'DESCENDING', pathNumber: 91, startTime: '2022-06-17T00:00:00Z' },
];

const beforeWin = { start: '2022-05-01', end: '2022-05-25' };
const afterWin = { start: '2022-06-01', end: '2022-06-25' };
const groups = groupAsfResults(mockGranules, beforeWin, afterWin);

assert.equal(groups.length, 3);
const grp77 = groups.find((g) => g.relativeOrbit === 77);
assert.ok(grp77);
assert.equal(grp77.usable, true);
assert.equal(grp77.beforeCount, 2);
assert.equal(grp77.afterCount, 1);
assert.equal(grp77.flightDirection, 'DESCENDING');

const grp141 = groups.find((g) => g.relativeOrbit === 141);
assert.ok(grp141);
assert.equal(grp141.usable, false);
assert.equal(grp141.beforeCount, 1);
assert.equal(grp141.afterCount, 0);

const grp91 = groups.find((g) => g.relativeOrbit === 91);
assert.ok(grp91);
assert.equal(grp91.usable, false);
assert.equal(grp91.beforeCount, 0);
assert.equal(grp91.afterCount, 2);
console.log('✓ ASF result grouping and usable geometry rule verified');

// ── 5. Script Generator vs Reference Script (scripts/gee/export_sylhet.js) ──
console.log('Test 5: Script generator and reference comparison...');
const refScriptPath = path.resolve(rootDir, 'scripts/gee/export_sylhet.js');
const refScript = fs.readFileSync(refScriptPath, 'utf8');

// Verify key reference lines exist in reference script
assert.ok(refScript.includes("ee.ImageCollection('COPERNICUS/S1_GRD')"));
assert.ok(refScript.includes(".filter(ee.Filter.eq('instrumentMode', 'IW'))"));
assert.ok(refScript.includes(".filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))"));
assert.ok(refScript.includes(".mosaic()"));
assert.ok(refScript.includes(".clip(aoi)"));
assert.ok(refScript.includes("crs = 'EPSG:4326'"));

// Generate parameterized script with PASS and ORBIT
const genWithOrbit = generateGeeScript({
  bbox: { west: 91.8, south: 24.85, east: 91.95, north: 24.98 },
  startDateA: '2022-05-01',
  endDateA: '2022-05-10',
  startDateB: '2022-06-20',
  endDateB: '2022-06-21',
  pass: 'DESCENDING',
  relativeOrbit: 77,
  scale: 20,
  prefix: 'test_sylhet',
});

// Checks on generated script with orbit
assert.ok(genWithOrbit.includes("var PASS = 'DESCENDING';"));
assert.ok(genWithOrbit.includes('var ORBIT = 77;'));
assert.ok(genWithOrbit.includes("ee.Filter.eq('orbitProperties_pass', PASS)"));
assert.ok(genWithOrbit.includes("ee.Filter.eq('relativeOrbitNumber_start', ORBIT)"));
assert.ok(genWithOrbit.includes("ee.ImageCollection('COPERNICUS/S1_GRD')"));
assert.ok(genWithOrbit.includes("instrumentMode', 'IW'"));
assert.ok(genWithOrbit.includes("transmitterReceiverPolarisation', 'VV'"));
assert.ok(genWithOrbit.includes(".mosaic()"));
assert.ok(genWithOrbit.includes(".clip(aoi)"));
assert.ok(genWithOrbit.includes('91.8, // west'));
assert.ok(genWithOrbit.includes('24.85, // south'));
assert.ok(genWithOrbit.includes('var scale = 20;'));
assert.ok(genWithOrbit.includes("crs = 'EPSG:4326'"));
assert.ok(genWithOrbit.includes("fileNamePrefix: 'image_a'"));
assert.ok(genWithOrbit.includes("fileNamePrefix: 'image_b'"));
assert.ok(genWithOrbit.includes('description: \'test_sylhet_image_a\''));

// Generate parameterized script without PASS and ORBIT (null / auto-selection)
const genNullOrbit = generateGeeScript({
  bbox: { west: 91.8, south: 24.85, east: 91.95, north: 24.98 },
  startDateA: '2022-05-01',
  endDateA: '2022-05-10',
  startDateB: '2022-06-20',
  endDateB: '2022-06-21',
  pass: null,
  relativeOrbit: null,
});

assert.ok(genNullOrbit.includes('var PASS = null;'));
assert.ok(genNullOrbit.includes('var ORBIT = null;'));
assert.ok(genNullOrbit.includes('if (PASS === null || ORBIT === null)'));
assert.ok(genNullOrbit.includes("aggregate_array('orbitProperties_pass')"));
assert.ok(genNullOrbit.includes("aggregate_array('relativeOrbitNumber_start')"));
assert.ok(genNullOrbit.includes('candidates.sort'));
assert.ok(genNullOrbit.includes('No single orbit geometry has images in both windows. Widen a window or move the area.'));
assert.ok(genNullOrbit.includes('Selected single-geometry orbit group: '));

console.log('✓ Script generator matches reference script and handles both set & null orbit auto-selection constraints');

console.log('\nAll Area Picker (lib/aoi.ts) tests passed successfully!');
