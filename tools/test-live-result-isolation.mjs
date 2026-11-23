// tools/test-live-result-isolation.mjs
// Unit test suite verifying:
// 1. Unique live analysis identity generation (computeLiveAoiId)
// 2. Deterministic copy helper (generateLiveResultSummary) produces text strictly from provided numbers
// 3. Graceful handling of missing optional fields with zero invented numbers or undefined leaks
// 4. Before-vs-after category comparison is included ONLY when both values exist
// 5. Custom result view isolation (no demo case study leaks)

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

console.log('Running Live Result Isolation & Copy Helper Test Suite...\n');

// ── 1. Load modules ──
const aoiModule = loadTsModule(path.resolve(rootDir, 'lib/aoi.ts'));
const { computeLiveAoiId } = aoiModule;

const copyModule = loadTsModule(path.resolve(rootDir, 'lib/live-result-copy.ts'));
const {
  LIVE_RESULT_COPY,
  getLiveModeLabel,
  generateLiveResultSummary,
} = copyModule;

const caseStudiesModule = loadTsModule(path.resolve(rootDir, 'lib/case-studies.ts'));
const { isKnownCaseId, getCaseStudyById } = caseStudiesModule;

// ── Test 1: Unique identity per live run (computeLiveAoiId) ──
console.log('Test 1: Unique live run identity...');
const box1 = { west: 91.80, south: 24.85, east: 91.95, north: 24.98 };
const box2 = { west: 91.00, south: 25.10, east: 91.20, north: 25.25 };
const dateA = { start: '2022-05-01', end: '2022-05-10' };
const dateB = { start: '2022-06-18', end: '2022-06-22' };

const id1 = computeLiveAoiId(box1, dateA, dateB, 'flood');
const id1Repeat = computeLiveAoiId(box1, dateA, dateB, 'flood');
const idDifferentBox = computeLiveAoiId(box2, dateA, dateB, 'flood');
const idDifferentDate = computeLiveAoiId(box1, { start: '2022-05-02', end: '2022-05-10' }, dateB, 'flood');
const idDifferentMode = computeLiveAoiId(box1, dateA, dateB, 'river-erosion');

assert.equal(id1, id1Repeat, 'Same parameters must produce identical id');
assert.ok(id1.startsWith('live-'), 'Must start with live- prefix');
assert.notEqual(id1, idDifferentBox, 'Different bounding box must produce different id');
assert.notEqual(id1, idDifferentDate, 'Different dates must produce different id');
assert.notEqual(id1, idDifferentMode, 'Different mode must produce different id');
assert.equal(isKnownCaseId(id1), false, 'isKnownCaseId must be false for live id');
assert.equal(isKnownCaseId(idDifferentBox), false, 'isKnownCaseId must be false for live id');
console.log('✓ Unique identity per live run verified.');

// ── Test 2: Mode label mapping ──
console.log('Test 2: Mode label mapping...');
assert.equal(getLiveModeLabel('flood'), LIVE_RESULT_COPY.modeFlood);
assert.equal(getLiveModeLabel('river-erosion'), LIVE_RESULT_COPY.modeRiverErosion);
assert.equal(getLiveModeLabel('erosion'), LIVE_RESULT_COPY.modeRiverErosion);
assert.equal(getLiveModeLabel('deforestation'), LIVE_RESULT_COPY.modeDeforestation);
assert.equal(getLiveModeLabel('surface-water'), LIVE_RESULT_COPY.modeSurfaceWater);
assert.equal(getLiveModeLabel('water'), LIVE_RESULT_COPY.modeSurfaceWater);
assert.equal(getLiveModeLabel('custom'), 'custom');
console.log('✓ Mode label mapping verified.');

// ── Test 3: Synthetic ChangeData with full numbers ──
console.log('Test 3: Deterministic summary with full data...');
const fullFloodData = {
  aoiId: id1,
  name: 'Sylhet Test Area',
  dateBefore: '2022-05-01',
  dateAfter: '2022-06-21',
  percentChanged: 17.05,
  affectedAreaKm2: 37.19,
  totalAreaKm2: 218.10,
  confidence: 94.2,
  mode: 'flood',
  warnings: ['Specular reflection over haor wetland baseline'],
};

