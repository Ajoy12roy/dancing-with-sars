import type { AccessibilityEvent } from '@/context';
import type { SensitivityData } from '@/lib/sensitivity';
import { getSensitivityClass } from '@/lib/sensitivity';

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
  // Strip file paths (C:\..., /home/...) and stack traces (at ...)
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
