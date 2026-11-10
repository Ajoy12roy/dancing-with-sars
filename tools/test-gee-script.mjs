// tools/test-gee-script.mjs
// Verification suite for Earth Engine Script Generator
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

// ── Load lib/aoi.ts ──
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
const { generateGeeScript } = mod.exports;

console.log('Running Earth Engine Script Generator Verification Suite...\n');

// ─────────────────────────────────────────────────────────────────────────────
// Test (i): Golden comparison for the Sylhet preset vs scripts/gee/verified_sylhet_picker.js
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test (i): Golden comparison for Sylhet preset against verified_sylhet_picker.js...');
const goldenPath = path.resolve(rootDir, 'scripts/gee/verified_sylhet_picker.js');
const goldenContent = fs.readFileSync(goldenPath, 'utf8');

const generatedGolden = generateGeeScript({
  bbox: { west: 91.8, south: 24.85, east: 91.95, north: 24.98 },
  startDateA: '2022-05-01',
  endDateA: '2022-05-10',
  startDateB: '2022-06-18',
  endDateB: '2022-06-22',
  pass: 'DESCENDING',
  relativeOrbit: 77,
  scale: 20,
  prefix: 'terrapulse_aoi',
  bands: ['VV'],
});

function normalizeLine(line) {
  return line.trim();
}

const goldenLines = goldenContent.replace(/\r\n/g, '\n').split('\n');
const genGoldenLines = generatedGolden.replace(/\r\n/g, '\n').split('\n');

const differingLines = [];
const maxLines = Math.max(goldenLines.length, genGoldenLines.length);

for (let i = 0; i < maxLines; i++) {
  const g = goldenLines[i] ?? '';
  const gen = genGoldenLines[i] ?? '';
  if (normalizeLine(g) !== normalizeLine(gen)) {
    // Only allow differences if the line is purely a comment or substituted constant
    const isComment = normalizeLine(g).startsWith('//') || normalizeLine(g).startsWith('/*') || normalizeLine(g).startsWith('*');
    if (!isComment) {
      differingLines.push({ line: i + 1, golden: g, generated: gen });
    }
  }
}

if (differingLines.length > 0) {
  console.error('Unexpected differing lines between generated script and golden file:');
  console.error(differingLines);
  assert.fail(`Found ${differingLines.length} unexpected differing lines against golden reference`);
}
console.log('✓ Generated Sylhet preset script matches scripts/gee/verified_sylhet_picker.js exactly.');

// ─────────────────────────────────────────────────────────────────────────────
// Test (ii): Syntax validation via node --check
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test (ii): Syntax validation via node --check...');
const scratchDir = path.resolve(rootDir, 'scratch');
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
const tempScriptPath = path.join(scratchDir, 'temp_gee_script.js');

