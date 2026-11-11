// tools/test-availability.mjs
// Unit tests for pure availabilitySummary and nisarAvailabilitySummary functions.
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

// In-memory TypeScript loader
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
  availabilitySummary,
  nisarAvailabilitySummary,
  NISAR_EARLIEST_BETA_DATE,
  NISAR_EARLIEST_PROVISIONAL_DATE,
} = aoiModule;

console.log('Running Availability Summary & NISAR Messages Test Suite...\n');

const windowA = { start: '2022-05-15', end: '2022-06-08' };
const windowB = { start: '2022-06-15', end: '2022-07-09' };

// 1. Not checked yet
console.log('Test 1: Not checked yet state...');
const resNotChecked = availabilitySummary({
  searched: false,
  groups: [],
  beforeWindow: windowA,
  afterWindow: windowB,
});
assert.equal(resNotChecked.state, 'not_checked');
assert.equal(resNotChecked.headline, 'Not checked yet');
console.log('✓ Not checked yet verified');

// 2. Results out of date
console.log('Test 2: Results out of date state...');
const resOutOfDate = availabilitySummary({
  searched: true,
  outOfDate: true,
  groups: [],
  beforeWindow: windowA,
  afterWindow: windowB,
});
assert.equal(resOutOfDate.state, 'out_of_date');
assert.equal(resOutOfDate.headline, 'Results are out of date; search again');
console.log('✓ Results out of date verified');

// 3. No acquisitions in either window
console.log('Test 3: No acquisitions in either window...');
const resNoEither = availabilitySummary({
  searched: true,
  groups: [],
  beforeWindow: windowA,
  afterWindow: windowB,
});
assert.equal(resNoEither.state, 'no_either');
assert.ok(resNoEither.headline.includes('No Sentinel-1 acquisitions found in either window'));
assert.ok(resNoEither.headline.includes(windowA.start));
assert.ok(resNoEither.headline.includes(windowB.end));
console.log('✓ No acquisitions in either window verified');

// 4. No acquisitions in before window
console.log('Test 4: No acquisitions in before window...');
const resNoBefore = availabilitySummary({
  searched: true,
  groups: [
    {
      id: 'S1_DESCENDING_77',
      flightDirection: 'DESCENDING',
      relativeOrbit: 77,
      beforeCount: 0,
      afterCount: 3,
      usable: false,
    },
  ],
  beforeWindow: windowA,
  afterWindow: windowB,
});
assert.equal(resNoBefore.state, 'no_before');
assert.ok(resNoBefore.headline.includes('No Sentinel-1 acquisitions found in the before window'));
assert.ok(resNoBefore.headline.includes(windowA.start));
console.log('✓ No acquisitions in before window verified');

// 5. No acquisitions in after window
console.log('Test 5: No acquisitions in after window...');
const resNoAfter = availabilitySummary({
  searched: true,
  groups: [
    {
      id: 'S1_DESCENDING_77',
      flightDirection: 'DESCENDING',
      relativeOrbit: 77,
      beforeCount: 4,
      afterCount: 0,
      usable: false,
    },
  ],
  beforeWindow: windowA,
  afterWindow: windowB,
});
assert.equal(resNoAfter.state, 'no_after');
assert.ok(resNoAfter.headline.includes('No Sentinel-1 acquisitions found in the after window'));
assert.ok(resNoAfter.headline.includes(windowB.end));
console.log('✓ No acquisitions in after window verified');

// 6. Disjoint orbits (no single orbit geometry in both windows)
console.log('Test 6: Disjoint orbit geometries...');
const resDisjoint = availabilitySummary({
  searched: true,
  groups: [
    {
      id: 'S1_DESCENDING_77',
      flightDirection: 'DESCENDING',
      relativeOrbit: 77,
      beforeCount: 3,
      afterCount: 0,
      usable: false,
    },
    {
      id: 'S1_ASCENDING_150',
      flightDirection: 'ASCENDING',
      relativeOrbit: 150,
      beforeCount: 0,
      afterCount: 2,
      usable: false,
    },
  ],
  beforeWindow: windowA,
  afterWindow: windowB,
});
assert.equal(resDisjoint.state, 'no_common_geometry');
assert.equal(resDisjoint.headline, 'No single orbit geometry has images in both windows.');
assert.ok(resDisjoint.details.includes('DESCENDING track 77'));
assert.ok(resDisjoint.details.includes('ASCENDING track 150'));
console.log('✓ Disjoint orbit geometries verified');

// 7. Usable orbit geometry found
console.log('Test 7: Usable orbit geometry...');
const resUsable = availabilitySummary({
  searched: true,
  groups: [
    {
      id: 'S1_DESCENDING_77',
      flightDirection: 'DESCENDING',
      relativeOrbit: 77,
      beforeCount: 8,
      afterCount: 5,
      usable: true,
    },
  ],
  beforeWindow: windowA,
  afterWindow: windowB,
});
assert.equal(resUsable.state, 'usable');
assert.equal(resUsable.headline, 'Usable orbit geometry: DESCENDING track 77 (8 before, 5 after)');
console.log('✓ Usable orbit geometry verified');

// 8. NISAR before mission start date
console.log('Test 8: NISAR before mission start date...');
const resNisarEarly = nisarAvailabilitySummary({
  searched: true,
  granuleCount: 0,
  latestWindowEndDate: '2022-06-25',
});
assert.equal(resNisarEarly.state, 'before_mission_start');
assert.ok(resNisarEarly.message.includes(`NISAR L-band products on ASF start on ${NISAR_EARLIEST_BETA_DATE}`));
assert.ok(resNisarEarly.note.includes('not used by the script generator or file uploader'));

const resNisarProv = nisarAvailabilitySummary({
  searched: true,
  granuleCount: 0,
  latestWindowEndDate: '2025-10-15',
  earliestProductDate: NISAR_EARLIEST_PROVISIONAL_DATE,
});
assert.equal(resNisarProv.state, 'before_mission_start');
assert.ok(resNisarProv.message.includes(`NISAR L-band products on ASF start on ${NISAR_EARLIEST_PROVISIONAL_DATE}`));
console.log('✓ NISAR before mission start verified');

// 9. NISAR after start date with 0 results
console.log('Test 9: NISAR after start date with 0 results...');
const resNisarZero = nisarAvailabilitySummary({
  searched: true,
  granuleCount: 0,
  latestWindowEndDate: '2026-06-01',
});
assert.equal(resNisarZero.state, 'zero_results');
assert.equal(resNisarZero.message, 'No NISAR products were found for this area and these dates.');
console.log('✓ NISAR zero results verified');

// 10. NISAR after start date with matching granules
console.log('Test 10: NISAR with positive granules...');
const resNisarFound = nisarAvailabilitySummary({
  searched: true,
  granuleCount: 12,
  latestWindowEndDate: '2026-08-01',
});
assert.equal(resNisarFound.state, 'found');
assert.equal(resNisarFound.message, 'Found 12 NISAR acquisition(s).');
console.log('✓ NISAR positive results verified');

console.log('\nAll Availability Summary & NISAR tests passed successfully!');

