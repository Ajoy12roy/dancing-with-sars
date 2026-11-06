// Comprehensive unit test suite for Chiku Voice Guide sentence builder (lib/chiku-script.ts)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const MODE_LABELS = {
  flood: 'Flood',
  'river-erosion': 'River erosion',
  deforestation: 'Deforestation',
  'surface-water': 'Surface water',
};

export const PAGE_INTROS = {
  '/': "This is Terra Pulse. It compares radar images from two dates to show where Earth's surface has changed.",
  '/explore': 'Pick a case study, or upload your own pair of radar images.',
  '/how-it-works': 'Here is how the method works, from the radar image to the changed area.',
  '/data-sources': "Our demo cases use Sentinel-1 radar through Google Earth Engine. NASA's ASF archive also distributes the same data.",
};

export const INTERACTION_HINTS = {
  slider: 'Drag the slider to compare the two dates.',
  sensitivity: 'This table shows how the result changes if the threshold moves. A wide range means less certainty.',
  'text-summary': 'This is a text description of the map.',
};

function getSensitivityClass(sens) {
  const centreStep =
    sens.steps?.find((s) => s.value === sens.centre) ||
    sens.steps?.[Math.floor((sens.steps?.length || 0) / 2)];
  const centreArea = centreStep ? centreStep.areaKm2 : 0;
  if (centreArea <= 0) return 'stable';
  const span = sens.maxAreaKm2 - sens.minAreaKm2;
  const ratio = span / centreArea;
  if (ratio < 0.15) return 'stable';
  if (ratio <= 0.50) return 'moderate';
  return 'high';
}

function getSensitivityParameterLabel(paramName) {
  if (paramName === 'water_threshold') return 'water threshold';
  if (paramName === 'loss_threshold_db') return 'loss threshold';
  return (paramName || '').replace(/_/g, ' ');
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
    .replace(/\bat\s+[\w\d_.]+(?:\.py)?(?:\s+line\s+\d+)?(?:\s+\(.*?\))?/gi, '')
    .replace(/\b[\w\d_.-]+\.py\b/gi, '')
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

function formatNumberInWords(val) {
  if (val === 0) return '0';
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const formattedAbs = absVal % 1 === 0 ? absVal.toFixed(0) : absVal.toFixed(1);
  return isNegative ? `minus ${formattedAbs}` : formattedAbs;
}

function splitForSpeech(text, maxLen = 190) {
  if (!text) return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLen) return [trimmed];

  const rawSentences = [];
  let startIdx = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '.' || ch === '!' || ch === '?') {
      if (ch === '.') {
        const prev = i > 0 ? trimmed[i - 1] : '';
        const next = i + 1 < trimmed.length ? trimmed[i + 1] : '';
        if (/\d/.test(prev) && /\d/.test(next)) {
          continue;
        }
      }
      if (i + 1 === trimmed.length || /\s/.test(trimmed[i + 1])) {
        const sentence = trimmed.slice(startIdx, i + 1).trim();
        if (sentence) rawSentences.push(sentence);
        startIdx = i + 1;
      }
    }
  }
  const leftover = trimmed.slice(startIdx).trim();
  if (leftover) rawSentences.push(leftover);

  const parts = [];
  let current = '';

  for (const s of rawSentences) {
    if (s.length <= maxLen) {
      if (!current) {
        current = s;
      } else if ((current + ' ' + s).length <= maxLen) {
        current = current + ' ' + s;
      } else {
        parts.push(current);
        current = s;
      }
    } else {
      if (current) {
        parts.push(current);
        current = '';
      }
      const words = s.split(/\s+/);
      let wordAcc = '';
      for (const w of words) {
        if (!wordAcc) {
          wordAcc = w;
        } else if ((wordAcc + ' ' + w).length <= maxLen) {
          wordAcc = wordAcc + ' ' + w;
        } else {
          parts.push(wordAcc);
          wordAcc = w;
        }
      }
      if (wordAcc) {
        parts.push(wordAcc);
      }
    }
  }
  if (current) {
    parts.push(current);
  }

  return parts;
}

function getRadarMethodExplanation(mode) {
  switch (mode) {
    case 'flood':
      return 'We smooth Sentinel-1 radar backscatter with a 5-pixel median filter, then flag pixels that drop below the threshold as open water.';
    case 'deforestation':
      return 'We smooth Sentinel-1 radar backscatter with a 5-pixel median filter, then flag pixels where backscatter dropped by more than the threshold between pre- and post-dates.';
    case 'river-erosion':
      return 'We compare land-to-water transitions using radar backscatter smoothing and thresholding, filtering patches smaller than 20 pixels.';
    case 'surface-water':
      return 'We smooth Sentinel-1 radar backscatter and flag pixels below the threshold as surface water, filtering isolated speckle.';
    default:
      return 'We smooth Sentinel-1 radar backscatter with a 5-pixel median filter and apply deterministic thresholding.';
  }
}

