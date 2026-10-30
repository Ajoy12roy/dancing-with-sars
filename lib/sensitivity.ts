// ========================================================================
// SAR Sensitivity Analysis Registry — Dancing with the SARs (Terra Pulse)
// Loads precomputed threshold sensitivity models for honest uncertainty display.
// Works fully offline on both server and client runtimes.
// ========================================================================

import sylhetSens from '@/data/sensitivity/sylhet.json';
import jamunaSens from '@/data/sensitivity/jamuna.json';
import amazonSens from '@/data/sensitivity/amazon.json';
import tanguarSens from '@/data/sensitivity/tanguar.json';
import feniSens from '@/data/sensitivity/feni-2024.json';
import sindhSens from '@/data/sensitivity/sindh-pakistan-2022.json';
import rioSens from '@/data/sensitivity/rio-grande-do-sul-2024.json';
import padmaSens from '@/data/sensitivity/padma-naria.json';
import coxBazarSens from '@/data/sensitivity/cox-bazar-kutupalong-2017.json';
import hakalukiSens from '@/data/sensitivity/hakaluki-haor.json';

export interface SensitivityStep {
  value: number;
  areaKm2: number;
  percentChanged: number;
}

export interface SensitivityData {
  caseId: string;
  mode: string;
  parameterName: string;
  unit: string;
  centre: number;
  steps: SensitivityStep[];
  minAreaKm2: number;
  maxAreaKm2: number;
  computedBy: string;
  gitCommit: string;
}

const STATIC_SENSITIVITY_MAP: Record<string, SensitivityData> = {
  sylhet: sylhetSens as SensitivityData,
  jamuna: jamunaSens as SensitivityData,
  amazon: amazonSens as SensitivityData,
  tanguar: tanguarSens as SensitivityData,
  'feni-2024': feniSens as SensitivityData,
  'sindh-pakistan-2022': sindhSens as SensitivityData,
  'rio-grande-do-sul-2024': rioSens as SensitivityData,
  'padma-naria': padmaSens as SensitivityData,
  'cox-bazar-kutupalong-2017': coxBazarSens as SensitivityData,
  'hakaluki-haor': hakalukiSens as SensitivityData,
};

/**
 * Retrieves precomputed sensitivity analysis for a given case study ID.
 * Returns null if not computed or unavailable.
 */
export function getSensitivityForCase(caseId: string | null | undefined): SensitivityData | null {
  if (!caseId) return null;
  const cleanId = caseId.replace(/[^a-zA-Z0-9_-]/g, '');

  if (STATIC_SENSITIVITY_MAP[cleanId]) {
    return STATIC_SENSITIVITY_MAP[cleanId];
  }

  // Dynamic server-side fallback if running in a Node.js process
  if (typeof window === 'undefined') {
    try {
      const req = (0, eval)('require');
      const fs = req('fs');
      const path = req('path');
      const filePath = path.join(process.cwd(), 'data', 'sensitivity', `${cleanId}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as SensitivityData;
      }
    } catch {
      // Ignore gracefully if file read fails
    }
  }

  return null;
}

/**
 * Sensitivity Class thresholds:
 * - Stable: spanRatio < 0.15 (<15% variation around centre headline area)
 * - Moderate: 0.15 <= spanRatio <= 0.50 (15% to 50% variation)
 * - High: spanRatio > 0.50 (>50% variation; headline number is indicative only)
 */
export const SENSITIVITY_STABLE_THRESHOLD = 0.15;
export const SENSITIVITY_MODERATE_THRESHOLD = 0.50;

export type SensitivityClass = 'stable' | 'moderate' | 'high';

export interface SensitivityClassBadge {
  cls: SensitivityClass;
  label: string;
  badgeLabel: string;
  srText: string;
  description: string;
}

/**
 * Computes spanRatio = (maxAreaKm2 - minAreaKm2) / centre headline area.
 */
export function computeSensitivitySpanRatio(sensitivity: SensitivityData): number {
  if (!sensitivity) return 0;
  const centreStep =
    sensitivity.steps?.find((s) => s.value === sensitivity.centre) ||
    sensitivity.steps?.[Math.floor((sensitivity.steps?.length || 0) / 2)];
  const centreArea = centreStep ? centreStep.areaKm2 : 0;
  if (centreArea <= 0) return 0;
  const span = sensitivity.maxAreaKm2 - sensitivity.minAreaKm2;
  return span / centreArea;
}

/**
 * Categorizes sensitivity into 'stable' | 'moderate' | 'high'.
 */
export function getSensitivityClass(sensitivity: SensitivityData): SensitivityClass {
  const ratio = computeSensitivitySpanRatio(sensitivity);
  if (ratio < SENSITIVITY_STABLE_THRESHOLD) return 'stable';
  if (ratio <= SENSITIVITY_MODERATE_THRESHOLD) return 'moderate';
  return 'high';
}

/**
 * Returns accessible badge display metadata for a sensitivity class.
 */
export function getSensitivityClassBadgeInfo(cls: SensitivityClass): SensitivityClassBadge {
  switch (cls) {
    case 'stable':
      return {
        cls: 'stable',
        label: 'Stable under threshold changes',
        badgeLabel: 'Stable',
        srText: 'Threshold sensitivity: Stable. Model variation across thresholds is under 15%.',
        description: 'Result variation across thresholds is below 15%. The detected boundary is steep and sharp.',
      };
    case 'moderate':
      return {
        cls: 'moderate',
        label: 'Moderately threshold-sensitive',
        badgeLabel: 'Moderate Sensitivity',
        srText: 'Threshold sensitivity: Moderate. Model variation across thresholds is between 15% and 50%.',
        description: 'Result variation is between 15% and 50%. Boundary transitions involve typical radiometric gradients.',
      };
    case 'high':
      return {
        cls: 'high',
        label: 'Highly threshold-sensitive: treat the headline number as indicative only',
        badgeLabel: 'Highly Sensitive',
        srText: 'Threshold sensitivity: High. Model variation across thresholds exceeds 50%. Treat the headline number as indicative only.',
        description: 'Result variation exceeds 50%. The classification is sensitive to thresholding; treat the headline area as indicative only.',
      };
  }
}

/**
 * Returns parameter human-readable display label.
 */
export function getSensitivityParameterLabel(parameterName: string): string {
  if (parameterName === 'water_threshold') return 'water threshold';
  if (parameterName === 'loss_threshold_db') return 'loss threshold';
  return parameterName.replace(/_/g, ' ');
}

/**
 * Computes symmetric delta between centre and edge step.
 */
export function getSensitivityDelta(sensitivity: SensitivityData): number {
  if (!sensitivity.steps || sensitivity.steps.length === 0 || !sensitivity.steps[0]) return 0;
  return Math.abs(sensitivity.centre - sensitivity.steps[0].value);
}

/**
 * Formats one-line summary string for headline sensitivity.
 * e.g. "Result range: 30.85 to 44.01 km² when water threshold varies by ±2 dB"
 */
export function formatSensitivitySummary(sensitivity: SensitivityData): string {
  const delta = getSensitivityDelta(sensitivity);
  const deltaStr = delta % 1 === 0 ? delta.toFixed(0) : delta.toFixed(1);
  const paramLabel = getSensitivityParameterLabel(sensitivity.parameterName);
  return `Result range: ${sensitivity.minAreaKm2.toFixed(2)} to ${sensitivity.maxAreaKm2.toFixed(2)} km² when ${paramLabel} varies by ±${deltaStr} ${sensitivity.unit}`;
}

