// tools/test-asf-search.mjs
// Verification suite for ASF catalogue search logic, date math, 4-5 month separation, and 24-day search windows
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

// ── In-memory TypeScript loader for lib/aoi.ts ──
const aoiSrc = fs.readFileSync(path.resolve(rootDir, 'lib/aoi.ts'), 'utf8');
const transpiled = ts.transpileModule(aoiSrc, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const mod = { exports: {} };
const wrapper = vm.runInThisContext(
  `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText} \n})`
);
wrapper(mod.exports, require, mod, __filename, __dirname);
const {
  addDaysISO,
  getMidpointDateISO,
  expandSingleDateToWindow,
  getDefaultBeforeAfterTargets,
  groupAsfResults,
  validateDateWindows,
  PRESET_AOIS,
} = mod.exports;

console.log('Running ASF Search & Date Utilities Verification Suite...\n');

// 1. Pure date arithmetic tests
console.log('Test 1: Testing addDaysISO date arithmetic...');
assert.equal(addDaysISO('2024-05-01', 10), '2024-05-11');
assert.equal(addDaysISO('2024-05-01', -10), '2024-04-21');
assert.equal(addDaysISO('2024-02-28', 1), '2024-02-29', 'Leap year day handling');
assert.equal(addDaysISO('2024-02-28', 2), '2024-03-01', 'Leap year month rollover');
assert.equal(addDaysISO('2023-02-28', 1), '2023-03-01', 'Non-leap year month rollover');
assert.equal(addDaysISO('2024-01-01', -1), '2023-12-31', 'Year boundary rollback');
console.log('✓ addDaysISO handles day addition, subtraction, leap years, and month rollovers');

// 2. Midpoint date computation tests
console.log('Test 2: Testing getMidpointDateISO...');
assert.equal(getMidpointDateISO('2024-05-01', '2024-05-25'), '2024-05-13');
assert.equal(getMidpointDateISO('2024-05-01', '2024-05-01'), '2024-05-01');
assert.equal(getMidpointDateISO('2022-05-01', '2022-05-10'), '2022-05-05');
assert.equal(getMidpointDateISO('2022-06-18', '2022-06-22'), '2022-06-20');
console.log('✓ getMidpointDateISO computes accurate midpoint dates in UTC');

// 3. 24-day search window expansion test
console.log('Test 3: Testing expandSingleDateToWindow (24-day search window)...');
const targetDate = '2024-07-15';
const win24 = expandSingleDateToWindow(targetDate, 12);
assert.equal(win24.start, '2024-07-03', 'Start date should be target - 12 days');
assert.equal(win24.end, '2024-07-27', 'End date should be target + 12 days');

const daySpan = Math.round((Date.parse(win24.end) - Date.parse(win24.start)) / 86400000);
assert.equal(daySpan, 24, `Search window span must be exactly 24 days (got ${daySpan})`);
console.log('✓ expandSingleDateToWindow produces exact 24-day search window (±12 days)');

// 4. Default 4-5 month separation test
console.log('Test 4: Testing getDefaultBeforeAfterTargets (4.5 month default separation)...');
const targets = getDefaultBeforeAfterTargets();
assert.ok(targets.beforeTarget, 'beforeTarget must be defined');
assert.ok(targets.afterTarget, 'afterTarget must be defined');

const gapDays = Math.round((Date.parse(targets.afterTarget) - Date.parse(targets.beforeTarget)) / 86400000);
const gapMonths = gapDays / 30.4375;
assert.ok(gapDays >= 120 && gapDays <= 150, `Default gap must be 120 to 150 days (got ${gapDays} days)`);
assert.ok(gapMonths >= 4.0 && gapMonths <= 5.0, `Default gap must be 4.0 to 5.0 months (got ${gapMonths.toFixed(2)})`);

const defaultWinA = expandSingleDateToWindow(targets.beforeTarget, 12);
const defaultWinB = expandSingleDateToWindow(targets.afterTarget, 12);
const validRes = validateDateWindows(defaultWinA, defaultWinB);
assert.equal(validRes.valid, true, 'Default auto-generated windows must pass date validation');
console.log(`✓ Default targets: Before=${targets.beforeTarget}, After=${targets.afterTarget} (Gap: ${gapDays} days / ~${gapMonths.toFixed(1)} months)`);

// 5. Presets audit: No 1-day windows, 24-day coverage guaranteed
console.log('Test 5: Auditing all presets in PRESET_AOIS for 24-day window coverage...');
for (const preset of PRESET_AOIS) {
  if (preset.id === 'sylhet') continue; // Sylhet is locked golden preset

  const daysA = Math.round((Date.parse(preset.dateA.end) - Date.parse(preset.dateA.start)) / 86400000);
  const daysB = Math.round((Date.parse(preset.dateB.end) - Date.parse(preset.dateB.start)) / 86400000);

  assert.ok(daysA >= 24, `Preset ${preset.id} dateA window must span at least 24 days (got ${daysA} days)`);
  assert.ok(daysB >= 24, `Preset ${preset.id} dateB window must span at least 24 days (got ${daysB} days)`);

  const valid = validateDateWindows(preset.dateA, preset.dateB);
  assert.equal(valid.valid, true, `Preset ${preset.id} date windows must be valid`);
}

// Specifically verify Amazon preset
const amazon = PRESET_AOIS.find((p) => p.id === 'amazon');
assert.ok(amazon, 'Amazon preset must exist');
const amazonDaysA = Math.round((Date.parse(amazon.dateA.end) - Date.parse(amazon.dateA.start)) / 86400000);
assert.ok(amazonDaysA >= 24, `Amazon baseline window must be at least 24 days, not 1 day (got ${amazonDaysA} days)`);
console.log('✓ All non-golden presets have >= 24-day search windows; Amazon 1-day bug fixed');

// 6. ASF Result Grouping & Usability logic
console.log('Test 6: Verifying groupAsfResults usability and grouping logic...');
const granules = [
  // Orbit 121 Ascending: 1 before, 1 after -> usable
  { platform: 'SENTINEL-1A', flightDirection: 'ASCENDING', relativeOrbit: 121, startTime: '2024-05-05T12:00:00Z' },
  { platform: 'SENTINEL-1A', flightDirection: 'ASCENDING', relativeOrbit: 121, startTime: '2024-09-10T12:00:00Z' },
  // Orbit 77 Descending: 2 before, 0 after -> NOT usable
  { platform: 'SENTINEL-1A', flightDirection: 'DESCENDING', relativeOrbit: 77, startTime: '2024-05-02T12:00:00Z' },
  { platform: 'SENTINEL-1A', flightDirection: 'DESCENDING', relativeOrbit: 77, startTime: '2024-05-14T12:00:00Z' },
  // Orbit 35 Descending: 0 before, 2 after -> NOT usable
  { platform: 'SENTINEL-1A', flightDirection: 'DESCENDING', relativeOrbit: 35, startTime: '2024-09-08T12:00:00Z' },
  { platform: 'SENTINEL-1A', flightDirection: 'DESCENDING', relativeOrbit: 35, startTime: '2024-09-20T12:00:00Z' },
];

const asfGroups = groupAsfResults(
  granules,
  { start: '2024-05-01', end: '2024-05-25' },
  { start: '2024-09-01', end: '2024-09-25' }
);

assert.equal(asfGroups.length, 3, 'Must produce 3 distinct orbit groups');
const usable = asfGroups.filter((g) => g.usable);
assert.equal(usable.length, 1, 'Only Orbit 121 should be marked usable');
assert.equal(usable[0].relativeOrbit, 121);
assert.equal(usable[0].flightDirection, 'ASCENDING');
assert.equal(usable[0].beforeCount, 1);
assert.equal(usable[0].afterCount, 1);

// Empty granules test
const emptyGroups = groupAsfResults(
  [],
  { start: '2024-05-01', end: '2024-05-25' },
  { start: '2024-09-01', end: '2024-09-25' }
);
assert.deepEqual(emptyGroups, [], 'Empty granules array must yield empty groups array without throwing');
console.log('✓ groupAsfResults correctly determines single-orbit usability and handles 0 results gracefully');

console.log('\nAll ASF Search & Date Utilities tests passed successfully!');

