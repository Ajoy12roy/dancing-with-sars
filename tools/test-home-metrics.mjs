// tools/test-home-metrics.mjs
// Verification suite for lib/home-metrics.ts and raw repository data integrity
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
  // Rewrite @/ path aliases to absolute paths for Node resolution
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
  return mod.exports;
}

console.log('Running Home Metrics (lib/home-metrics.ts) Test Suite...\n');

// 1. Load lib/home-metrics.ts
const homeMetricsMod = loadTsModule(path.resolve(rootDir, 'lib/home-metrics.ts'));
const { getHomeMetrics, formatKm2, formatPercent, formatPeopleRounded } = homeMetricsMod;

assert.equal(typeof getHomeMetrics, 'function', 'getHomeMetrics must be exported as a function');
assert.equal(typeof formatKm2, 'function', 'formatKm2 must be exported as a function');
assert.equal(typeof formatPercent, 'function', 'formatPercent must be exported as a function');
assert.equal(typeof formatPeopleRounded, 'function', 'formatPeopleRounded must be exported as a function');

// 2. Load raw JSON files independently for ground-truth comparison
const rawSylhetResult = JSON.parse(
  fs.readFileSync(path.resolve(rootDir, 'data/precomputed/sylhet/result.json'), 'utf8')
);
const rawSylhetSensitivity = JSON.parse(
  fs.readFileSync(path.resolve(rootDir, 'data/sensitivity/sylhet.json'), 'utf8')
);
const rawSylhetExposure = JSON.parse(
  fs.readFileSync(path.resolve(rootDir, 'data/exposure/sylhet.json'), 'utf8')
);
const rawNisarTimeseries = JSON.parse(
  fs.readFileSync(path.resolve(rootDir, 'data/nisar/hakaluki-haor/timeseries.json'), 'utf8')
);

// Count ready cases on disk
const precomputedDirs = fs
  .readdirSync(path.resolve(rootDir, 'data/precomputed'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .filter((d) => fs.existsSync(path.resolve(rootDir, 'data/precomputed', d.name, 'result.json')));

console.log('Test 1: Validating metrics against ground-truth data files...');
const metrics = getHomeMetrics();

// Assert readyCaseCount
assert.equal(metrics.readyCaseCount, 10, 'readyCaseCount must be exactly 10');
assert.equal(
  metrics.readyCaseCount,
  precomputedDirs.length,
  'readyCaseCount must match directory count of precomputed results'
);
console.log(`✓ readyCaseCount: ${metrics.readyCaseCount} matches precomputed cases on disk`);

// Assert Sylhet flood extent and percent
assert.equal(metrics.sylhetExtentKm2, 37.19, 'sylhetExtentKm2 must be 37.19');
assert.equal(metrics.sylhetExtentKm2, rawSylhetResult.affectedAreaKm2);
assert.equal(metrics.sylhetPercent, 17.05, 'sylhetPercent must be 17.05');
assert.equal(metrics.sylhetPercent, rawSylhetResult.percentChanged);
console.log(`✓ sylhetExtentKm2: ${metrics.sylhetExtentKm2} km², sylhetPercent: ${metrics.sylhetPercent}%`);

// Assert Sylhet sensitivity range
assert.equal(metrics.sensitivityMinKm2, 30.85, 'sensitivityMinKm2 must be 30.85');
assert.equal(metrics.sensitivityMinKm2, rawSylhetSensitivity.minAreaKm2);
assert.equal(metrics.sensitivityMaxKm2, 44.01, 'sensitivityMaxKm2 must be 44.01');
assert.equal(metrics.sensitivityMaxKm2, rawSylhetSensitivity.maxAreaKm2);
console.log(`✓ sensitivity range: ${metrics.sensitivityMinKm2} to ${metrics.sensitivityMaxKm2} km²`);

// Assert Exposure numbers
assert.equal(metrics.exposureBaseline, 74413, 'exposureBaseline must match file default');
assert.equal(
  metrics.exposureBaseline,
  rawSylhetExposure.minDefaultMax.default.estimatedPeopleInExtent
);
assert.equal(metrics.exposureMin, 57480, 'exposureMin must match file min');
assert.equal(metrics.exposureMin, rawSylhetExposure.minDefaultMax.min.estimatedPeopleInExtent);
assert.equal(metrics.exposureMax, 93745, 'exposureMax must match file max');
assert.equal(metrics.exposureMax, rawSylhetExposure.minDefaultMax.max.estimatedPeopleInExtent);
console.log(
  `✓ exposure: baseline ${metrics.exposureBaseline}, range ${metrics.exposureMin} to ${metrics.exposureMax}`
);

// Assert NISAR records
assert.equal(metrics.nisarDateCount, 10, 'nisarDateCount must be 10');
assert.equal(metrics.nisarDateCount, rawNisarTimeseries.records.length);
assert.equal(metrics.nisarFlaggedCount, 1, 'nisarFlaggedCount must be 1');
const rawFlagged = rawNisarTimeseries.records.filter((r) => r.excluded).length;
assert.equal(metrics.nisarFlaggedCount, rawFlagged);
assert.equal(metrics.nisarFirstMonth, 'June 2026', 'nisarFirstMonth must be June 2026');
assert.equal(metrics.nisarLastMonth, 'October 2026', 'nisarLastMonth must be October 2026');
console.log(
  `✓ NISAR dates: ${metrics.nisarDateCount} total, ${metrics.nisarFlaggedCount} flagged (${metrics.nisarFirstMonth} to ${metrics.nisarLastMonth})`
);

// 3. Test formatters
console.log('\nTest 2: Validating pure formatters...');
assert.equal(formatKm2(metrics.sylhetExtentKm2), '37.19');
assert.equal(formatKm2(metrics.sensitivityMinKm2), '30.85');
assert.equal(formatKm2(metrics.sensitivityMaxKm2), '44.01');
assert.equal(formatKm2(12), '12.00');
console.log('✓ formatKm2 produces two decimals');

assert.equal(formatPercent(metrics.sylhetPercent), '17.05');
assert.equal(formatPercent(5), '5.00');
console.log('✓ formatPercent produces two decimals');

assert.equal(formatPeopleRounded(metrics.exposureBaseline), 'about 74,000');
assert.equal(formatPeopleRounded(metrics.exposureBaseline, false), '74,000');
assert.equal(formatPeopleRounded(metrics.exposureMin, false), '57,000');
assert.equal(formatPeopleRounded(metrics.exposureMax, false), '94,000');
assert.equal(formatPeopleRounded(metrics.exposureMin, true), 'about 57,000');
assert.equal(formatPeopleRounded(metrics.exposureMax, true), 'about 94,000');
console.log('✓ formatPeopleRounded rounds to nearest thousand with and without prefix');

console.log('\nAll Home Metrics tests passed successfully!');