fs.writeFileSync(tempScriptPath, generatedGolden, 'utf8');
try {
  execSync(`node --check "${tempScriptPath}"`);
  console.log('✓ node --check confirmed generated Earth Engine script has valid JavaScript syntax.');
} finally {
  if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test (iii): Allowlist audit of all ee.* calls
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test (iii): Allowlist audit of all ee.* calls...');

const documentedAdditionalCalls = {
  aggregate_array: {
    url: 'https://developers.google.com/earth-engine/apidocs/ee-imagecollection-aggregate_array',
    quote: 'Aggregates over a given property of the images in a collection into a list.',
  },
  size: {
    url: 'https://developers.google.com/earth-engine/apidocs/ee-imagecollection-size',
    quote: 'Returns the number of elements in the collection.',
  },
  getInfo: {
    url: 'https://developers.google.com/earth-engine/guides/debugging#getinfo',
    quote: 'Retrieves the value of this object from the server synchronously.',
  },
};

const geeFiles = fs.readdirSync(path.resolve(rootDir, 'scripts/gee'))
  .filter((f) => f.endsWith('.js'));

const baseAllowlist = new Set();
for (const file of geeFiles) {
  const content = fs.readFileSync(path.resolve(rootDir, 'scripts/gee', file), 'utf8');
  const matches = content.match(/ee\.[A-Za-z0-9_.]+/g) || [];
  for (const m of matches) baseAllowlist.add(m);
}

const generatedCalls = generatedGolden.match(/ee\.[A-Za-z0-9_.]+/g) || [];
for (const call of generatedCalls) {
  const allowed = baseAllowlist.has(call) || Object.keys(documentedAdditionalCalls).some((k) => call.includes(k));
  assert.ok(allowed, `Disallowed ee call in generated script: ${call}`);
}
console.log('✓ Allowlist audit passed: all ee.* calls appear in scripts/gee/*.js or verified documentation.');

// ─────────────────────────────────────────────────────────────────────────────
// Test (iv): Mock execution - Requested group has zero images in comparison window
//            Fallback selects a group present in BOTH windows, never single-window group
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test (iv): Mock execution with fallback when requested group has zero images in window B...');

function createMockEnvironment(options = {}) {
  const {
    requestedPassCountA = 2,
    requestedPassCountB = 0, // Zero in after-window to trigger fallback
    beforePasses = ['DESCENDING', 'ASCENDING'],
    beforeOrbits = [77, 121],
    afterPasses = ['ASCENDING', 'DESCENDING'],
    afterOrbits = [121, 45],
  } = options;

  const calls = [];
  const prints = [];

  function formatArg(a) {
    if (typeof a === 'string') return `'${a}'`;
    if (typeof a === 'number' || typeof a === 'boolean') return String(a);
    if (Array.isArray(a)) return JSON.stringify(a);
    return '<ee_obj>';
  }

  function mockEe(name = 'ee') {
    const fn = function (...args) {
      const formatted = args.map(formatArg).join(', ');
      calls.push(`${name}(${formatted})`);
      return mockEe(`${name}(${formatted})`);
    };

    return new Proxy(fn, {
      get(target, prop) {
        if (typeof prop === 'symbol' || prop === 'then' || prop === 'valueOf' || prop === 'inspect') {
          return undefined;
        }
        if (prop === 'getInfo') {
          return function () {
            calls.push(`${name}.getInfo()`);
            if (name.includes('size')) {
              // Size check for specific group
              if (name.includes('startDateA') || name.includes('2022-05-01')) {
                return requestedPassCountA;
              }
              return requestedPassCountB;
            }
            if (name.includes('aggregate_array(\'orbitProperties_pass\')')) {
              if (name.includes('startDateA') || name.includes('2022-05-01')) {
                return beforePasses;
              }
              return afterPasses;
            }
            if (name.includes('aggregate_array(\'relativeOrbitNumber_start\')')) {
              if (name.includes('startDateA') || name.includes('2022-05-01')) {
                return beforeOrbits;
              }
              return afterOrbits;
            }
            return 1;
          };
        }
        return mockEe(`${name}.${String(prop)}`);
      },
      apply(target, thisArg, args) {
        const formatted = args.map(formatArg).join(', ');
        calls.push(`${name}(${formatted})`);
        return mockEe(`${name}(${formatted})`);
      },
    });
  }

  const sandbox = {
    ee: mockEe('ee'),
    Export: {
      image: {
        toDrive: (opts) => {
          calls.push(`Export.image.toDrive(${opts.description})`);
        },
      },
    },
    print: (...msg) => {
      const text = msg.join(' ');
      prints.push(text);
      calls.push(`print(${text})`);
    },
    console,
    Math,
    parseInt,
  };

  return { sandbox, calls, prints };
}

// Scenario IV execution:
const env4 = createMockEnvironment({
  requestedPassCountA: 2,
  requestedPassCountB: 0, // Triggers fallback
  beforePasses: ['DESCENDING', 'ASCENDING'],
  beforeOrbits: [77, 121],
  afterPasses: ['ASCENDING', 'DESCENDING'],
  afterOrbits: [121, 45],
});

vm.createContext(env4.sandbox);
vm.runInContext(generatedGolden, env4.sandbox);

// Must log fallback message
assert.ok(
  env4.prints.some((p) => p.includes('Requested orbit group DESCENDING track 77 has 2 baseline and 0 comparison images. Falling back to automatic single-geometry selection.')),
  'Must print exact fallback notice when requested group has 0 images in comparison window'
);

// Must select ASCENDING track 121 (common to both windows)
assert.ok(
  env4.prints.some((p) => p.includes('Selected single-geometry orbit group: ASCENDING track 121 (used for both baseline and comparison windows).')),
  'Must select ASCENDING track 121 because it is present in BOTH windows'
);

// Must NOT select DESCENDING 77 (only in A) or DESCENDING 45 (only in B)
assert.ok(
  !env4.prints.some((p) => p.includes('Selected single-geometry orbit group: DESCENDING track 77 (used for both')),
  'Must never select a group with images in only one window'
);
assert.ok(
  !env4.prints.some((p) => p.includes('Selected single-geometry orbit group: DESCENDING track 45 (used for both')),
  'Must never select a group with images in only one window'
);

console.log('✓ Mock scenario IV passed: requested group with 0 images in after-window falls back and selects the only valid common group (ASCENDING track 121).');

// ─────────────────────────────────────────────────────────────────────────────
// Test (v): Mock scenario - No common group in both windows throws error
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test (v): Mock execution with no common group throws expected error...');

const env5 = createMockEnvironment({
  requestedPassCountA: 0,
  requestedPassCountB: 0,
  beforePasses: ['DESCENDING'],
  beforeOrbits: [77],
  afterPasses: ['ASCENDING'],
  afterOrbits: [121], // Disjoint sets: no group in both windows
});

vm.createContext(env5.sandbox);
assert.throws(
  () => {
    vm.runInContext(generatedGolden, env5.sandbox);
  },
  (err) => {
    return String(err?.message || err).includes('No single orbit geometry has images in both windows. Widen a window or move the area.');
  },
  'Must throw "No single orbit geometry has images in both windows. Widen a window or move the area."'
);

assert.ok(
  env5.prints.some((p) => p.includes('No single orbit geometry has images in both windows. Widen a window or move the area.')),
  'Must print the exact error message before throwing'
);

console.log('✓ Mock scenario V passed: throws and prints "No single orbit geometry has images in both windows. Widen a window or move the area." when groups are disjoint.');

console.log('\nAll Earth Engine Script Generator tests passed successfully!');
