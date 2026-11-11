// tools/test-retry-backoff.mjs
// Unit tests for retry and backoff helper
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

const src = fs.readFileSync(path.resolve(rootDir, 'lib/retry-backoff.ts'), 'utf8');
const transpiled = ts.transpileModule(src, {
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

const { getBackoffDelay, shouldRetry, DEFAULT_HEALTH_BACKOFF } = mod.exports;

console.log('Running Retry & Backoff Unit Tests...\n');

assert.equal(DEFAULT_HEALTH_BACKOFF.maxTotalTimeMs, 90000, 'Default health backoff maxTotalTimeMs should be 90000ms');

// 1. Initial attempt
assert.equal(getBackoffDelay(0), 2000, 'Attempt 0 should return initialDelayMs (2000ms)');

// 2. Exponential scaling
const d1 = getBackoffDelay(1); // 2000 * 1.5 = 3000
assert.equal(d1, 3000, 'Attempt 1 should be 3000ms');

const d2 = getBackoffDelay(2); // 3000 * 1.5 = 4500
assert.equal(d2, 4500, 'Attempt 2 should be 4500ms');

const d3 = getBackoffDelay(3); // 4500 * 1.5 = 6750
assert.equal(d3, 6750, 'Attempt 3 should be 6750ms');

// 3. Max delay ceiling
const d10 = getBackoffDelay(10);
assert.equal(d10, 10000, 'High attempt index must be capped at maxDelayMs (10000ms)');

// 4. Elapsed time checks
assert.equal(shouldRetry(0), true);
assert.equal(shouldRetry(45000), true);
assert.equal(shouldRetry(89999), true);
assert.equal(shouldRetry(90000), false);
assert.equal(shouldRetry(120000), false);

// 5. Custom configuration
const customConfig = { initialDelayMs: 500, maxDelayMs: 2000, backoffFactor: 2, maxTotalTimeMs: 5000 };
assert.equal(getBackoffDelay(0, customConfig), 500);
assert.equal(getBackoffDelay(1, customConfig), 1000);
assert.equal(getBackoffDelay(2, customConfig), 2000);
assert.equal(getBackoffDelay(5, customConfig), 2000);
assert.equal(shouldRetry(4999, customConfig), true);
assert.equal(shouldRetry(5000, customConfig), false);

console.log('✓ All retry and backoff calculations verified successfully!');

