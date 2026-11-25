// tools/test-change-density.mjs
// Unit tests for lib/change-density.ts (bucketing, cumulative sums, line metrics, edge cases)

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

function loadTsModule(filePath) {
  const resolvedPath = path.resolve(filePath);
  let src = fs.readFileSync(resolvedPath, 'utf8');
  src = src.replace(/from\s+['"]@\/(.*?)['"]/g, (_, p) => {
    const abs = path.resolve(rootDir, p).replace(/\\/g, '/');
    return `from '${abs}'`;
  });

  const transpiled = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const mod = { exports: {} };
  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText} \n})`,
    { filename: resolvedPath }
  );
  wrapper(mod.exports, require, mod, resolvedPath, path.dirname(resolvedPath));
  return mod.exports;
}

const {
  isChangedPixel,
  buildChangeDensityFromBuckets,
  computeChangeDensityFromRgba,
  computeLineMetrics,
} = loadTsModule(path.resolve(rootDir, 'lib/change-density.ts'));

console.log('Running Change Density (lib/change-density.ts) Test Suite...\n');

// Test 1: Pixel classification matches BeforeAfterViewer rule
console.log('Test 1: Pixel classification...');
assert.equal(isChangedPixel(168, 70, 46, 255), true, '#A8462E changed pixel must be detected');
assert.equal(isChangedPixel(125, 138, 146, 128), false, 'Persistent water #7D8A92 must not be changed');
assert.equal(isChangedPixel(200, 50, 50, 0), false, 'Transparent pixel must not be changed');
console.log('✓ Pixel classification verified.');

// Test 2: Empty mask edge case
console.log('Test 2: Empty mask...');
const emptyDensity = computeChangeDensityFromRgba(new Uint8ClampedArray(0), 0, 0);
assert.equal(emptyDensity.totalPixels, 0);
assert.equal(emptyDensity.totalChangedPixels, 0);
assert.equal(emptyDensity.concentration, null);
assert.deepEqual(computeLineMetrics(emptyDensity, 50), {
  nearLinePercent: 0,
  leftOfLinePercent: 0,
});
console.log('✓ Empty mask handled cleanly.');

// Test 3: All changed mask + line at 0% and 100%
console.log('Test 3: All changed mask and 0% / 100% slider bounds...');
const width = 100;
const height = 2;
const allChangedBuf = new Uint8ClampedArray(width * height * 4);
for (let i = 0; i < width * height; i++) {
  allChangedBuf[i * 4] = 200;
  allChangedBuf[i * 4 + 1] = 40;
  allChangedBuf[i * 4 + 2] = 40;
  allChangedBuf[i * 4 + 3] = 255;
}
const allDensity = computeChangeDensityFromRgba(allChangedBuf, width, height);
assert.equal(allDensity.totalPixels, 200);
assert.equal(allDensity.totalChangedPixels, 200);
assert.equal(allDensity.maxBucketDensity, 1);

const atZero = computeLineMetrics(allDensity, 0);
assert.equal(atZero.leftOfLinePercent, 0, 'At 0%, left of line has 0 columns -> 0%');
assert.equal(atZero.nearLinePercent, 100, 'At 0%, near-line strip covers right side -> 100%');

const atHundred = computeLineMetrics(allDensity, 100);
assert.equal(atHundred.leftOfLinePercent, 100, 'At 100%, left of line covers all -> 100%');
assert.equal(atHundred.nearLinePercent, 100, 'At 100%, near-line strip covers left side -> 100%');
console.log('✓ All changed mask and 0%/100% bounds verified.');

// Test 4: Synthetic mask with known left/right distribution
console.log('Test 4: Synthetic mask with known counts...');
const bucketsChanged = new Array(100).fill(0);
const bucketsTotal = new Array(100).fill(10);
// Left 20 columns (0..19): 5 out of 10 pixels changed (50%)
for (let i = 0; i < 20; i++) {
  bucketsChanged[i] = 5;
}
// Middle 10 columns (45..54): 8 out of 10 pixels changed (80%)
for (let i = 45; i < 55; i++) {
  bucketsChanged[i] = 8;
}
// Total changed = 20*5 + 10*8 = 100 + 80 = 180 out of 1000 (18.0%)
const synthetic = buildChangeDensityFromBuckets(bucketsChanged, bucketsTotal);
assert.equal(synthetic.totalChangedPixels, 180);
assert.equal(synthetic.totalPixels, 1000);
assert.equal(synthetic.maxBucketDensity, 0.8);
assert.equal(synthetic.concentration, 'left', 'Left third has 100 vs middle 80 vs right 0');

// At line = 50%:
// Left of line (0..49 = 50 cols, 500 px): 20*5 + 5*8 = 140 changed -> 140/500 = 28.0%
// Near line (47.5%..52.5% -> cols 47..53 = 6 cols, 60 px): all in 45..54 -> 80.0%
const atFifty = computeLineMetrics(synthetic, 50);
assert.equal(atFifty.leftOfLinePercent, 28.0);
assert.equal(atFifty.nearLinePercent, 80.0);

// At line = 100%:
// Left of line (all 100 cols): 180/1000 = 18.0%
const atEnd = computeLineMetrics(synthetic, 100);
assert.equal(atEnd.leftOfLinePercent, 18.0);
assert.equal(atEnd.nearLinePercent, 0.0);

// Test concentration right
const rightBucketsChanged = new Array(100).fill(0);
rightBucketsChanged[80] = 9;
const rightDensity = buildChangeDensityFromBuckets(rightBucketsChanged, bucketsTotal);
assert.equal(rightDensity.concentration, 'right');

// Test concentration middle
const midBucketsChanged = new Array(100).fill(0);
midBucketsChanged[50] = 9;
const midDensity = buildChangeDensityFromBuckets(midBucketsChanged, bucketsTotal);
assert.equal(midDensity.concentration, 'middle');

console.log('✓ Synthetic known-count percentages and concentration direction verified.');
console.log('\nAll Change Density tests passed successfully!');
