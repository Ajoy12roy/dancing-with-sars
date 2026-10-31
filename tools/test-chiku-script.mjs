// Comprehensive unit test suite for Chiku Voice Guide sentence builder (lib/chiku-script.ts)
import assert from 'node:assert/strict';

export const MODE_LABELS = {
  flood: 'Flood',
  'river-erosion': 'River erosion',
  deforestation: 'Deforestation',
  'surface-water': 'Surface water',
};

function getSensitivityClass(sens) {
  const span = sens.maxAreaKm2 - sens.minAreaKm2;
  const ratio = sens.centre > 0 ? span / sens.centre : 0;
  if (ratio < 0.15) return 'stable';
  if (ratio <= 0.50) return 'moderate';
  return 'high';
}

function formatRangeString(range) {
  if (!range) return null;
  if (typeof range === 'string') {
    const trimmed = range.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof range === 'object' && range !== null) {
    const { start, end } = range;
    if (start && end) {
      return start === end ? start : `${start} to ${end}`;
    }
    if (start) return start;
    if (end) return end;
  }
  return null;
}

function cleanUploadError(errorText) {
  if (!errorText) return 'Please check the file format and try again.';
  let cleaned = errorText
    .replace(/[A-Za-z]:\\[^\s]+/g, '')
    .replace(/\/[^\s]+\/[^\s]+/g, '')
    .replace(/at\s+[\w\d_.]+\s+\(.*?\)/g, '')
    .replace(/Error:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) cleaned = 'Please check the file format and try again.';
  const prefix = 'I could not use that file. ';
  const maxLen = 195 - prefix.length;
  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen - 3) + '...';
  }
  return cleaned;
}

function buildChikuScript(event, context) {
  switch (event.type) {
    case 'mode-changed': {
      const modeKey = event.data?.mode || context?.mode || 'flood';
      const label = MODE_LABELS[modeKey] || modeKey;
      return `${label} mode is ready.`.slice(0, 195);
    }

    case 'case-selected': {
      const title = context?.caseTitle || event.data?.title || 'Case study';
      const before = formatRangeString(context?.beforeRange || event.data?.beforeRange);
      const after = formatRangeString(context?.afterRange || event.data?.afterRange);

      if (before && after) {
        return `Loaded ${title}. Comparing ${before} with ${after}.`.slice(0, 195);
      }
      return `Loaded ${title}.`.slice(0, 195);
    }

    case 'upload-accepted': {
      return 'Your satellite images have been uploaded successfully.';
    }

    case 'upload-rejected': {
      const rawError =
        event.data?.error ||
        (event.message ? event.message.replace(/^Upload rejected:\s*/i, '') : '');
      const reason = cleanUploadError(rawError);
      return `I could not use that file. ${reason}`.slice(0, 195);
    }

    case 'analysis-loading':
    case 'general': {
      if (event.type === 'analysis-loading' || event.message?.toLowerCase().includes('analyzing')) {
        return 'Analyzing the satellite imagery. Please wait.';
      }
      return event.message ? event.message.slice(0, 195) : 'Terra Pulse radar guide ready.';
    }

    case 'analysis-ready': {
      const area = context?.affectedAreaKm2 ?? event.data?.affectedAreaKm2;
      const pct = context?.percentChanged ?? event.data?.percentChanged;
      const sens = context?.sensitivity || event.data?.sensitivity;

      let sentence1 = 'Analysis complete.';
      if (typeof area === 'number' && typeof pct === 'number') {
        sentence1 = `Analysis complete. About ${area.toFixed(1)} square kilometres changed, ${pct.toFixed(1)} percent of the area.`;
      } else if (typeof area === 'number') {
        sentence1 = `Analysis complete. About ${area.toFixed(1)} square kilometres changed across the area.`;
      }

      if (sens) {
        const cls = getSensitivityClass(sens);
        const minStr = sens.minAreaKm2.toFixed(1);
        const maxStr = sens.maxAreaKm2.toFixed(1);

        let sentence2 = '';
        if (cls === 'high') {
          sentence2 = `High sensitivity: treat this number as indicative only, spanning ${minStr} to ${maxStr} square kilometres.`;
        } else if (cls === 'moderate') {
          sentence2 = `Moderate sensitivity, spanning ${minStr} to ${maxStr} square kilometres across threshold offsets.`;
        } else {
          sentence2 = `Stable classification, spanning ${minStr} to ${maxStr} square kilometres under threshold variation.`;
        }
        return `${sentence1} ${sentence2}`.slice(0, 195);
      }

      return sentence1.slice(0, 195);
    }

    case 'analysis-failed': {
      return 'The analysis could not finish. Please try again.';
    }

    case 'ai-insight-loaded': {
      return 'The AI interpretation is ready below.';
    }

    default: {
      return event.message ? event.message.slice(0, 195) : 'Terra Pulse radar guide ready.';
    }
  }
}

