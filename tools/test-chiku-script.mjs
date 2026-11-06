// Comprehensive unit test suite for Chiku Voice Guide sentence builder (lib/chiku-script.ts)
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
  moduleCache.set(resolvedPath, mod.exports);
  return mod.exports;
}

// ── Import real exported functions and constants directly from lib/chiku-script.ts ──
const chikuScriptModule = loadTsModule(path.resolve(rootDir, 'lib/chiku-script.ts'));

export const {
  MODE_LABELS,
  PAGE_INTROS,
  INTERACTION_HINTS,
  formatRangeString,
  cleanUploadError,
  formatNumberInWords,
  formatThousandsForSpeech,
  splitForSpeech,
  buildThresholdLine,
  buildTestedRangeLine,
  buildSensitivityClassSentence,
  buildRadarMethodLine,
  buildReliabilityNotesLines,
  buildAnalysisNarrationParts,
  buildNisarNarrationParts,
  buildSylhetExposureNarrationParts,
  buildChikuScript,
} = chikuScriptModule;

console.log('Running Chiku Voice Guide Script Tests...\n');

// 1. Mode opened tests
const modes = ['flood', 'river-erosion', 'deforestation', 'surface-water'];
for (const m of modes) {
  const line = buildChikuScript({ type: 'mode-changed', data: { mode: m }, message: '' });
  assert.ok(line.includes('ready'), `Expected ready in mode script for ${m}`);
  assert.ok(line.length < 200, `Mode script for ${m} exceeded 200 chars (${line.length})`);
}
console.log('✓ Mode opened tests passed (Flood, River erosion, Deforestation, Surface water)');

// 2. Case selected tests
const caseScriptWithDates = buildChikuScript(
  { type: 'case-selected', data: { title: 'Sylhet 2022' }, message: '' },
  { beforeRange: { start: '2022-05-15', end: '2022-05-20' }, afterRange: { start: '2022-06-18', end: '2022-06-23' } }
);
assert.equal(caseScriptWithDates, 'Loaded Sylhet 2022. Comparing 2022-05-15 to 2022-05-20 with 2022-06-18 to 2022-06-23.');
assert.ok(caseScriptWithDates.length < 200, 'Case script exceeded 200 chars');

const caseScriptNoDates = buildChikuScript(
  { type: 'case-selected', data: { title: 'Sylhet 2022' }, message: '' }
);
assert.equal(caseScriptNoDates, 'Loaded Sylhet 2022.');
assert.ok(caseScriptNoDates.length < 200, 'Case script exceeded 200 chars');
console.log('✓ Case selected tests passed (with date ranges & missing range fallback)');

// 3. Upload accepted test
const uploadAccepted = buildChikuScript({ type: 'upload-accepted', message: '' });
assert.equal(uploadAccepted, 'Your satellite images have been uploaded successfully.');
assert.ok(uploadAccepted.length < 200, 'Upload accepted under 200 chars');
console.log('✓ Upload accepted test passed');

// 4. Upload rejected test
const uploadShortError = buildChikuScript({
  type: 'upload-rejected',
  data: { error: 'Invalid CRS projection' },
  message: 'Upload rejected: Invalid CRS projection',
});
assert.equal(uploadShortError, 'I could not use that file. Invalid CRS projection');
assert.ok(uploadShortError.length < 200, 'Upload rejected under 200 chars');

const uploadLongPathError = buildChikuScript({
  type: 'upload-rejected',
  data: {
    error:
      'Error: C:\\Users\\Administrator\\AppData\\Local\\Temp\\sars-upload-very-long-path-1234567890.tif is corrupt at process_change.py line 204 at run_command()',
  },
  message: 'Upload rejected',
});
assert.ok(!uploadLongPathError.includes('C:\\Users'), 'Should strip Windows absolute paths');
assert.ok(!uploadLongPathError.includes('process_change.py'), 'Should strip internal script names');
assert.ok(uploadLongPathError.length < 200, 'Upload rejected with long path must stay under 200 chars');
console.log('✓ Upload rejected tests passed (short error & path/stack truncation under 200 chars)');

// 5. Processing test
const processing = buildChikuScript({ type: 'analysis-loading', message: 'Analyzing' });
assert.equal(processing, 'Analyzing the satellite imagery. Please wait.');
assert.ok(processing.length < 200, 'Processing under 200 chars');
console.log('✓ Processing test passed');

