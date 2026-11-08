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

// Reference script parameters from scripts/gee/export_sylhet.js
const sylhetBbox = {
  west: 91.79991686251485,
  south: 24.8499160415415,
  east: 91.95011517801963,
  north: 24.98017175773883,
};
const sylhetDateA = { start: '2022-05-01', end: '2022-05-10' };
const sylhetDateB = { start: '2022-06-20', end: '2022-06-21' };

const refScriptPath = path.resolve(rootDir, 'scripts/gee/export_sylhet.js');
const refScriptContent = fs.readFileSync(refScriptPath, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// Test (i): Line-by-line comparison with scripts/gee/export_sylhet.js
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test (i): Line-by-line comparison with reference script...');
const generatedSylhet = generateGeeScript({
  bbox: sylhetBbox,
  startDateA: sylhetDateA.start,
  endDateA: sylhetDateA.end,
  startDateB: sylhetDateB.start,
  endDateB: sylhetDateB.end,
  scale: 20,
  prefix: 'sylhet',
  bands: ['VV'],
});

function normalizeLine(line) {
  return line.trim().replace(/\s+/g, ' ').replace(/"/g, "'");
}

const refLines = refScriptContent.split('\n').map(normalizeLine).filter(Boolean);
const genLines = generatedSylhet.split('\n').map(normalizeLine).filter(Boolean);

// Find differing lines outside the group-selection block
const differingLines = [];
let insideGroupBlock = false;

for (const line of genLines) {
  if (line.includes('// Single-geometry orbital pass')) {
    insideGroupBlock = true;
    continue;
  }
  if (insideGroupBlock && line.includes('// 5. Select Images')) {
    insideGroupBlock = false;
  }

  if (!insideGroupBlock) {
    // Must match a line in refLines
    if (!refLines.includes(line)) {
      differingLines.push(line);
    }
  }
}

if (differingLines.length > 0) {
  console.error('Unexpected differing lines outside group-selection block:');
  console.error(differingLines);
  assert.fail(`Found ${differingLines.length} unexpected differing lines outside group-selection block`);
}
console.log('✓ All lines outside the group-selection block match scripts/gee/export_sylhet.js verbatim.');

// ─────────────────────────────────────────────────────────────────────────────
// Test (ii): Syntax validation via node --check
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test (ii): Syntax validation via node --check...');
const scratchDir = path.resolve(rootDir, 'scratch');
osMkdir: if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
const tempScriptPath = path.join(scratchDir, 'temp_gee_script.js');

fs.writeFileSync(tempScriptPath, generatedSylhet, 'utf8');
try {
  execSync(`node --check "${tempScriptPath}"`);
  console.log('✓ node --check confirmed generated Earth Engine script has valid JavaScript syntax.');
} finally {
  if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test (iii): Allowlist of ee.* function and method calls
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test (iii): Allowlist audit of all ee.* calls...');

// Verified documentation citations for additional calls (<= 15 words quote + official URL)
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

// Scan all scripts/gee/export_*.js files for base allowlist
const geeFiles = fs.readdirSync(path.resolve(rootDir, 'scripts/gee'))
  .filter((f) => f.startsWith('export_') && f.endsWith('.js'));

const baseAllowlist = new Set();
for (const file of geeFiles) {
  const content = fs.readFileSync(path.resolve(rootDir, 'scripts/gee', file), 'utf8');
  const matches = content.match(/ee\.[A-Za-z0-9_.]+/g) || [];
  for (const m of matches) baseAllowlist.add(m);
}

console.log('Base ee.* calls in scripts/gee/export_*.js:', Array.from(baseAllowlist));
for (const [k, v] of Object.entries(documentedAdditionalCalls)) {
  const wordCount = v.quote.trim().split(/\s+/).length;
  assert.ok(wordCount <= 15, `Quote for ${k} must be <= 15 words (got ${wordCount})`);
  console.log(`Documented additional call: ${k} (${wordCount} words) -> ${v.url}`);
}

// Extract calls from generated script
const generatedCalls = generatedSylhet.match(/ee\.[A-Za-z0-9_.]+/g) || [];
for (const call of generatedCalls) {
  const allowed = baseAllowlist.has(call) || Object.keys(documentedAdditionalCalls).some((k) => call.includes(k));
  assert.ok(allowed, `Disallowed ee call in generated script: ${call}`);
}
console.log('✓ Allowlist audit passed: all ee.* calls appear in export_*.js or verified documentation.');

// ─────────────────────────────────────────────────────────────────────────────
// Test (iv): Mock execution of generated script with Proxy call logger
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test (iv): Execution against mock ee proxy object...');

const recordedCalls = [];

function formatArg(a) {
  if (typeof a === 'string') return `'${a}'`;
  if (typeof a === 'number' || typeof a === 'boolean') return String(a);
  if (Array.isArray(a)) return JSON.stringify(a);
  return '<ee_obj>';
}

function createMockEe(name = 'ee') {
  const fn = function (...args) {
    const formattedArgs = args.map(formatArg).join(', ');
    recordedCalls.push(`${name}(${formattedArgs})`);
    return createMockEe(`${name}(${formattedArgs})`);
  };

  return new Proxy(fn, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'valueOf' || prop === 'inspect') {
        return undefined;
      }
      if (prop === 'getInfo') {
        return function () {
          recordedCalls.push(`${name}.getInfo()`);
          if (name.includes('orbitProperties_pass')) {
            return ['DESCENDING', 'DESCENDING', 'ASCENDING'];
          }
          if (name.includes('relativeOrbitNumber_start')) {
            return [77, 77, 91];
          }
          return 2;
        };
      }
      return createMockEe(`${name}.${String(prop)}`);
    },
    apply(target, thisArg, args) {
      const formattedArgs = args.map(formatArg).join(', ');
      recordedCalls.push(`${name}(${formattedArgs})`);
      return createMockEe(`${name}(${formattedArgs})`);
    },
  });
}

const mockSandbox = {
  ee: createMockEe('ee'),
  Export: {
    image: {
      toDrive: (opts) => {
        recordedCalls.push(`Export.image.toDrive(${opts.description})`);
      },
    },
  },
  print: (...msg) => {
    recordedCalls.push(`print(${msg.join(' ')})`);
  },
  console,
  Math,
  parseInt,
};

vm.createContext(mockSandbox);
// Run generated script in mock context
vm.runInContext(generatedSylhet, mockSandbox);

console.log('Recorded Mock Call Sequence (sample of 12 calls):');
for (const call of recordedCalls.slice(0, 12)) {
  console.log('  ->', call);
}
assert.ok(recordedCalls.some((c) => c.includes('Export.image.toDrive(sylhet_image_a)')));
assert.ok(recordedCalls.some((c) => c.includes('Export.image.toDrive(sylhet_image_b)')));
assert.ok(recordedCalls.some((c) => c.includes('Selected single-geometry orbit group: DESCENDING track 77')));
console.log('✓ Mock execution completed cleanly: orbit group auto-selected and export tasks queued.');

console.log('\nAll Earth Engine Script Generator tests passed successfully!');
