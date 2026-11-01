import type { AccessibilityEvent } from '@/context';
import type { SensitivityData } from '@/lib/sensitivity';
import { getSensitivityClass, getSensitivityParameterLabel } from '@/lib/sensitivity';
import { getRadarMethodExplanation } from '@/lib/radar-method';

export interface DateRangeLike {
  start?: string;
  end?: string;
}

export interface ChikuContextData {
  caseTitle?: string;
  caseId?: string;
  mode?: string;
  affectedAreaKm2?: number;
  percentChanged?: number;
  sensitivity?: SensitivityData;
  hasValidation?: boolean;
  honestyNote?: string;
  beforeRange?: DateRangeLike | string;
  afterRange?: DateRangeLike | string;
  narrationDetail?: 'full' | 'short';
}

export const MODE_LABELS: Record<string, string> = {
  flood: 'Flood',
  'river-erosion': 'River erosion',
  deforestation: 'Deforestation',
  'surface-water': 'Surface water',
};

export const PAGE_INTROS: Record<string, string> = {
  '/': "This is Terra Pulse. It compares radar images from two dates to show where Earth's surface has changed.",
  '/explore': 'Pick a case study, or upload your own pair of radar images.',
  '/how-it-works': 'Here is how the method works, from the radar image to the changed area.',
  '/data-sources': "Our demo cases use Sentinel-1 radar through Google Earth Engine. NASA's ASF archive also distributes the same data.",
};

export const INTERACTION_HINTS: Record<string, string> = {
  slider: 'Drag the slider to compare the two dates.',
  sensitivity: 'This table shows how the result changes if the threshold moves. A wide range means less certainty.',
  'text-summary': 'This is a text description of the map.',
};

export function formatRangeString(range: DateRangeLike | string | undefined | null): string | null {
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

function cleanUploadError(errorText?: string): string {
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

/**
 * Formats a number into clean speech wording.
 * Replaces leading negative sign with "minus ".
 * Omits trailing .0 for whole numbers, keeps 1 decimal for fractions.
 */
export function formatNumberInWords(val: number): string {
  if (val === 0) return '0';
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const formattedAbs = absVal % 1 === 0 ? absVal.toFixed(0) : absVal.toFixed(1);
  return isNegative ? `minus ${formattedAbs}` : formattedAbs;
}

/**
 * Splits text into speech-friendly segments each guaranteed to be <= maxLen characters (default 190).
 * Never breaks across numbers or decimals (e.g. "30.9", "-16.0", "1,000", "2022-06-20").
 * Handles empty strings, single sentences, long paragraphs, and lists.
 */
export function splitForSpeech(text: string, maxLen = 190): string[] {
  if (!text) return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLen) return [trimmed];

  const rawSentences: string[] = [];
  let startIdx = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '.' || ch === '!' || ch === '?') {
      if (ch === '.') {
        const prev = i > 0 ? (trimmed[i - 1] ?? '') : '';
        const next = i + 1 < trimmed.length ? (trimmed[i + 1] ?? '') : '';
        if (/\d/.test(prev) && /\d/.test(next)) {
          continue; // decimal point inside number
        }
      }
      if (i + 1 === trimmed.length || /\s/.test(trimmed[i + 1] ?? '')) {
        const sentence = trimmed.slice(startIdx, i + 1).trim();
        if (sentence) rawSentences.push(sentence);
        startIdx = i + 1;
      }
    }
  }
  const leftover = trimmed.slice(startIdx).trim();
  if (leftover) rawSentences.push(leftover);

  const parts: string[] = [];
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

/**
 * Builds the honest threshold disclosure sentence.
 * Strictly includes "not a value proven to be the best".
 * Guaranteed to stay <= 190 characters.
 */
export function buildThresholdLine(mode: string, sensitivity: SensitivityData): string {
  const paramLabel = getSensitivityParameterLabel(sensitivity.parameterName);
  const centreSpoken = `${formatNumberInWords(sensitivity.centre)} decibels`;

  let meaning = 'values beyond this trigger the change detection';
  if (sensitivity.parameterName === 'water_threshold') {
    meaning = mode === 'flood' ? 'values below this are detected as flooded' : 'values below this are detected as open water';
  } else if (sensitivity.parameterName === 'loss_threshold_db') {
    meaning = 'drops greater than this indicate canopy loss';
  }

  return `The headline result uses a ${paramLabel} of ${centreSpoken}: ${meaning}. This is a fixed default setting, not a value proven to be the best.`;
}

/**
 * Builds the tested range disclosure sentence with clean spoken numbers.
 * Guaranteed to stay <= 190 characters.
 */
