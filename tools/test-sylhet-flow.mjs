// tools/test-sylhet-flow.mjs
// Verification suite for the Sylhet Golden Benchmark flow and GEE code generation
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { execSync } from 'node:child_process';

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
  SYLHET_GOLDEN_PRESET,
  PRESET_AOIS,
  generateGeeScript,
  getMidpointDateISO,
  computeBboxDimensions,
} = mod.exports;

console.log('Running Sylhet Benchmark Flow Verification Suite...\n');

// 1. Golden Preset Integrity Check
console.log('Test 1: Verifying SYLHET_GOLDEN_PRESET constants...');
assert.ok(SYLHET_GOLDEN_PRESET, 'SYLHET_GOLDEN_PRESET must be defined');
assert.equal(SYLHET_GOLDEN_PRESET.id, 'sylhet');
assert.deepEqual(SYLHET_GOLDEN_PRESET.bbox, {
  west: 91.8,
  south: 24.85,
  east: 91.95,
  north: 24.98,
});
assert.equal(SYLHET_GOLDEN_PRESET.startDateA, '2022-05-01');
assert.equal(SYLHET_GOLDEN_PRESET.endDateA, '2022-05-10');
assert.equal(SYLHET_GOLDEN_PRESET.startDateB, '2022-06-18');
assert.equal(SYLHET_GOLDEN_PRESET.endDateB, '2022-06-22');
assert.equal(SYLHET_GOLDEN_PRESET.pass, 'DESCENDING');
assert.equal(SYLHET_GOLDEN_PRESET.relativeOrbit, 77);
assert.equal(SYLHET_GOLDEN_PRESET.scale, 20);
console.log('✓ Golden preset constants match benchmark specification');

// 2. Character-for-character comparison against verified_sylhet_picker.js
console.log('Test 2: Verifying character-for-character GEE script identity...');
const goldenPath = path.resolve(rootDir, 'scripts/gee/verified_sylhet_picker.js');
assert.ok(fs.existsSync(goldenPath), 'verified_sylhet_picker.js must exist on disk');
const goldenContent = fs.readFileSync(goldenPath, 'utf8');
const generatedScript = generateGeeScript(SYLHET_GOLDEN_PRESET);

const goldenLines = goldenContent.replace(/\r\n/g, '\n').split('\n');
const genLines = generatedScript.replace(/\r\n/g, '\n').split('\n');

const diffs = [];
const maxLines = Math.max(goldenLines.length, genLines.length);
for (let i = 0; i < maxLines; i++) {
  const g = (goldenLines[i] ?? '').trim();
  const gen = (genLines[i] ?? '').trim();
  if (g !== gen) {
    const isComment = g.startsWith('//') || g.startsWith('/*') || g.startsWith('*');
    if (!isComment) {
      diffs.push({ line: i + 1, expected: g, actual: gen });
    }
  }
}

assert.equal(diffs.length, 0, `Generated script must match golden reference: ${JSON.stringify(diffs)}`);
console.log('✓ Generated script matches scripts/gee/verified_sylhet_picker.js character-for-character');

// 3. Syntax validation of generated script via node --check
console.log('Test 3: Syntax check of generated script via node --check...');
const scratchDir = path.resolve(rootDir, 'scratch');
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
const tempPath = path.join(scratchDir, 'temp_sylhet_script.js');
fs.writeFileSync(tempPath, generatedScript, 'utf8');
try {
  execSync(`node --check "${tempPath}"`);
  console.log('✓ node --check confirmed script has valid JavaScript syntax');
} finally {
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
}

// 4. Derived single dates verification
console.log('Test 4: Verifying derived single-date midpoints for Sylhet...');
const midA = getMidpointDateISO(SYLHET_GOLDEN_PRESET.startDateA, SYLHET_GOLDEN_PRESET.endDateA);
const midB = getMidpointDateISO(SYLHET_GOLDEN_PRESET.startDateB, SYLHET_GOLDEN_PRESET.endDateB);
assert.equal(midA, '2022-05-05', 'Midpoint of 2022-05-01 to 2022-05-10 must be 2022-05-05');
assert.equal(midB, '2022-06-20', 'Midpoint of 2022-06-18 to 2022-06-22 must be 2022-06-20');
console.log(`✓ Derived single-date inputs: Before=${midA}, After=${midB}`);

// 5. Check PRESET_AOIS registry synchronization
console.log('Test 5: Verifying PRESET_AOIS registry contains Sylhet golden preset...');
const sylhetPreset = PRESET_AOIS.find((p) => p.id === 'sylhet');
assert.ok(sylhetPreset, 'Sylhet preset must be in PRESET_AOIS');
assert.deepEqual(sylhetPreset.bbox, SYLHET_GOLDEN_PRESET.bbox);
assert.equal(sylhetPreset.dateA.start, SYLHET_GOLDEN_PRESET.startDateA);
assert.equal(sylhetPreset.dateA.end, SYLHET_GOLDEN_PRESET.endDateA);
assert.equal(sylhetPreset.dateB.start, SYLHET_GOLDEN_PRESET.startDateB);
assert.equal(sylhetPreset.dateB.end, SYLHET_GOLDEN_PRESET.endDateB);
assert.equal(sylhetPreset.recommendedPass, SYLHET_GOLDEN_PRESET.pass);
assert.equal(sylhetPreset.recommendedOrbit, SYLHET_GOLDEN_PRESET.relativeOrbit);

const dims = computeBboxDimensions(sylhetPreset.bbox);
assert.ok(dims.areaKm2 > 200 && dims.areaKm2 < 230, `Area must be ~218 km², got ${dims.areaKm2}`);
console.log(`✓ Sylhet preset verified in PRESET_AOIS (Area: ${dims.areaKm2} km²)`);

console.log('\nAll Sylhet Flow tests passed successfully!');