// 6. Analysis complete tests
const sylhetAnalysis = buildChikuScript(
  {
    type: 'analysis-ready',
    data: {
      affectedAreaKm2: 37.19,
      percentChanged: 17.05,
      sensitivity: { minAreaKm2: 30.85, maxAreaKm2: 44.01, centre: -16.0, steps: [{ value: -16.0, areaKm2: 37.19 }] },
    },
    message: '',
  }
);
assert.ok(sylhetAnalysis.includes('37.2 square kilometres changed'), 'Expected rounded headline 37.2');
assert.ok(sylhetAnalysis.includes('17.1 percent'), 'Expected rounded percent 17.1');
assert.ok(sylhetAnalysis.includes('30.9 to 44.0'), 'Expected sensitivity range');
assert.ok(sylhetAnalysis.length < 200, 'Sylhet analysis line under 200 chars');

const amazonHighSens = buildChikuScript(
  {
    type: 'analysis-ready',
    data: {
      affectedAreaKm2: 0.62,
      percentChanged: 0.13,
      sensitivity: { minAreaKm2: 0.05, maxAreaKm2: 4.64, centre: -3.0, steps: [{ value: -3.0, areaKm2: 0.62 }] },
    },
    message: '',
  }
);
assert.ok(amazonHighSens.includes('About 0.62 square kilometres changed'), 'Expected 2-decimal headline 0.62 for amazon');
assert.ok(amazonHighSens.includes('0.05 to 4.64'), 'Expected 2-decimal sensitivity range for amazon');
assert.ok(amazonHighSens.includes('High sensitivity: treat this number as indicative only'), 'Expected high sensitivity caveat');
assert.ok(amazonHighSens.length < 200, 'Amazon analysis line under 200 chars');

const customUploadNoSens = buildChikuScript(
  {
    type: 'analysis-ready',
    data: {
      affectedAreaKm2: 42.0,
      percentChanged: 10.5,
    },
    message: '',
  }
);
assert.equal(customUploadNoSens, 'Analysis complete. About 42.0 square kilometres changed, 10.5 percent of the area.');
assert.ok(customUploadNoSens.length < 200, 'Custom upload analysis under 200 chars');
assert.ok(!customUploadNoSens.includes('validated'), 'Must not claim validation without validation data');
console.log('✓ Analysis complete tests passed (stable, moderate, high cautious wording, custom upload fallback, no unverified validation claim)');

// 7. Analysis failed test
const analysisFailed = buildChikuScript({ type: 'analysis-failed', message: '' });
assert.equal(analysisFailed, 'The analysis could not finish. Please try again.');
assert.ok(analysisFailed.length < 200, 'Analysis failed under 200 chars');
console.log('✓ Analysis failed test passed');

// 8. AI interpretation loaded test
const aiInterpretation = buildChikuScript({ type: 'ai-insight-loaded', message: '' });
assert.equal(aiInterpretation, 'The AI interpretation is ready below.');
assert.ok(aiInterpretation.length < 200, 'AI interpretation loaded under 200 chars');
console.log('✓ AI interpretation loaded test passed');

// 9. Page intro tests
const pageRoutes = [
  {
    route: '/',
    expected:
      "This is Terra Pulse. It compares radar images from two dates to show where Earth's surface has changed.",
  },
  {
    route: '/explore',
    expected: 'Pick a case study, or upload your own pair of radar images.',
  },
  {
    route: '/how-it-works',
    expected: 'Here is how the method works, from the radar image to the changed area.',
  },
  {
    route: '/data-sources',
    expected:
      "Our demo cases use Sentinel-1 radar through Google Earth Engine. NASA's ASF archive also distributes the same data.",
  },
];
for (const pr of pageRoutes) {
  const line = buildChikuScript({ type: 'page-intro', data: { route: pr.route }, message: '' });
  assert.equal(line, pr.expected, `Page intro failed for ${pr.route}`);
  assert.ok(line.length < 200, `Page intro length under 200 for ${pr.route}`);
}
console.log('✓ Page intro tests passed (/, /explore, /how-it-works, /data-sources)');

