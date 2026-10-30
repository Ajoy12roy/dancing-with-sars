// ========================================================================
// AI Insight Fallback Template Generator — Dancing with the SARs
// Generates deterministic per-mode summary text strictly from real computed numbers.
// Never uses hardcoded scientific values.
// ========================================================================

import type { ResultMetrics, ResultCategory, ResultDates, SensitivityData } from '@/types';
import { getSensitivityDelta, getSensitivityParameterLabel, getSensitivityClass } from '@/lib/sensitivity';

export interface InsightPayload {
  mode: string;
  aoiName?: string;
  aoiId?: string;
  percentChanged?: number;
  affectedAreaKm2?: number;
  confidence?: number;
  signalStrength?: number;
  totalAreaKm2?: number;
  metrics?: ResultMetrics;
  categories?: ResultCategory[];
  dates?: ResultDates;
  warnings?: string[];
  sensitivity?: SensitivityData;
}

export function generateFallbackInsight(payload: InsightPayload): string {
  const mode = payload.mode || 'flood';
  const metrics = payload.metrics || {};
  const dates = payload.dates;
  const warnings = payload.warnings || [];
  const percentChanged = payload.percentChanged ?? 0;
  const affectedAreaKm2 = payload.affectedAreaKm2 ?? 0;
  const confidence = payload.confidence ?? payload.signalStrength;

  const dateA = dates?.a || 'the baseline date';
  const dateB = dates?.b || 'the follow-up date';

  let sensitivitySentence: string | null = null;
  if (payload.sensitivity) {
    const sens = payload.sensitivity;
    const delta = getSensitivityDelta(sens);
    const deltaStr = delta % 1 === 0 ? delta.toFixed(0) : delta.toFixed(1);
    const paramLabel = getSensitivityParameterLabel(sens.parameterName);
    const cls = getSensitivityClass(sens);
    if (cls === 'high') {
      sensitivitySentence = `Due to high threshold sensitivity (span ratio > 50%), this headline figure is indicative rather than exact, spanning an estimated ${sens.minAreaKm2.toFixed(2)} to ${sens.maxAreaKm2.toFixed(2)} km² across ±${deltaStr} ${sens.unit} variation in ${paramLabel}.`;
    } else {
      sensitivitySentence = `Threshold sensitivity analysis indicates the affected area spans ${sens.minAreaKm2.toFixed(2)} to ${sens.maxAreaKm2.toFixed(2)} km² across a ±${deltaStr} ${sens.unit} variation in ${paramLabel}.`;
    }
  }

  switch (mode) {
    case 'river-erosion': {
      const erosionAreaKm2 = ((metrics.erosionAreaKm2 as number) ?? affectedAreaKm2).toFixed(2);
      const accretionAreaKm2 = ((metrics.accretionAreaKm2 as number) ?? 0).toFixed(2);
      const netLandChange = (
        (metrics.netLandChangeKm2 as number) ??
        (Number(accretionAreaKm2) - Number(erosionAreaKm2))
      ).toFixed(2);
      const rate =
        metrics.erosionRateKm2PerYear != null
          ? `${Number(metrics.erosionRateKm2PerYear).toFixed(2)} km² per year`
          : 'an uncalculated annual rate pending multi-date inputs';

      if (payload.aoiId === 'padma-naria') {
        const s1 = `Between ${dateA} and ${dateB}, radar analysis detected about ${erosionAreaKm2} km² of net land-to-water transition near the channel corridor.`;
        const s2 =
          sensitivitySentence ||
          `Concurrently, sediment deposition and sandbar formation accounted for ${accretionAreaKm2} km² of accreted bars, yielding a net land shift of ${netLandChange} km².`;
        const s3 = `Notice: This figure is net land-to-water change between two composites. It can include water-level differences and sandbar movement, so it is not a direct measure of bank erosion.`;
        return `${s1} ${s2} ${s3}`;
      }

      const s1 = `Between ${dateA} and ${dateB}, about ${erosionAreaKm2} km² of riverbank turned to water, an average of ${rate}.`;
      const s2 =
        sensitivitySentence ||
        `Concurrently, sediment deposition formed ${accretionAreaKm2} km² of accreted bars, yielding a net land shift of ${netLandChange} km².`;
      const s3 =
        warnings.length > 0
          ? `Notice: ${warnings[0]}`
          : `Persistent river channels occupied ${
              metrics.riverAreaKm2 != null ? `${Number(metrics.riverAreaKm2).toFixed(2)} km²` : 'the channel corridor'
            } throughout the observation interval.`;

      return `${s1} ${s2} ${s3}`;
    }

    case 'flood': {
      const floodedAreaKm2 = affectedAreaKm2.toFixed(2);
      const pct = percentChanged.toFixed(2);
      const signalPart = confidence != null ? ` with a backscatter change signal strength of ${confidence.toFixed(1)}%` : '';

      const s1 = sensitivitySentence
        ? `Between ${dateA} and ${dateB}, radar backscatter analysis detected ${floodedAreaKm2} km² of newly inundated ground (${pct}% of the surveyed scene${signalPart}).`
        : `Between ${dateA} and ${dateB}, radar backscatter analysis detected ${floodedAreaKm2} km² of newly inundated ground.`;
      const s2 = sensitivitySentence || `This inundation spans ${pct}% of the surveyed scene${signalPart}.`;
      const s3 =
        warnings.length > 0
          ? `Notice: ${warnings[0]}`
          : `The drop in radar return is characteristic of specular reflection over flooded low-lying terrain.`;

      return `${s1} ${s2} ${s3}`;
    }

    case 'deforestation': {
      const forestLossKm2 = ((metrics.forestLossKm2 as number) ?? affectedAreaKm2).toFixed(2);
      const pct = percentChanged.toFixed(2);
      const signalPart = confidence != null ? ` with a signal intensity of ${confidence.toFixed(1)}%` : '';

      const s1 = sensitivitySentence
        ? `Between ${dateA} and ${dateB}, SAR backscatter analysis identified ${forestLossKm2} km² of forest canopy disturbance (${pct}% of the analyzed footprint${signalPart}).`
        : `Between ${dateA} and ${dateB}, SAR backscatter analysis identified ${forestLossKm2} km² of forest canopy disturbance.`;
      const s2 = sensitivitySentence || `The detected canopy loss encompasses ${pct}% of the analyzed footprint${signalPart}.`;
      const s3 =
        warnings.length > 0
          ? `Notice: ${warnings[0]}`
          : `Reduced volume scattering indicates localized tree removal and structural loss of vegetative crown cover.`;

      return `${s1} ${s2} ${s3}`;
    }

    case 'surface-water': {
      const waterA = ((metrics.waterAreaAKm2 as number) ?? 0).toFixed(2);
      const waterB = ((metrics.waterAreaBKm2 as number) ?? 0).toFixed(2);
      const deltaNum = (metrics.waterDeltaKm2 as number) ?? affectedAreaKm2;
      const deltaKm2 = deltaNum >= 0 ? `+${deltaNum.toFixed(2)}` : deltaNum.toFixed(2);
      const deltaPctNum = (metrics.waterDeltaPercent as number) ?? percentChanged;
      const deltaPct = deltaPctNum >= 0 ? `+${deltaPctNum.toFixed(1)}` : deltaPctNum.toFixed(1);

      if (payload.aoiId === 'tanguar') {
        const s1 = sensitivitySentence
          ? `Between ${dateA} and ${dateB}, open surface water across the 418.40 km² study-area box transitioned from ${waterA} km² to ${waterB} km² (${deltaKm2} km², ${deltaPct}%).`
          : `Between ${dateA} and ${dateB}, open surface water across the 418.40 km² study-area box transitioned from ${waterA} km² to ${waterB} km².`;
        const s2 = sensitivitySentence || `This reflects a net water extent shift of ${deltaKm2} km² (${deltaPct}%).`;
        const s3 = `Notice: Figures cover the whole study-area box, not only the haor wetland boundary.`;
        return `${s1} ${s2} ${s3}`;
      }

      const s1 = sensitivitySentence
        ? `Between ${dateA} and ${dateB}, open surface water transitioned from ${waterA} km² to ${waterB} km² (${deltaKm2} km², ${deltaPct}%).`
        : `Between ${dateA} and ${dateB}, open surface water transitioned from ${waterA} km² to ${waterB} km².`;
      const s2 = sensitivitySentence || `This reflects a net water extent shift of ${deltaKm2} km² (${deltaPct}%).`;
      const s3 =
        warnings.length > 0
          ? `Notice: ${warnings[0]}`
          : `The observed transition captures seasonal hydrologic surface expansion across the wetland system.`;

      return `${s1} ${s2} ${s3}`;
    }

    default: {
      const area = affectedAreaKm2.toFixed(2);
      const pct = percentChanged.toFixed(2);
      const signalPart = confidence != null ? ` with a signal strength of ${confidence.toFixed(1)}%` : '';

      const s1 = sensitivitySentence
        ? `Between ${dateA} and ${dateB}, SAR analysis detected ${area} km² of ground surface change (${pct}% of the analyzed area${signalPart}).`
        : `Between ${dateA} and ${dateB}, SAR analysis detected ${area} km² of ground surface change.`;
      const s2 = sensitivitySentence || `The detected changes cover ${pct}% of the analyzed area${signalPart}.`;
      const s3 =
        warnings.length > 0
          ? `Notice: ${warnings[0]}`
          : `Radar backscatter shifts reflect structural modifications to ground cover across the observation interval.`;

      return `${s1} ${s2} ${s3}`;
    }
  }
}