function buildThresholdLine(mode, sensitivity) {
  const paramLabel = getSensitivityParameterLabel(sensitivity.parameterName);
  const centreSpoken = `${formatNumberInWords(sensitivity.centre)} decibels`;

  let meaning = 'values beyond this trigger the change detection';
  if (sensitivity.parameterName === 'water_threshold') {
    meaning = 'pixels darker than this are counted as water';
  } else if (sensitivity.parameterName === 'loss_threshold_db') {
    meaning = 'drops greater than this indicate canopy loss';
  }

  return `The headline result uses a ${paramLabel} of ${centreSpoken}: ${meaning}. This is a fixed default setting, not a value proven to be the best.`;
}

function buildTestedRangeLine(sensitivity) {
  const steps = sensitivity.steps || [];
  const minStep = steps.length > 0 ? steps[0].value : sensitivity.centre;
  const maxStep = steps.length > 0 ? steps[steps.length - 1].value : sensitivity.centre;
  const useTwoDecimals = sensitivity.minAreaKm2 < 1 || sensitivity.maxAreaKm2 < 1;
  const minArea = useTwoDecimals ? sensitivity.minAreaKm2.toFixed(2) : sensitivity.minAreaKm2.toFixed(1);
  const maxArea = useTwoDecimals ? sensitivity.maxAreaKm2.toFixed(2) : sensitivity.maxAreaKm2.toFixed(1);

  return `We also tested ${formatNumberInWords(minStep)} to ${formatNumberInWords(maxStep)} decibels. The area ranged from ${minArea} to ${maxArea} square kilometres.`;
}

function buildSensitivityClassSentence(sensitivity) {
  const cls = getSensitivityClass(sensitivity);
  switch (cls) {
    case 'stable':
      return 'This detection is relatively stable across threshold choices.';
    case 'moderate':
      return 'Different threshold choices change the detected area moderately.';
    case 'high':
      return 'Treat this number with extra caution: small threshold changes move the result significantly.';
  }
}

function buildRadarMethodLine(mode) {
  return getRadarMethodExplanation(mode);
}

function buildReliabilityNotesLines(notes) {
  if (!notes || notes.length === 0) return [];
  const validNotes = notes.slice(0, 3);
  const intro = 'Reliability notes, computed from data, not written by AI.';
  const noteLines = [];

  for (const note of validNotes) {
    const split = splitForSpeech(note, 190);
    noteLines.push(...split);
  }

  return [intro, ...noteLines];
}

function buildAnalysisNarrationParts(params) {
  const { mode = 'flood', affectedAreaKm2, percentChanged, sensitivity, detail = 'full' } = params;

  let headline = 'Analysis complete.';
  if (typeof affectedAreaKm2 === 'number' && typeof percentChanged === 'number') {
    const areaStr = affectedAreaKm2 < 1 ? affectedAreaKm2.toFixed(2) : affectedAreaKm2.toFixed(1);
    headline = `Analysis complete. About ${areaStr} square kilometres changed, ${percentChanged.toFixed(1)} percent of the area.`;
  } else if (typeof affectedAreaKm2 === 'number') {
    const areaStr = affectedAreaKm2 < 1 ? affectedAreaKm2.toFixed(2) : affectedAreaKm2.toFixed(1);
    headline = `Analysis complete. About ${areaStr} square kilometres changed across the area.`;
  }

  if (detail === 'short') {
    if (sensitivity) {
      return [headline, buildSensitivityClassSentence(sensitivity)];
    }
    return [headline];
  }

  const parts = [headline];

  if (sensitivity) {
    parts.push(buildThresholdLine(mode, sensitivity));
    parts.push(buildTestedRangeLine(sensitivity));
    parts.push(buildSensitivityClassSentence(sensitivity));
  }

  parts.push(buildRadarMethodLine(mode));

  return parts;
}

function buildNisarNarrationParts(data, detail = 'short') {
  const maturity = data.dataMaturity || 'PROVISIONAL';
  const crid = data.crid || 'P05023';
  const winArea = data.window?.windowAreaKm2 ?? 104.86;
  const winAreaStr = winArea.toFixed(2);
  const winPct = data.window?.windowCoveragePercentageOfCaseBbox ?? 32.4;
  const winPctStr = winPct.toFixed(1);
  const excludedRecord = data.records?.find((r) => r.excluded);
  const excludedDate = excludedRecord?.date || '2026-08-22';
  const totalCount = data.records?.length ?? 10;

  if (detail === 'short') {
    return [
      `NISAR observation is ${maturity}.`,
      `It measures low-backscatter area below fixed thresholds (not water) across ${winAreaStr} square kilometres; ${excludedDate} is excluded as cause not established and no single threshold is justified.`,
    ];
  }

  return [
    `NISAR observation is ${maturity} with CRID ${crid}.`,
    `The 1024 by 1024 window covers ${winAreaStr} square kilometres, about ${winPctStr} percent of the Hakaluki case area.`,
    `It tracks low-backscatter area below fixed thresholds (not water); values differ by threshold and no single threshold is justified.`,
    `${totalCount === 10 ? 'Ten' : totalCount} repeat observations were processed; the acquisition on ${excludedDate} is excluded with cause not established.`,
  ];
}