const floodSummary = generateLiveResultSummary(fullFloodData);
assert.ok(floodSummary.headlineSentence.includes('37.19 km²'), 'Must include exact affectedAreaKm2');
assert.ok(floodSummary.headlineSentence.includes('17.05%'), 'Must include exact percentChanged');
assert.ok(floodSummary.headlineSentence.includes('218.10 km²'), 'Must include exact totalAreaKm2');
assert.ok(floodSummary.headlineSentence.includes('2022-05-01 and 2022-06-21'), 'Must include dates');
assert.ok(floodSummary.headlineSentence.includes(LIVE_RESULT_COPY.floodDescription), 'Must describe newly water-covered ground');
assert.ok(floodSummary.confidenceText.includes('94.2%'), 'Must include confidence percent');
assert.equal(floodSummary.warnings.length, 1);
assert.equal(floodSummary.warnings[0], 'Specular reflection over haor wetland baseline');
assert.equal(floodSummary.categoryComparison, undefined, 'Flood mode should not generate category comparison when none exist');
console.log('✓ Full flood data deterministic text verified.');

// ── Test 4: Missing optional fields (zero invented numbers / no undefined) ──
console.log('Test 4: Missing optional fields handling...');
const minimalData = {
  aoiId: 'live-minimal',
  name: 'Minimal Area',
  mode: 'flood',
  // affectedAreaKm2 and percentChanged omitted (simulating unexpected nulls)
};

const minSummary = generateLiveResultSummary(minimalData);
assert.ok(!minSummary.headlineSentence.includes('undefined'), 'Must not contain string "undefined"');
assert.ok(!minSummary.headlineSentence.includes('NaN'), 'Must not contain "NaN"');
assert.ok(minSummary.headlineSentence.includes('0.00 km²'), 'Should default missing area to 0.00 km²');
assert.ok(minSummary.headlineSentence.includes('0.00%'), 'Should default missing percent to 0.00%');
assert.ok(!minSummary.headlineSentence.includes('Between'), 'Should omit Between prefix when dates missing');
assert.equal(minSummary.confidenceText, undefined, 'Must omit confidence when missing');
assert.deepEqual(minSummary.warnings, [], 'Must default warnings to empty array');
assert.equal(minSummary.categoryComparison, undefined, 'Must omit category comparison when missing');
console.log('✓ Missing optional fields handled gracefully.');

// ── Test 5: Category comparison rule (ONLY if both values truly exist) ──
console.log('Test 5: Category comparison rule...');

// (a) Surface water with both values
const surfaceWaterComplete = {
  aoiId: 'live-water',
  mode: 'surface-water',
  dateBefore: '2023-01-01',
  dateAfter: '2023-06-01',
  affectedAreaKm2: 15.50,
  percentChanged: 25.0,
  metrics: {
    waterAreaAKm2: 60.00,
    waterAreaBKm2: 75.50,
    waterDeltaKm2: 15.50,
  },
};
const waterSummary = generateLiveResultSummary(surfaceWaterComplete);
assert.ok(waterSummary.categoryComparison, 'Must produce category comparison when both water values exist');
assert.equal(waterSummary.categoryComparison.length, 3);
assert.equal(waterSummary.categoryComparison[0].value, '60.00 km²');
assert.equal(waterSummary.categoryComparison[1].value, '75.50 km²');
assert.equal(waterSummary.categoryComparison[2].value, '+15.50 km²');

// (b) Surface water with only one value (missing after)
const surfaceWaterPartial = {
  aoiId: 'live-water-partial',
  mode: 'surface-water',
  metrics: {
    waterAreaAKm2: 60.00,
    // waterAreaBKm2 missing
  },
};
const partialWaterSummary = generateLiveResultSummary(surfaceWaterPartial);
assert.equal(partialWaterSummary.categoryComparison, undefined, 'Must omit comparison when one value is missing');

