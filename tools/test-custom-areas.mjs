// tools/test-custom-areas.mjs
// Verification suite for custom area script generation, preset isolation, and selectionAfterUserAreaChange.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
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
    if (reqPath.endsWith('.json')) return JSON.parse(fs.readFileSync(reqPath, 'utf8'));
    const candidateTs = reqPath.endsWith('.ts') ? reqPath : `${reqPath}.ts`;
    if (fs.existsSync(candidateTs)) return loadTsModule(candidateTs);
    if (fs.existsSync(reqPath)) return loadTsModule(reqPath);
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
  selectionAfterUserAreaChange,
  generateGeeScript,
  
} = aoiModule;

console.log('Running Custom Areas & Pure Selection Verification Suite...\n');

// ── 1. Unit Tests for selectionAfterUserAreaChange ──
console.log('Test 1: Pure function selectionAfterUserAreaChange...');
const stateA = {
  bbox: { west: 92.15, south: 21.95, east: 92.25, north: 22.05 },
  presetId: 'sylhet',
  presetName: 'Sylhet Division, Bangladesh',
  pass: 'DESCENDING',
  orbit: 77,
};
const resA = selectionAfterUserAreaChange(stateA);
assert.equal(resA.presetId, null);
assert.equal(resA.presetName, null);
assert.equal(resA.pass, null);
assert.equal(resA.orbit, null);
assert.equal(resA.areaLabel, 'Custom area (22, 92.2)');

const stateWithPlace = {
  bbox: { west: 91.95, south: 21.40, east: 92.05, north: 21.50 },
  placeName: "Cox's Bazar Beach, Chittagong",
  presetId: 'jamuna',
};
const resWithPlace = selectionAfterUserAreaChange(stateWithPlace);
assert.equal(resWithPlace.areaLabel, "Cox's Bazar Beach, Chittagong");
assert.equal(resWithPlace.presetId, null);
console.log('✓ selectionAfterUserAreaChange clears preset id, preset name, and orbit constraints correctly');

// ── 2. Custom Boxes Script Generation Tests ──
console.log('Test 2: Generating scripts for three custom areas...');

const customBoxes = [
  {
    name: 'Bandarban',
    bbox: { west: 92.15, south: 21.95, east: 92.25, north: 22.05 },
  },
  {
    name: "Cox's Bazar",
    bbox: { west: 91.95, south: 21.40, east: 92.05, north: 21.50 },
  },
  {
    name: 'Sundarbans',
    bbox: { west: 89.00, south: 21.85, east: 89.10, north: 21.95 },
  },
];

const forbiddenKeywords = [
  'sylhet',
  'tanguar',
  'jamuna',
  'amazon',
  'padma',
  'naria',
  'surma',
  'sirajganj',
  'sunamganj',
  'rondonia',
];

const presetCoordinateStrings = [
  '91.8',
  '24.85',
  '91.95',
  '24.98',
  '90.97976',
  '25.04979',
  '89.6498',
  '-62.20007',
  '90.23272',
];

const scratchDir = path.resolve(rootDir, 'scratch');
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

for (const box of customBoxes) {
  console.log(`  Evaluating custom box: ${box.name}...`);
  const script = generateGeeScript({
    bbox: box.bbox,
    startDateA: '2023-01-20',
    endDateA: '2023-02-13',
    startDateB: '2024-01-20',
    endDateB: '2024-02-13',
    pass: null,
    relativeOrbit: null,
  });

  // (1) Assert exact bbox numbers appear
  assert.ok(script.includes(String(box.bbox.west)), `Script must contain west coordinate ${box.bbox.west}`);
  assert.ok(script.includes(String(box.bbox.south)), `Script must contain south coordinate ${box.bbox.south}`);
  assert.ok(script.includes(String(box.bbox.east)), `Script must contain east coordinate ${box.bbox.east}`);
  assert.ok(script.includes(String(box.bbox.north)), `Script must contain north coordinate ${box.bbox.north}`);

  // (2) Assert none of preset names appear
  for (const kw of forbiddenKeywords) {
    assert.ok(
      !script.toLowerCase().includes(kw),
      `Script for ${box.name} must not contain preset keyword "${kw}"`
    );
  }

  // (3) Assert none of other preset coordinates appear
  for (const coord of presetCoordinateStrings) {
    if (
      coord === String(box.bbox.west) ||
      coord === String(box.bbox.east) ||
      coord === String(box.bbox.south) ||
      coord === String(box.bbox.north)
    ) {
      continue;
    }
    assert.ok(
      !script.includes(coord),
      `Script for ${box.name} must not contain foreign preset coordinate "${coord}"`
    );
  }

  // (4) Assert PASS and ORBIT are null with automatic group selection block present
  assert.ok(script.includes('var PASS = null;'), 'PASS must be initialized to null');
  assert.ok(script.includes('var ORBIT = null;'), 'ORBIT must be initialized to null');
  assert.ok(script.includes('if (PASS === null || ORBIT === null)'), 'Automatic group selection block must be present');

  // (5) Header line shows Custom Area
  assert.ok(script.includes('* AOI: Custom Area'), 'Script header comment must show Custom Area');

  // (6) node --check syntax validation
  const tmpPath = path.join(scratchDir, `tmp_test_${box.name.replace(/[^a-zA-Z]/g, '')}.js`);
  fs.writeFileSync(tmpPath, script, 'utf8');
  try {
    execSync(`node --check "${tmpPath}"`);
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }

  // (7) Mock EE Execution
  let capturedLog = '';
  let capturedError = null;
  const mockContext = {
    print: (msg) => { capturedLog += String(msg) + '\n'; },
    Error: globalThis.Error,
    parseInt: globalThis.parseInt,
    Math: globalThis.Math,
    ee: {
      Geometry: {
        Rectangle: (coords) => ({ coords }),
      },
      ImageCollection: () => ({
        filterBounds: function () { return this; },
        filter: function () { return this; },
        filterDate: function () {
          return {
            aggregate_array: (prop) => ({
              getInfo: () => (prop === 'orbitProperties_pass' ? ['ASCENDING', 'DESCENDING'] : [114, 150]),
            }),
            select: function () { return this; },
            mosaic: function () { return this; },
            clip: function () { return this; },
          };
        },
      }),
      Filter: {
        eq: (k, v) => ({ k, v }),
        listContains: (k, v) => ({ k, v }),
      },
      Date: () => ({
        advance: () => 'mock-advanced-date',
      }),
    },
    Export: {
      image: {
        toDrive: () => {},
      },
    },
  };

  try {
    vm.runInNewContext(script, mockContext);
  } catch (err) {
    capturedError = err;
  }
  assert.equal(capturedError, null, `Mock EE execution should succeed for ${box.name}`);
  assert.ok(capturedLog.includes('Selected single-geometry orbit group'), 'Mock EE should select a single orbit geometry');
}

console.log('✓ All 3 custom area scripts verified: exact bbox, no preset leaks, null orbit, valid syntax, mock EE pass.');
console.log('\nAll Custom Areas tests passed successfully!');
