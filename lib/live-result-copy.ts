/**
 * lib/live-result-copy.ts
 *
 * User-facing copy strings and deterministic text generator for the
 * Live Analysis Result Header and "What changed in this area" summary card.
 *
 * All user-facing strings are stored as key -> English string pairs
 * to allow future localization (e.g. Bangla/English switch).
 */

import type { ChangeData } from '@/hooks/useChangeData';

export const LIVE_RESULT_COPY = {
  // Header labels
  backToMap: 'Back to map / new analysis',
  analysisModePrefix: 'Mode:',
  areaFootprintPrefix: 'Area:',
  beforeWindowPrefix: 'Before window:',
  afterWindowPrefix: 'After window:',

  // Mode titles
  modeFlood: 'Flood Inundation',
  modeRiverErosion: 'River Bank Erosion',
  modeDeforestation: 'Forest Canopy Loss',
  modeSurfaceWater: 'Surface Water Dynamics',
  modeDefault: 'SAR Change Detection',

  // Summary Card
  cardTitle: 'What changed in this area',
  howToReadTitle: 'How to read this',
  howToReadText:
    'Darker radar returns generally indicate smooth surfaces such as open water that reflect radar pulses away from the satellite, whereas brighter returns indicate rough ground or vegetation that scatters energy back. Surface change results depend on the chosen observation windows, environmental conditions, and single-orbit radar imaging geometry.',

  // Mode explanations
  floodDescription: 'newly water-covered ground',
  riverErosionDescription: 'riverbank land lost to water',
  riverAccretionAddition: 'sediment and sandbars gained',
  deforestationDescription: 'vegetation and forest canopy loss',
  surfaceWaterDescription: 'net surface water extent change',
  defaultDescription: 'surface change',

  // Metrics and breakdown labels
  surveyedFootprint: 'surveyed area',
  confidenceLabel: 'Detection confidence:',
  categoryComparisonTitle: 'Before vs after category extent',
  initialWaterLabel: 'Initial water extent:',
  finalWaterLabel: 'Final water extent:',
  netWaterChangeLabel: 'Net water extent change:',
  bankErosionLabel: 'Bank erosion (land to water):',
  bankAccretionLabel: 'Sediment accretion (water to land):',
  noticePrefix: 'Notice:',
  uploadBelowHint: 'Prefer your own files? Upload GeoTIFFs below.',
} as const;

export type LiveResultCopyKey = keyof typeof LIVE_RESULT_COPY;

export interface CategoryComparisonItem {
  label: string;
  value: string;
}

export interface LiveResultSummaryContent {
  headlineSentence: string;
  secondarySentence?: string;
  categoryComparison?: CategoryComparisonItem[];
  confidenceText?: string;
  warnings: string[];
  howToReadTitle: string;
  howToReadText: string;
}

/**
 * Returns a human-friendly mode label from LIVE_RESULT_COPY.
 */
export function getLiveModeLabel(mode?: string): string {
  switch (mode) {
    case 'flood':
      return LIVE_RESULT_COPY.modeFlood;
    case 'river-erosion':
    case 'erosion':
      return LIVE_RESULT_COPY.modeRiverErosion;
    case 'deforestation':
      return LIVE_RESULT_COPY.modeDeforestation;
    case 'surface-water':
    case 'water':
      return LIVE_RESULT_COPY.modeSurfaceWater;
    default:
      return mode || LIVE_RESULT_COPY.modeDefault;
  }
}

/**
 * Generates deterministic summary content from a ChangeData object.
 * Strictly uses only provided numbers; never invents values or makes causal claims.
 */