export function buildTestedRangeLine(sensitivity: SensitivityData): string {
  const steps = sensitivity.steps || [];
  const minStep = steps.length > 0 ? (steps[0]?.value ?? sensitivity.centre) : sensitivity.centre;
  const maxStep = steps.length > 0 ? (steps[steps.length - 1]?.value ?? sensitivity.centre) : sensitivity.centre;
  const minArea = sensitivity.minAreaKm2.toFixed(1);
  const maxArea = sensitivity.maxAreaKm2.toFixed(1);

  return `We also tested ${formatNumberInWords(minStep)} to ${formatNumberInWords(maxStep)} decibels. The area ranged from ${minArea} to ${maxArea} square kilometres.`;
}

/**
 * Returns the sensitivity classification sentence based on mathematical threshold span.
 */
export function buildSensitivityClassSentence(sensitivity: SensitivityData): string {
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

/**
 * Returns mode-specific radar methodology sentence referencing process_change.py.
 */
export function buildRadarMethodLine(mode: string): string {
  return getRadarMethodExplanation(mode);
}

/**
 * Builds reliability notes speech lines (intro + up to 3 notes, split under 190 chars).
 */
export function buildReliabilityNotesLines(notes?: string[]): string[] {
  if (!notes || notes.length === 0) return [];
  const validNotes = notes.slice(0, 3);
  const intro = 'Reliability notes, computed from data, not written by AI.';
  const noteLines: string[] = [];

  for (const note of validNotes) {
    const split = splitForSpeech(note, 190);
    noteLines.push(...split);
  }

  return [intro, ...noteLines];
}

/**
 * Builds the multi-part narration sequence for analysis results.
 * Supports Short mode (headline + sensitivity sentence) and Full mode (extended breakdown).
 * Every individual element is <= 190 characters.
 */
export function buildAnalysisNarrationParts(params: {
  mode?: string;
  affectedAreaKm2?: number;
  percentChanged?: number;
  sensitivity?: SensitivityData | null;
  detail?: 'full' | 'short';
  honestyNote?: string;
}): string[] {
  const { mode = 'flood', affectedAreaKm2, percentChanged, sensitivity, detail = 'full' } = params;

  let headline = 'Analysis complete.';
  if (typeof affectedAreaKm2 === 'number' && typeof percentChanged === 'number') {
    headline = `Analysis complete. About ${affectedAreaKm2.toFixed(1)} square kilometres changed, ${percentChanged.toFixed(1)} percent of the area.`;
  } else if (typeof affectedAreaKm2 === 'number') {
    headline = `Analysis complete. About ${affectedAreaKm2.toFixed(1)} square kilometres changed across the area.`;
  }

  if (detail === 'short') {
    if (sensitivity) {
      return [headline, buildSensitivityClassSentence(sensitivity)];
    }
    return [headline];
  }

  const parts: string[] = [headline];

  if (sensitivity) {
    parts.push(buildThresholdLine(mode, sensitivity));
    parts.push(buildTestedRangeLine(sensitivity));
    parts.push(buildSensitivityClassSentence(sensitivity));
  }

  parts.push(buildRadarMethodLine(mode));

  return parts;
}

/**
 * Pure function sentence builder for Chiku Voice Guide.
 * Produces short (<200 character) natural explanations strictly from computed data.
 * Adheres to Chrome Web Speech length boundaries and WCAG accessibility standards.
 */
export function buildChikuScript(
  event: AccessibilityEvent,
  context?: ChikuContextData
): string {
  switch (event.type) {
    case 'mode-changed': {
      const modeKey = (event.data?.mode as string) || context?.mode || 'flood';
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
      const route = (event.data?.route as string) || '/';
      return PAGE_INTROS[route] || PAGE_INTROS['/'] || '';
    }

    case 'hint': {
      const hintId = (event.data?.hintId as string) || '';
      return INTERACTION_HINTS[hintId] || event.message || '';
    }

    case 'case-selected': {
      const title = context?.caseTitle || (event.data?.title as string) || 'Case study';
      const before = formatRangeString(context?.beforeRange || (event.data?.beforeRange as DateRangeLike | string));
      const after = formatRangeString(context?.afterRange || (event.data?.afterRange as DateRangeLike | string));

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
        (event.data?.error as string) ||
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
      const area = context?.affectedAreaKm2 ?? (event.data?.affectedAreaKm2 as number | undefined);
      const pct = context?.percentChanged ?? (event.data?.percentChanged as number | undefined);
      const sens = context?.sensitivity || (event.data?.sensitivity as SensitivityData | undefined);

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