// 10. Interaction hint tests
const hints = [
  {
    hintId: 'slider',
    expected: 'Drag the slider to compare the two dates.',
  },
  {
    hintId: 'sensitivity',
    expected:
      'This table shows how the result changes if the threshold moves. A wide range means less certainty.',
  },
  {
    hintId: 'text-summary',
    expected: 'This is a text description of the map.',
  },
];
for (const h of hints) {
  const line = buildChikuScript({ type: 'hint', data: { hintId: h.hintId }, message: '' });
  assert.equal(line, h.expected, `Hint failed for ${h.hintId}`);
  assert.ok(line.length < 200, `Hint length under 200 for ${h.hintId}`);
}
console.log('✓ Interaction hint tests passed (slider, sensitivity, text-summary)');

// 11. formatNumberInWords unit tests
assert.equal(formatNumberInWords(0), '0');
assert.equal(formatNumberInWords(-16), 'minus 16');
assert.equal(formatNumberInWords(-16.0), 'minus 16');
assert.equal(formatNumberInWords(-3.0), 'minus 3');
assert.equal(formatNumberInWords(-2.5), 'minus 2.5');
assert.equal(formatNumberInWords(30.85), '30.9');
assert.equal(formatNumberInWords(44.01), '44.0');
console.log('✓ formatNumberInWords unit tests passed');

// 12. splitForSpeech unit tests
assert.deepEqual(splitForSpeech(''), []);
assert.deepEqual(splitForSpeech('   '), []);
const shortText = 'Analysis complete. Spanning 30.9 to 44.0 square kilometres.';
assert.deepEqual(splitForSpeech(shortText), [shortText]);

// Decimal preservation test: should NOT cut inside numbers like 30.9 or -16.0
const textWithDecimals =
  'The headline result uses a water threshold of minus 16 decibels: pixels darker than this are counted as water. This is a fixed default setting, not a value proven to be the best.';
const splitDecimals = splitForSpeech(textWithDecimals, 190);
assert.ok(splitDecimals.length === 1, 'Should keep text <= 190 chars intact');
assert.ok(!splitDecimals[0].includes('16. '), 'Should not break on whole or decimal numbers');

// Long text splitting test
const longNote =
  'Optical validation against Sentinel-2 on 2022-06-20 showed 87% spatial agreement in non-vegetated areas. Emergent vegetation causes known SAR undercounting across complex haor wetlands during early monsoon cycles, requiring careful multi-sensor cross-comparison.';
const splitLong = splitForSpeech(longNote, 140);
assert.ok(splitLong.length > 1, 'Should split long text into multiple parts');
for (const p of splitLong) {
  assert.ok(p.length <= 140, `Part exceeded 140 chars: ${p.length}`);
}
console.log('✓ splitForSpeech unit tests passed (empty, short, numbers/decimals preserved, long string split)');

// 13. Extended narration generation for real demo cases (sylhet, amazon, tanguar)
const casesToTest = [
  {
    id: 'sylhet',
    mode: 'flood',
    area: 37.19,
    pct: 17.05,
    expectedParam: 'water threshold',
    expectedCentre: 'minus 16 decibels',
    expectedMeaning: 'pixels darker than this are counted as water',
    expectedClass: 'moderate',
    expectedClassSentence: 'Different threshold choices change the detected area moderately.',
    expectedMethod:
      'We smooth Sentinel-1 radar backscatter with a 5-pixel median filter, then flag pixels that drop below the threshold as open water.',
  },
  {
    id: 'amazon',
    mode: 'deforestation',
    area: 0.62,
    pct: 0.13,
    expectedParam: 'loss threshold',
    expectedCentre: 'minus 3 decibels',
    expectedMeaning: 'drops greater than this indicate canopy loss',
    expectedClass: 'high',
    expectedClassSentence: 'Treat this number with extra caution: small threshold changes move the result significantly.',
    expectedMethod:
      'We smooth Sentinel-1 radar backscatter with a 5-pixel median filter, then flag pixels where backscatter dropped by more than the threshold between pre- and post-dates.',
  },
  {
    id: 'tanguar',
    mode: 'surface-water',
    area: 262.88,
    pct: 62.83,
    expectedParam: 'water threshold',
    expectedCentre: 'minus 16 decibels',
    expectedMeaning: 'pixels darker than this are counted as water',
    expectedClass: 'stable',
    expectedClassSentence: 'This detection is relatively stable across threshold choices.',
    expectedMethod:
      'We smooth Sentinel-1 radar backscatter and flag pixels below the threshold as surface water, filtering isolated speckle.',
  },
];

