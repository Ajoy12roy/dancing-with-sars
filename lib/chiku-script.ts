import type { AccessibilityEvent } from '@/context';
import type { SensitivityData } from '@/lib/sensitivity';
import { getSensitivityClass } from '@/lib/sensitivity';

export interface ChikuContextData {
  caseTitle?: string;
  mode?: string;
  affectedAreaKm2?: number;
  percentChanged?: number;
  sensitivity?: SensitivityData;
  hasValidation?: boolean;
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
    case 'case-selected': {
      const title = context?.caseTitle || (event.data?.title as string) || 'Case study';
      const mode = context?.mode || (event.data?.mode as string) || 'flood';
      return `Loaded ${title} in ${mode} mode. Comparing before and after SAR radar scenes.`.slice(0, 195);
    }

    case 'mode-changed': {
      const mode = context?.mode || (event.data?.mode as string) || 'flood';
      return `Switched to ${mode} mode.`.slice(0, 195);
    }

    case 'analysis-loading': {
      return `Processing radar change detection on satellite imagery...`.slice(0, 195);
    }

    case 'analysis-ready': {
      const area = context?.affectedAreaKm2 ?? (event.data?.affectedAreaKm2 as number | undefined);
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

    case 'analysis-failed': {
      const err = (event.data?.error as string) || 'unknown error';
      return `Analysis could not be completed: ${err}.`.slice(0, 195);
    }

    case 'upload-accepted': {
      return `GeoTIFF files accepted and ready for SAR change analysis.`.slice(0, 195);
    }

    case 'upload-rejected': {
      return `File rejected: please upload valid GeoTIFF files under 60 megabytes.`.slice(0, 195);
    }

    case 'ai-insight-loaded': {
      return `AI scientific interpretation updated with backscatter notes.`.slice(0, 195);
    }

    default: {
      return event.message ? event.message.slice(0, 195) : 'TerraPulse SAR radar assistant ready.';
    }
  }
}