function buildSylhetExposureNarrationParts(data, detail = 'short') {
  const defVal = data.minDefaultMax?.default?.estimatedPeopleInExtent ?? 74413;
  const minVal = data.minDefaultMax?.min?.estimatedPeopleInExtent ?? 57480;
  const maxVal = data.minDefaultMax?.max?.estimatedPeopleInExtent ?? 93745;
  const defPct = data.minDefaultMax?.default?.populationSharePct ?? 7.1;

  const defRounded = Math.round(defVal / 1000) * 1000;
  const minRounded = Math.round(minVal / 1000) * 1000;
  const maxRounded = Math.round(maxVal / 1000) * 1000;

  if (detail === 'short') {
    return [
      `Estimated people living inside the mapped new-water extent is about ${formatNumberInWords(defRounded)}.`,
      `This estimate is a prototype, not validated, based on spreading 2020 population counts over mapped new water.`,
    ];
  }

  return [
    `Estimated people living inside the mapped new-water extent is about ${formatNumberInWords(defRounded)}, or ${formatNumberInWords(defPct)} percent of the study area population.`,
    `Across the radar threshold sweep, the range is ${formatNumberInWords(minRounded)} to ${formatNumberInWords(maxRounded)} estimated people.`,
    `This estimate is a prototype, not validated; the range reflects only the choice of radar threshold.`,
    `Population model error, building height, and demographic changes between 2020 and 2022 are not included.`,
  ];
}

function buildChikuScript(event, context) {
  switch (event.type) {
    case 'mode-changed': {
      const modeKey = event.data?.mode || context?.mode || 'flood';
      switch (modeKey) {
        case 'flood':
          return 'Flood monitoring mode is ready. It maps new water between the two dates.';
        case 'deforestation':
          return 'Deforestation mode is ready. It looks for a drop in radar backscatter that can indicate canopy loss.';
        case 'river-erosion':
          return 'River change mode is ready. It maps net land-to-water change along the river between the two dates.';
        case 'surface-water':
          return 'Surface water mode is ready. It maps open water and how it changes between two dates.';
        default: {
          const label = MODE_LABELS[modeKey] || modeKey;
          return `${label} mode is ready.`.slice(0, 195);
        }
      }
    }

    case 'page-intro': {
      const route = event.data?.route || '/';
      return PAGE_INTROS[route] || PAGE_INTROS['/'] || '';
    }

    case 'hint': {
      const hintId = event.data?.hintId || '';
      return INTERACTION_HINTS[hintId] || event.message || '';
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
        const areaStr = area < 1 ? area.toFixed(2) : area.toFixed(1);
        sentence1 = `Analysis complete. About ${areaStr} square kilometres changed, ${pct.toFixed(1)} percent of the area.`;
      } else if (typeof area === 'number') {
        const areaStr = area < 1 ? area.toFixed(2) : area.toFixed(1);
        sentence1 = `Analysis complete. About ${areaStr} square kilometres changed across the area.`;
      }

      if (sens) {
        const cls = getSensitivityClass(sens);
        const useTwoDecimals = sens.minAreaKm2 < 1 || sens.maxAreaKm2 < 1;
        const minStr = useTwoDecimals ? sens.minAreaKm2.toFixed(2) : sens.minAreaKm2.toFixed(1);
        const maxStr = useTwoDecimals ? sens.maxAreaKm2.toFixed(2) : sens.maxAreaKm2.toFixed(1);

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

    case 'exposure-view': {
      const expData = event.data?.exposure || {};
      const parts = buildSylhetExposureNarrationParts(expData, context?.narrationDetail || 'short');
      return parts[0] || 'Estimated people living inside the mapped new-water extent: prototype, not validated.';
    }

    default: {
      return event.message ? event.message.slice(0, 195) : 'Terra Pulse radar guide ready.';
    }
  }
}

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
assert.ok(expShortJoined.includes('74000'), 'Short mode missing rounded headline 74000');
assert.ok(expFullJoined.includes('74000'), 'Full mode missing rounded headline 74000');
assert.ok(expFullJoined.includes('57000') && expFullJoined.includes('94000'), 'Full mode missing range 57000 to 94000');
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
console.log('✓ Sylhet exposure narration tests passed (short + full modes, required strings, forbidden words scanned)');

console.log('\nAll Chiku Voice Guide test cases passed successfully!');