const estimatedDurations = {};

for (const c of casesToTest) {
  const jsonPath = path.join(rootDir, 'data', 'sensitivity', `${c.id}.json`);
  assert.ok(fs.existsSync(jsonPath), `Missing data/sensitivity/${c.id}.json`);
  const sens = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // A. Threshold line
  const threshLine = buildThresholdLine(c.mode, sens);
  assert.ok(threshLine.length <= 190, `${c.id} threshold line exceeds 190 chars (${threshLine.length})`);
  assert.ok(threshLine.includes(c.expectedParam), `${c.id} missing param label`);
  assert.ok(threshLine.includes(c.expectedCentre), `${c.id} missing centre in words`);
  assert.ok(threshLine.includes(c.expectedMeaning), `${c.id} missing meaning`);
  assert.ok(
    threshLine.includes('This is a fixed default setting, not a value proven to be the best.'),
    `${c.id} missing exact required disclaimer phrase`
  );
  assert.ok(!threshLine.includes('best threshold'), `${c.id} threshold line must not say 'best threshold'`);
  assert.ok(!threshLine.includes('validated'), `${c.id} threshold line must not claim 'validated'`);
  assert.ok(!threshLine.includes('detected as flooded'), `${c.id} threshold line must not contain 'detected as flooded'`);

  // B. Tested range line
  const rangeLine = buildTestedRangeLine(sens);
  assert.ok(rangeLine.length <= 190, `${c.id} range line exceeds 190 chars (${rangeLine.length})`);
  assert.ok(rangeLine.includes('We also tested'), `${c.id} missing 'We also tested'`);
  assert.ok(rangeLine.includes('square kilometres'), `${c.id} missing 'square kilometres'`);
  const expectedMin = sens.minAreaKm2 < 1 ? sens.minAreaKm2.toFixed(2) : sens.minAreaKm2.toFixed(1);
  const expectedMax = (sens.minAreaKm2 < 1 || sens.maxAreaKm2 < 1) ? sens.maxAreaKm2.toFixed(2) : sens.maxAreaKm2.toFixed(1);
  assert.ok(rangeLine.includes(expectedMin), `${c.id} missing min area`);
  assert.ok(rangeLine.includes(expectedMax), `${c.id} missing max area`);
  assert.ok(!rangeLine.includes('detected as flooded'), `${c.id} range line must not contain 'detected as flooded'`);

  // Step 1c explicit checks
  if (c.id === 'amazon') {
    assert.ok(rangeLine.includes('0.05'), 'Amazon range line must contain "0.05"');
    assert.ok(rangeLine.includes('4.64'), 'Amazon range line must contain "4.64"');
  }
  if (c.mode === 'flood' || c.mode === 'surface-water') {
    assert.ok(threshLine.includes('counted as water'), `${c.id} water threshold line must contain "counted as water"`);
  }

  // C. Sensitivity class sentence
  const classSentence = buildSensitivityClassSentence(sens);
  assert.equal(classSentence, c.expectedClassSentence, `${c.id} class sentence mismatch`);
  assert.ok(classSentence.length <= 190, `${c.id} class sentence exceeds 190 chars (${classSentence.length})`);

  // D. Radar method line
  const methodLine = buildRadarMethodLine(c.mode);
  assert.equal(methodLine, c.expectedMethod, `${c.id} method line mismatch`);
  assert.ok(methodLine.length <= 190, `${c.id} method line exceeds 190 chars (${methodLine.length})`);

  // E. Full narration parts
  const fullParts = buildAnalysisNarrationParts({
    mode: c.mode,
    affectedAreaKm2: c.area,
    percentChanged: c.pct,
    sensitivity: sens,
    detail: 'full',
  });
  assert.equal(fullParts.length, 5, `${c.id} full parts count should be 5`);
  for (const part of fullParts) {
    assert.ok(part.length <= 190, `${c.id} full narration part exceeds 190 chars: "${part}" (${part.length})`);
    assert.ok(!part.includes('best threshold'), `Must not say 'best threshold' in: "${part}"`);
    assert.ok(!part.includes('validated'), `Must not claim 'validated' in: "${part}"`);
    assert.ok(!part.includes('detected as flooded'), `Must not contain 'detected as flooded' in: "${part}"`);
  }

  // F. Short narration parts
  const shortParts = buildAnalysisNarrationParts({
    mode: c.mode,
    affectedAreaKm2: c.area,
    percentChanged: c.pct,
    sensitivity: sens,
    detail: 'short',
  });
  assert.equal(shortParts.length, 2, `${c.id} short parts count should be 2`);
  assert.ok(shortParts[0].includes('Analysis complete.'), `${c.id} short missing headline`);
  assert.equal(shortParts[1], c.expectedClassSentence, `${c.id} short missing class sentence`);

  // G. Speaking time estimation (chars / 15 chars per second)
  const fullText = fullParts.join(' ');
  const estimatedSeconds = Math.round((fullText.length / 15) * 10) / 10;
  estimatedDurations[c.id] = {
    chars: fullText.length,
    estimatedSeconds,
  };
}

