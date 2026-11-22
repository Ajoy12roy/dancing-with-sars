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
    const resolvedReq = path.isAbsolute(reqPath)
      ? reqPath
      : path.resolve(path.dirname(resolvedPath), reqPath);
    const candidateTs = resolvedReq.endsWith('.ts') ? resolvedReq : `${resolvedReq}.ts`;
    if (fs.existsSync(candidateTs)) {
      return loadTsModule(candidateTs);
    }
    if (fs.existsSync(resolvedReq)) {
      return loadTsModule(resolvedReq);
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

const { validateLiveRequest, ALLOWED_LIVE_MODES } = loadTsModule(
  path.join(rootDir, 'lib', 'live-validate.ts')
);

assert.ok(ALLOWED_LIVE_MODES.length > 0, 'Allowed live modes must not be empty');

console.log('Running Live Validation (lib/live-validate.ts) Test Suite...');

// 1. Valid request with array box
const validSylhet = {
  box: [91.8, 24.85, 91.95, 24.98],
  beforeWindow: { start: '2022-05-01', end: '2022-05-15' },
  afterWindow: { start: '2022-06-18', end: '2022-06-25' },
  mode: 'flood',
};
const res1 = validateLiveRequest(validSylhet);
assert.equal(res1.valid, true, 'Valid Sylhet request must succeed');
if (res1.valid) {
  assert.equal(res1.data.scale, 20, 'Sylhet scale must be 20');
  assert.equal(res1.data.mode, 'flood', 'Mode must be flood');
  assert.equal(res1.data.beforeWindow.start, '2022-05-01');
}

// 2. Valid request with object box
const validObjBox = {
  box: { west: 91.8, south: 24.85, east: 91.95, north: 24.98 },
  beforeWindow: { start: '2022-05-01', end: '2022-05-10' },
  afterWindow: { start: '2022-06-18', end: '2022-06-22' },
  mode: 'river-erosion',
};
const res2 = validateLiveRequest(validObjBox);
assert.equal(res2.valid, true, 'Valid object box request must succeed');
if (res2.valid) {
  assert.equal(res2.data.mode, 'river-erosion');
}

// 3. Invalid modes
const badMode = { ...validSylhet, mode: 'volcano' };
const resBadMode = validateLiveRequest(badMode);
assert.equal(resBadMode.valid, false, 'Invalid mode must be rejected');
if (!resBadMode.valid) {
  assert.match(resBadMode.error, /Invalid mode/, 'Error must describe invalid mode');
}

// 4. Box too small (< 2 km)
const tinyBox = {
  ...validSylhet,
  box: [91.800, 24.850, 91.805, 24.855],
};
const resTiny = validateLiveRequest(tinyBox);
assert.equal(resTiny.valid, false, 'Tiny box must be rejected');
if (!resTiny.valid) {
  assert.match(resTiny.error, /at least 2\.0 km/, 'Error must state min 2.0 km');
}

// 5. Box side too large (> 30 km)
const giantBox = {
  ...validSylhet,
  box: [91.0, 24.0, 91.5, 24.5],
};
const resGiant = validateLiveRequest(giantBox);
assert.equal(resGiant.valid, false, 'Giant box side must be rejected');
if (!resGiant.valid) {
  assert.match(resGiant.error, /at most 30\.0 km/, 'Error must state max 30.0 km');
}

// 6. Invalid dates
const badDateFmt = {
  ...validSylhet,
  beforeWindow: { start: '05/01/2022', end: '2022-05-10' },
};
const resBadDate = validateLiveRequest(badDateFmt);
assert.equal(resBadDate.valid, false, 'Bad date format must fail');
if (!resBadDate.valid) {
  assert.equal(resBadDate.window, 'before');
  assert.match(resBadDate.error, /Invalid date format/, 'Error must mention date format');
}

// 7. Reversed dates inside window
const reversedDates = {
  ...validSylhet,
  afterWindow: { start: '2022-06-25', end: '2022-06-18' },
};
const resRev = validateLiveRequest(reversedDates);
assert.equal(resRev.valid, false, 'Reversed dates inside window must fail');
if (!resRev.valid) {
  assert.equal(resRev.window, 'after');
  assert.match(resRev.error, /earlier than or equal to end date/, 'Error must state start <= end');
}

// 8. Overlapping windows (before end >= after start)
const overlapWindows = {
  ...validSylhet,
  beforeWindow: { start: '2022-05-01', end: '2022-06-19' },
  afterWindow: { start: '2022-06-18', end: '2022-06-25' },
};
const resOverlap = validateLiveRequest(overlapWindows);
assert.equal(resOverlap.valid, false, 'Overlapping windows must fail');
if (!resOverlap.valid) {
  assert.match(resOverlap.error, /windows cannot overlap/, 'Error must state no overlap');
}

// 9. Duration > 60 days
const longWindow = {
  ...validSylhet,
  beforeWindow: { start: '2022-01-01', end: '2022-03-15' },
  afterWindow: { start: '2022-04-01', end: '2022-04-10' },
};
const resLong = validateLiveRequest(longWindow);
assert.equal(resLong.valid, false, 'Window > 60 days must fail');
if (!resLong.valid) {
  assert.equal(resLong.window, 'before');
  assert.match(resLong.error, /exceeds maximum allowed 60 days/, 'Error must state max 60 days');
}

// 10. Missing required fields
assert.equal(validateLiveRequest(null).valid, false, 'Null payload must fail');
assert.equal(validateLiveRequest({}).valid, false, 'Empty payload must fail');

console.log('✓ All 10 live validation test cases passed successfully.');