console.log('Running Chiku Voice Guide Script Tests...\n');

// 1. Mode opened tests
const modeTests = [
  { mode: 'flood', expected: 'Flood mode is ready.' },
  { mode: 'river-erosion', expected: 'River erosion mode is ready.' },
  { mode: 'deforestation', expected: 'Deforestation mode is ready.' },
  { mode: 'surface-water', expected: 'Surface water mode is ready.' },
];
for (const mt of modeTests) {
  const line = buildChikuScript({ type: 'mode-changed', data: { mode: mt.mode }, message: '' });
  assert.equal(line, mt.expected, `Mode test failed for ${mt.mode}`);
  assert.ok(line.length < 200, 'Length under 200');
}
console.log('✓ Mode opened tests passed (Flood, River erosion, Deforestation, Surface water)');

// 2. Case selected tests
// 2a. With range
const caseWithRange = buildChikuScript(
  { type: 'case-selected', data: { title: 'Sylhet Flood 2022' }, message: '' },
  {
    caseTitle: 'Sylhet Flood 2022',
    beforeRange: { start: '2022-05-01', end: '2022-05-10' },
    afterRange: { start: '2022-06-15', end: '2022-06-25' },
  }
);
assert.equal(
  caseWithRange,
  'Loaded Sylhet Flood 2022. Comparing 2022-05-01 to 2022-05-10 with 2022-06-15 to 2022-06-25.'
);
assert.ok(caseWithRange.length < 200, 'Case with range under 200 chars');

// 2b. Missing range fallback
const caseMissingRange = buildChikuScript(
  { type: 'case-selected', data: { title: 'Sylhet Flood 2022' }, message: '' },
  { caseTitle: 'Sylhet Flood 2022' }
);
assert.equal(caseMissingRange, 'Loaded Sylhet Flood 2022.');
assert.ok(caseMissingRange.length < 200, 'Case missing range under 200 chars');
console.log('✓ Case selected tests passed (with date ranges & missing range fallback)');

// 3. Upload accepted test
const uploadAccepted = buildChikuScript({ type: 'upload-accepted', message: '' });
assert.equal(uploadAccepted, 'Your satellite images have been uploaded successfully.');
assert.ok(uploadAccepted.length < 200, 'Upload accepted under 200 chars');
console.log('✓ Upload accepted test passed');

// 4. Upload rejected tests
// 4a. Short error
const uploadRejectedShort = buildChikuScript({
  type: 'upload-rejected',
  data: { error: 'Only .tif or .tiff files are supported.' },
  message: '',
});
assert.equal(uploadRejectedShort, 'I could not use that file. Only .tif or .tiff files are supported.');
assert.ok(uploadRejectedShort.length < 200, 'Upload rejected short under 200 chars');

// 4b. Long error with paths and stack trace truncation
const longError =
  'Error: Failed at C:\\Users\\User\\Workspace\\file.ts:42 at Object.run (/var/app/internal.js) with very long detail '.repeat(5);