console.log('✓ Extended narration generation tests passed for Sylhet, Amazon, Tanguar');
console.log('  Speaking time estimates (~15 chars/sec):');
for (const [id, d] of Object.entries(estimatedDurations)) {
  console.log(`    - ${id}: ${d.chars} chars -> approx ${d.estimatedSeconds}s`);
}

// 14. Reliability notes test
const honestyNote =
  'Optical validation against Sentinel-2 on 2022-06-20 showed 87% spatial agreement in non-vegetated areas. Emergent vegetation causes known SAR undercounting.';
const notesLines = buildReliabilityNotesLines([honestyNote]);
assert.ok(notesLines.length >= 2, 'Expected intro plus note line');
assert.equal(notesLines[0], 'Reliability notes, computed from data, not written by AI.');
for (const nl of notesLines) {
  assert.ok(nl.length <= 190, `Reliability note part exceeds 190 chars: ${nl.length}`);
}
console.log('✓ Reliability notes generation tests passed');

// 15. NISAR time series narration tests
const nisarJsonPath = path.join(rootDir, 'data', 'nisar', 'hakaluki-haor', 'timeseries.json');
assert.ok(fs.existsSync(nisarJsonPath), 'Missing data/nisar/hakaluki-haor/timeseries.json');
const nisarData = JSON.parse(fs.readFileSync(nisarJsonPath, 'utf-8'));

const nisarShortParts = buildNisarNarrationParts(nisarData, 'short');
assert.equal(nisarShortParts.length, 2, 'NISAR short mode must produce exactly 2 parts (headline + 1 line)');

const nisarFullParts = buildNisarNarrationParts(nisarData, 'full');
assert.equal(nisarFullParts.length, 4, 'NISAR full mode must produce exactly 4 parts');

const allNisarParts = [...nisarShortParts, ...nisarFullParts];
for (const p of allNisarParts) {
  assert.ok(p.length <= 190, `NISAR line exceeds 190 chars: "${p}" (${p.length})`);
}

const shortJoined = nisarShortParts.join(' ');
const fullJoined = nisarFullParts.join(' ');

// Mandatory required strings in both modes
const requiredNisarStrings = ['PROVISIONAL', '104.86', 'not water', '2026-08-22'];
for (const req of requiredNisarStrings) {
  assert.ok(shortJoined.includes(req), `NISAR short mode missing required string: "${req}"`);
  assert.ok(fullJoined.includes(req), `NISAR full mode missing required string: "${req}"`);
}

// Additional content requirements
assert.ok(shortJoined.includes('cause not established'), 'NISAR short mode missing "cause not established"');
assert.ok(fullJoined.includes('cause not established'), 'NISAR full mode missing "cause not established"');
assert.ok(shortJoined.includes('low-backscatter area'), 'NISAR short mode missing "low-backscatter area"');
assert.ok(fullJoined.includes('low-backscatter area'), 'NISAR full mode missing "low-backscatter area"');
assert.ok(shortJoined.includes('no single threshold is justified'), 'NISAR short mode missing "no single threshold is justified"');
assert.ok(fullJoined.includes('no single threshold is justified'), 'NISAR full mode missing "no single threshold is justified"');

// Forbidden words check across all NISAR lines (case-insensitive)
const forbiddenNisarWords = [
  'flood',
  'water area',
  'open water',
  'retreat',
  'monsoon',
  'dry season',
  'peak',
  'calibration anomaly',
  'shrinking',
  'expanding',
  'recedes',
  'summer',
  'winter',
  'autumn',
  'spring',
];