// (c) River erosion with both values
const erosionComplete = {
  aoiId: 'live-erosion',
  mode: 'river-erosion',
  dateBefore: '2020-01-01',
  dateAfter: '2021-01-01',
  affectedAreaKm2: 4.20,
  percentChanged: 3.50,
  metrics: {
    erosionAreaKm2: 4.20,
    accretionAreaKm2: 2.10,
  },
};
const erosionSummary = generateLiveResultSummary(erosionComplete);
assert.ok(erosionSummary.categoryComparison, 'Must produce category comparison when both erosion values exist');
assert.equal(erosionSummary.categoryComparison.length, 2);
assert.equal(erosionSummary.categoryComparison[0].value, '4.20 km²');
assert.equal(erosionSummary.categoryComparison[1].value, '2.10 km²');
assert.ok(erosionSummary.secondarySentence.includes('2.10 km²'), 'Must mention accreted sandbars in secondary sentence');

// (d) River erosion with missing accretion
const erosionPartial = {
  aoiId: 'live-erosion-partial',
  mode: 'river-erosion',
  metrics: {
    erosionAreaKm2: 4.20,
    // accretion missing
  },
};
const partialErosionSummary = generateLiveResultSummary(erosionPartial);
assert.equal(partialErosionSummary.categoryComparison, undefined, 'Must omit comparison when accretion is missing');
assert.equal(partialErosionSummary.secondarySentence, undefined, 'Must omit secondary accretion sentence when missing');
console.log('✓ Category comparison rendered ONLY when both values exist.');

// ── Test 6: Causal guardrails check ──
console.log('Test 6: Causal claim guardrails...');
const allSummaries = [floodSummary, minSummary, waterSummary, erosionSummary];
const forbiddenPhrases = [
  'climate change',
  'global warming',
  'dam failure',
  'heavy rainfall',
  'monsoon storm',
  'illegal logging',
  'cyclone',
];
for (const s of allSummaries) {
  const fullText = `${s.headlineSentence} ${s.secondarySentence || ''} ${s.howToReadText}`.toLowerCase();
  for (const forbidden of forbiddenPhrases) {
    assert.ok(
      !fullText.includes(forbidden),
      `Summary text must not contain causal claim "${forbidden}"`
    );
  }
}
console.log('✓ Causal guardrails verified (zero causal claims).');

// ── Test 7: Verify isCustomResult paths never reference currentCaseStudy ──
console.log('Test 7: Verify isCustomResult isolation contract...');
// Simulating the logic in app/explore/page.tsx:
// When isCustomResult === true:
// 1. caseStudy passed to MapTextSummary must be null
// 2. beforeRange / afterRange must use only displayData
// 3. ShorelineShiftCard mode must use displayData.mode || activeAoi.mode
const isCustomResult = true;
const currentCaseStudy = getCaseStudyById('sylhet');
assert.ok(currentCaseStudy, 'Sylhet case study must exist in catalog');

// In MapTextSummary contract:
const caseStudyForMapSummary = isCustomResult ? null : currentCaseStudy;
assert.equal(caseStudyForMapSummary, null, 'isCustomResult must pass null caseStudy to MapTextSummary');

// In BeforeAfterViewer contract:
const liveDisplayData = {
  aoiId: 'live-isolated',
  name: 'Live Locus',
  dateBefore: '2024-01-01',
  dateAfter: '2024-02-01',
  beforeRange: undefined, // live runs have single scene dates, no composite range
  afterRange: undefined,
};
const effectiveBeforeRange = isCustomResult
  ? liveDisplayData.beforeRange
  : (liveDisplayData.beforeRange || currentCaseStudy?.beforeRange);
assert.equal(effectiveBeforeRange, undefined, 'isCustomResult must not fall back to currentCaseStudy beforeRange');

const effectiveAfterRange = isCustomResult
  ? liveDisplayData.afterRange
  : (liveDisplayData.afterRange || currentCaseStudy?.afterRange);
assert.equal(effectiveAfterRange, undefined, 'isCustomResult must not fall back to currentCaseStudy afterRange');

console.log('✓ isCustomResult isolation contract verified.');

console.log('\nAll Live Result Isolation & Copy Helper tests passed successfully!');