export function generateLiveResultSummary(data: Partial<ChangeData>): LiveResultSummaryContent {
  const mode = data.mode || 'flood';
  const affected = typeof data.affectedAreaKm2 === 'number' ? `${data.affectedAreaKm2.toFixed(2)} km²` : '0.00 km²';
  const pct = typeof data.percentChanged === 'number' ? `${data.percentChanged.toFixed(2)}%` : '0.00%';

  const dateA = data.dateBefore || data.dates?.a;
  const dateB = data.dateAfter || data.dates?.b;
  const datePrefix = dateA && dateB ? `Between ${dateA} and ${dateB}, ` : '';

  const totalStr =
    typeof data.totalAreaKm2 === 'number'
      ? ` of the ${data.totalAreaKm2.toFixed(2)} km² ${LIVE_RESULT_COPY.surveyedFootprint}`
      : ` of the ${LIVE_RESULT_COPY.surveyedFootprint}`;

  let headlineSentence = '';
  let secondarySentence: string | undefined = undefined;

  switch (mode) {
    case 'flood':
      headlineSentence = `${datePrefix}radar analysis identified ${affected} of ${LIVE_RESULT_COPY.floodDescription} (${pct}${totalStr}).`;
      break;

    case 'river-erosion':
    case 'erosion':
      headlineSentence = `${datePrefix}radar analysis identified ${affected} of ${LIVE_RESULT_COPY.riverErosionDescription} (${pct}${totalStr}).`;
      if (typeof data.metrics?.accretionAreaKm2 === 'number') {
        secondarySentence = `Concurrently, ${Number(data.metrics.accretionAreaKm2).toFixed(2)} km² of ${LIVE_RESULT_COPY.riverAccretionAddition}.`;
      }
      break;

    case 'deforestation':
      headlineSentence = `${datePrefix}radar analysis identified ${affected} of ${LIVE_RESULT_COPY.deforestationDescription} (${pct}${totalStr}).`;
      break;

    case 'surface-water':
    case 'water':
      headlineSentence = `${datePrefix}radar analysis identified a ${LIVE_RESULT_COPY.surfaceWaterDescription} of ${affected} (${pct} relative change).`;
      break;

    default:
      headlineSentence = `${datePrefix}radar analysis identified ${affected} of ${LIVE_RESULT_COPY.defaultDescription} (${pct}${totalStr}).`;
      break;
  }

  // Tiny before-vs-after comparison ONLY if both values truly exist in data
  let categoryComparison: CategoryComparisonItem[] | undefined = undefined;

  if (mode === 'surface-water' || mode === 'water') {
    if (typeof data.metrics?.waterAreaAKm2 === 'number' && typeof data.metrics?.waterAreaBKm2 === 'number') {
      const items: CategoryComparisonItem[] = [
        { label: LIVE_RESULT_COPY.initialWaterLabel, value: `${data.metrics.waterAreaAKm2.toFixed(2)} km²` },
        { label: LIVE_RESULT_COPY.finalWaterLabel, value: `${data.metrics.waterAreaBKm2.toFixed(2)} km²` },
      ];
      if (typeof data.metrics.waterDeltaKm2 === 'number') {
        const sign = data.metrics.waterDeltaKm2 >= 0 ? '+' : '';
        items.push({
          label: LIVE_RESULT_COPY.netWaterChangeLabel,
          value: `${sign}${data.metrics.waterDeltaKm2.toFixed(2)} km²`,
        });
      }
      categoryComparison = items;
    }
  } else if (mode === 'river-erosion' || mode === 'erosion') {
    if (typeof data.metrics?.erosionAreaKm2 === 'number' && typeof data.metrics?.accretionAreaKm2 === 'number') {
      categoryComparison = [
        { label: LIVE_RESULT_COPY.bankErosionLabel, value: `${data.metrics.erosionAreaKm2.toFixed(2)} km²` },
        { label: LIVE_RESULT_COPY.bankAccretionLabel, value: `${data.metrics.accretionAreaKm2.toFixed(2)} km²` },
      ];
    }
  }

  // Confidence / Signal Strength
  const rawConfidence = data.confidence ?? data.signalStrength;
  const confidenceText =
    typeof rawConfidence === 'number' && !isNaN(rawConfidence)
      ? `${LIVE_RESULT_COPY.confidenceLabel} ${rawConfidence.toFixed(1)}%`
      : undefined;

  const warnings = Array.isArray(data.warnings) ? data.warnings : [];

  return {
    headlineSentence,
    secondarySentence,
    categoryComparison,
    confidenceText,
    warnings,
    howToReadTitle: LIVE_RESULT_COPY.howToReadTitle,
    howToReadText: LIVE_RESULT_COPY.howToReadText,
  };
}
