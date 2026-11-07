// ========================================================================
// Sensitivity Class Consistency Test — Dancing with the SARs
// Tests sensitivity classifications across all 10 ready case studies.
// ========================================================================

import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SENS_DIR = path.join(ROOT_DIR, 'data', 'sensitivity');

const EXPECTED_CLASSES = {
  'sindh-pakistan-2022': 'stable',
  tanguar: 'stable',
  'hakaluki-haor': 'stable',
  'padma-naria': 'stable',
  jamuna: 'moderate',
  sylhet: 'moderate',
  'feni-2024': 'high',
  'rio-grande-do-sul-2024': 'high',
  amazon: 'high',
  'cox-bazar-kutupalong-2017': 'high',
};

function computeSensitivitySpanRatio(sensitivity) {
  if (!sensitivity) return 0;
  const centreStep =
    (sensitivity.steps && sensitivity.steps.find((s) => s.value === sensitivity.centre)) ||
    (sensitivity.steps && sensitivity.steps[Math.floor((sensitivity.steps.length || 0) / 2)]);
  const centreArea = centreStep ? centreStep.areaKm2 : 0;
  if (centreArea <= 0) return 0;
  const span = sensitivity.maxAreaKm2 - sensitivity.minAreaKm2;
  return span / centreArea;
}

function getSensitivityClass(sensitivity) {
  const ratio = computeSensitivitySpanRatio(sensitivity);
  if (ratio < 0.15) return 'stable';
  if (ratio <= 0.50) return 'moderate';
  return 'high';
}

console.log('Running 10-Case Sensitivity Classification Consistency Tests...');

for (const [caseId, expectedClass] of Object.entries(EXPECTED_CLASSES)) {
  const filePath = path.join(SENS_DIR, `${caseId}.json`);
  assert.ok(fs.existsSync(filePath), `Missing sensitivity data file for ${caseId}`);

  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  const spanRatio = computeSensitivitySpanRatio(data);
  const actualClass = getSensitivityClass(data);

  assert.equal(
    actualClass,
    expectedClass,
    `Mismatch for ${caseId}: computed ${actualClass} (spanRatio=${spanRatio.toFixed(4)}), expected ${expectedClass}`
  );

  console.log(`  ✓ ${caseId}: spanRatio=${spanRatio.toFixed(4)} -> ${actualClass} (matches expected ${expectedClass})`);
}

console.log('All 10 sensitivity classification tests passed successfully!\n');