for (const line of allNisarParts) {
  const lower = line.toLowerCase();
  for (const word of forbiddenNisarWords) {
    assert.ok(
      !lower.includes(word),
      `Forbidden word "${word}" found in NISAR Chiku line: "${line}"`
    );
  }
}
// Event builder test: buildChikuScript with 'nisar-view' must return the first sentence of buildNisarNarrationParts
const nisarEventScript = buildChikuScript(
  { type: 'nisar-view', data: { timeseries: nisarData }, message: '' },
  { narrationDetail: 'short' }
);
assert.equal(
  nisarEventScript,
  nisarShortParts[0],
  'buildChikuScript for nisar-view must return first sentence of buildNisarNarrationParts'
);

console.log('✓ NISAR time series narration tests passed (short + full modes, required strings, forbidden words scanned)');

// 16. Sylhet flood exposure narration tests
const exposureJsonPath = path.join(rootDir, 'data', 'exposure', 'sylhet.json');
assert.ok(fs.existsSync(exposureJsonPath), 'Missing data/exposure/sylhet.json');
const exposureData = JSON.parse(fs.readFileSync(exposureJsonPath, 'utf-8'));

const exposureShortParts = buildSylhetExposureNarrationParts(exposureData, 'short');
assert.equal(exposureShortParts.length, 2, 'Exposure short mode must produce exactly 2 parts (headline + 1 line)');

const exposureFullParts = buildSylhetExposureNarrationParts(exposureData, 'full');
assert.equal(exposureFullParts.length, 4, 'Exposure full mode must produce exactly 4 parts');

const allExposureParts = [...exposureShortParts, ...exposureFullParts];
for (const p of allExposureParts) {
  assert.ok(p.length <= 190, `Exposure line exceeds 190 chars: "${p}" (${p.length})`);
}

const expShortJoined = exposureShortParts.join(' ').toLowerCase();
const expFullJoined = exposureFullParts.join(' ').toLowerCase();

// Required keywords: 'prototype', 'not validated', 'estimated'
const requiredExposureWords = ['prototype', 'not validated', 'estimated'];
for (const word of requiredExposureWords) {
  assert.ok(expShortJoined.includes(word), `Exposure short mode missing required word: "${word}"`);
  assert.ok(expFullJoined.includes(word), `Exposure full mode missing required word: "${word}"`);
}

// Required content: rounded numbers, percentage, threshold choice
assert.ok(expShortJoined.includes('74 thousand'), 'Short mode missing rounded headline 74 thousand');
assert.ok(expFullJoined.includes('74 thousand'), 'Full mode missing rounded headline 74 thousand');
assert.ok(expFullJoined.includes('57 thousand') && expFullJoined.includes('94 thousand'), 'Full mode missing range 57 thousand to 94 thousand');
assert.ok(expFullJoined.includes('7.1 percent'), 'Full mode missing percentage 7.1 percent');
assert.ok(expFullJoined.includes('radar threshold'), 'Full mode missing radar threshold mention');

// Forbidden words check across all exposure lines (case-insensitive)
const forbiddenExposureWords = [
  'affected population',
  'relief',
  'priority',
  'evacuation',
  'casualties',
  'rescue',
  'flooded people',
  'trapped',
];

for (const line of allExposureParts) {
  const lower = line.toLowerCase();
  for (const word of forbiddenExposureWords) {
    assert.ok(
      !lower.includes(word),
      `Forbidden word "${word}" found in Exposure Chiku line: "${line}"`
    );
  }
}
// Event builder test: buildChikuScript with 'exposure-view' must return the first sentence of buildSylhetExposureNarrationParts
const exposureEventScript = buildChikuScript(
  { type: 'exposure-view', data: { exposure: exposureData }, message: '' },
  { narrationDetail: 'short' }
);
assert.equal(
  exposureEventScript,
  exposureShortParts[0],
  'buildChikuScript for exposure-view must return first sentence of buildSylhetExposureNarrationParts'
);

console.log('✓ Sylhet exposure narration tests passed (short + full modes, required strings, forbidden words scanned)');

console.log('\nAll Chiku Voice Guide test cases passed successfully!');