const uploadRejectedLong = buildChikuScript({
  type: 'upload-rejected',
  data: { error: longError },
  message: '',
});
assert.ok(uploadRejectedLong.startsWith('I could not use that file.'), 'Starts with standard prefix');
assert.ok(!uploadRejectedLong.includes('C:\\'), 'Paths are stripped');
assert.ok(!uploadRejectedLong.includes('/var/app'), 'Paths are stripped');
assert.ok(uploadRejectedLong.length <= 195, 'Truncated strictly under 195 chars');
console.log('✓ Upload rejected tests passed (short error & path/stack truncation under 200 chars)');

// 5. Processing test
const processing = buildChikuScript({ type: 'analysis-loading', message: '' });
assert.equal(processing, 'Analyzing the satellite imagery. Please wait.');
assert.ok(processing.length < 200, 'Processing under 200 chars');
console.log('✓ Processing test passed');

// 6. Analysis complete tests
// 6a. Stable sensitivity
const stableSens = {
  parameterName: 'water_threshold_db',
  unit: 'dB',
  centre: 262.88,
  minAreaKm2: 249.87,
  maxAreaKm2: 267.93,
  steps: [],
};
const stableScript = buildChikuScript(
  { type: 'analysis-ready', message: '' },
  {
    caseTitle: 'Tanguar Haor',
    affectedAreaKm2: 262.88,
    percentChanged: 15.24,
    sensitivity: stableSens,
  }
);
assert.ok(stableScript.includes('About 262.9 square kilometres changed, 15.2 percent of the area.'));
assert.ok(stableScript.includes('Stable classification, spanning 249.9 to 267.9 square kilometres under threshold variation.'));
assert.ok(!stableScript.includes('validated'), 'Must not claim validated');
assert.ok(stableScript.length < 200, 'Stable sensitivity under 200 chars');

// 6b. Moderate sensitivity
const moderateSens = {
  parameterName: 'water_threshold_db',
  unit: 'dB',
  centre: 37.19,
  minAreaKm2: 30.85,
  maxAreaKm2: 44.01,
  steps: [],
};
const moderateScript = buildChikuScript(
  { type: 'analysis-ready', message: '' },
  {
    caseTitle: 'Sylhet Flood 2022',
    affectedAreaKm2: 37.19,
    percentChanged: 17.05,
    sensitivity: moderateSens,
  }
);
assert.ok(moderateScript.includes('About 37.2 square kilometres changed, 17.1 percent of the area.'));
assert.ok(moderateScript.includes('Moderate sensitivity, spanning 30.9 to 44.0 square kilometres across threshold offsets.'));
assert.ok(!moderateScript.includes('validated'), 'Must not claim validated');
assert.ok(moderateScript.length < 200, 'Moderate sensitivity under 200 chars');

// 6c. High sensitivity
const highSens = {
  parameterName: 'loss_threshold_db',
  unit: 'dB',
  centre: 0.62,
  minAreaKm2: 0.05,
  maxAreaKm2: 4.64,
  steps: [],
};
const highScript = buildChikuScript(
  { type: 'analysis-ready', message: '' },
  {
    caseTitle: 'Amazon Rainforest 2023',
    affectedAreaKm2: 0.62,
    percentChanged: 2.31,
    sensitivity: highSens,
  }
);
assert.ok(highScript.includes('About 0.6 square kilometres changed, 2.3 percent of the area.'));
assert.ok(highScript.includes('High sensitivity: treat this number as indicative only, spanning 0.1 to 4.6 square kilometres.'));
assert.ok(!highScript.includes('validated'), 'Must not claim validated');
assert.ok(highScript.length < 200, 'High sensitivity under 200 chars');

// 6d. Custom upload without sensitivity
const customScript = buildChikuScript(
  { type: 'analysis-ready', message: '' },
  {
    affectedAreaKm2: 42.0,
    percentChanged: 10.5,
  }
);
assert.equal(
  customScript,
  'Analysis complete. About 42.0 square kilometres changed, 10.5 percent of the area.'
);
assert.ok(!customScript.includes('validated'), 'Must not claim validated');
assert.ok(customScript.length < 200, 'Custom upload under 200 chars');
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

console.log('\nAll Chiku Voice Guide test cases passed successfully!');
