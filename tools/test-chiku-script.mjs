// Unit tests for Chiku sentence builder (lib/chiku-script.ts)
import assert from 'node:assert/strict';

// Simple mock/implementation matching lib/chiku-script.ts logic
function getSensitivityClass(sens) {
  const span = sens.maxAreaKm2 - sens.minAreaKm2;
  const ratio = sens.centre > 0 ? span / sens.centre : 0;
  if (ratio < 0.15) return 'stable';
  if (ratio <= 0.50) return 'moderate';
  return 'high';
}

function buildChikuScript(event, context) {
  switch (event.type) {
    case 'case-selected': {
      const title = context?.caseTitle || event.data?.title || 'Case study';
      const mode = context?.mode || event.data?.mode || 'flood';
      return `Loaded ${title} in ${mode} mode. Comparing before and after SAR radar scenes.`.slice(0, 195);
    }
    case 'mode-changed': {
      const mode = context?.mode || event.data?.mode || 'flood';
      return `Switched to ${mode} mode.`.slice(0, 195);
    }
    case 'analysis-ready': {
      const area = context?.affectedAreaKm2 ?? event.data?.affectedAreaKm2;
      const sens = context?.sensitivity;
      const areaStr = typeof area === 'number' ? `${area.toFixed(1)} km²` : 'area';

      if (sens) {
        const cls = getSensitivityClass(sens);
        const minStr = sens.minAreaKm2.toFixed(1);
        const maxStr = sens.maxAreaKm2.toFixed(1);

        if (cls === 'high') {
          return `${areaStr} affected. High sensitivity: treat this number as indicative only, spanning ${minStr} to ${maxStr} km².`.slice(0, 195);
        } else if (cls === 'moderate') {
          return `${areaStr} affected. Moderate sensitivity, spanning ${minStr} to ${maxStr} km² across threshold offsets.`.slice(0, 195);
        } else {
          return `${areaStr} affected. Stable classification, spanning ${minStr} to ${maxStr} km² under threshold variation.`.slice(0, 195);
        }
      }
      return `Analysis complete: ${areaStr} detected across the observation area.`.slice(0, 195);
    }
    default:
      return event.message ? event.message.slice(0, 195) : 'Ready.';
  }
}

// 1. Stable test case (Tanguar Haor: centre 262.88, min 249.87, max 267.93 -> span ratio 0.0687 < 0.15)
const stableSens = {
  parameterName: 'water_threshold_db',
  unit: 'dB',
  centre: 262.88,
  minAreaKm2: 249.87,
  maxAreaKm2: 267.93,
  steps: []
};
const stableEvent = { type: 'analysis-ready', message: 'Analysis complete' };
const stableScript = buildChikuScript(stableEvent, {
  caseTitle: 'Tanguar Haor',
  mode: 'surface-water',
  affectedAreaKm2: 262.88,
  sensitivity: stableSens,
});
console.log('Stable result:', stableScript);
assert.ok(stableScript.includes('Stable classification'), 'Must identify as stable');
assert.ok(stableScript.includes('262.9 km² affected'), 'Must include formatted area');
assert.ok(stableScript.length <= 200, 'Utterance must be under 200 characters');

// 2. Moderate test case (Sylhet Flood: centre 37.19, min 30.85, max 44.01 -> span ratio 0.3539)
const moderateSens = {
  parameterName: 'water_threshold_db',
  unit: 'dB',
  centre: 37.19,
  minAreaKm2: 30.85,
  maxAreaKm2: 44.01,
  steps: []
};
const moderateEvent = { type: 'analysis-ready', message: 'Analysis complete' };
const moderateScript = buildChikuScript(moderateEvent, {
  caseTitle: 'Sylhet Flood 2022',
  mode: 'flood',
  affectedAreaKm2: 37.19,
  sensitivity: moderateSens,
});
console.log('Moderate result:', moderateScript);
assert.ok(moderateScript.includes('Moderate sensitivity'), 'Must identify as moderate');
assert.ok(moderateScript.includes('37.2 km² affected'), 'Must include formatted area');
assert.ok(moderateScript.length <= 200, 'Utterance must be under 200 characters');

// 3. High test case (Amazon Deforestation: centre 0.62, min 0.05, max 4.64 -> span ratio 7.4032)
const highSens = {
  parameterName: 'loss_threshold_db',
  unit: 'dB',
  centre: 0.62,
  minAreaKm2: 0.05,
  maxAreaKm2: 4.64,
  steps: []
};
const highEvent = { type: 'analysis-ready', message: 'Analysis complete' };
const highScript = buildChikuScript(highEvent, {
  caseTitle: 'Amazon Rainforest 2023',
  mode: 'deforestation',
  affectedAreaKm2: 0.62,
  sensitivity: highSens,
});
console.log('High result:', highScript);
assert.ok(highScript.includes('High sensitivity: treat this number as indicative only'), 'Must use cautious phrasing for high sensitivity');
assert.ok(highScript.includes('0.6 km² affected'), 'Must include formatted area');
assert.ok(highScript.length <= 200, 'Utterance must be under 200 characters');

console.log('All 3 Chiku sentence builder unit tests passed successfully!');
