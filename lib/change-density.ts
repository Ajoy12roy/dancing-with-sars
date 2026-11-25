/**
 * lib/change-density.ts
 *
 * Pure helper functions for bucketing SAR change-map pixels into horizontal
 * columns, computing cumulative sums, and evaluating near-line / left-of-line
 * detection percentages in O(1) time without re-scanning pixel buffers.
 */

export const CHANGE_DENSITY_BUCKETS = 100;

export type ChangeConcentration = 'left' | 'middle' | 'right';

export interface ChangeDensityData {
  numBuckets: number;
  bucketsChanged: number[];
  bucketsTotal: number[];
  prefixChanged: number[];
  prefixTotal: number[];
  totalChangedPixels: number;
  totalPixels: number;
  maxBucketDensity: number;
  concentration: ChangeConcentration | null;
}

export interface LineChangeMetrics {
  nearLinePercent: number;
  leftOfLinePercent: number;
}

/**
 * Classifies a pixel from the python-service change map (#A8462E reddish hazard hue)
 * as changed or unchanged.
 */
export function isChangedPixel(r: number, g: number, b: number, a: number): boolean {
  if (a === 0) return false;
  return r > 130 && r > g * 1.3 && r > b * 1.3;
}

/**
 * Builds cumulative sum arrays and summary metadata from per-column bucket counts.
 */
export function buildChangeDensityFromBuckets(
  bucketsChanged: number[],
  bucketsTotal: number[]
): ChangeDensityData {
  const numBuckets = bucketsTotal.length;
  const prefixChanged = new Array<number>(numBuckets + 1).fill(0);
  const prefixTotal = new Array<number>(numBuckets + 1).fill(0);

  let maxBucketDensity = 0;
  for (let i = 0; i < numBuckets; i++) {
    const c = bucketsChanged[i] ?? 0;
    const t = bucketsTotal[i] ?? 0;
    prefixChanged[i + 1] = (prefixChanged[i] ?? 0) + c;
    prefixTotal[i + 1] = (prefixTotal[i] ?? 0) + t;
    if (t > 0) {
      const density = c / t;
      if (density > maxBucketDensity) {
        maxBucketDensity = density;
      }
    }
  }

  const totalChangedPixels = prefixChanged[numBuckets] ?? 0;
  const totalPixels = prefixTotal[numBuckets] ?? 0;

  let concentration: ChangeConcentration | null = null;
  if (totalChangedPixels > 0 && numBuckets > 0) {
    const third1 = Math.floor(numBuckets / 3);
    const third2 = Math.floor((2 * numBuckets) / 3);
    const leftSum = prefixChanged[third1] ?? 0;
    const middleSum = (prefixChanged[third2] ?? 0) - leftSum;
    const rightSum = totalChangedPixels - (prefixChanged[third2] ?? 0);

    if (leftSum >= middleSum && leftSum >= rightSum) {
      concentration = 'left';
    } else if (middleSum >= leftSum && middleSum >= rightSum) {
      concentration = 'middle';
    } else {
      concentration = 'right';
    }
  }

  return {
    numBuckets,
    bucketsChanged,
    bucketsTotal,
    prefixChanged,
    prefixTotal,
    totalChangedPixels,
    totalPixels,
    maxBucketDensity,
    concentration,
  };
}

/**
 * Computes ChangeDensityData directly from an RGBA pixel buffer (e.g., canvas ImageData.data).
 */
export function computeChangeDensityFromRgba(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  numBuckets = CHANGE_DENSITY_BUCKETS
): ChangeDensityData {
  const bucketsChanged = new Array<number>(numBuckets).fill(0);
  const bucketsTotal = new Array<number>(numBuckets).fill(0);

  if (width <= 0 || height <= 0 || data.length === 0) {
    return buildChangeDensityFromBuckets(bucketsChanged, bucketsTotal);
  }

  const totalPx = Math.min(width * height, Math.floor(data.length / 4));
  for (let idx = 0; idx < totalPx; idx++) {
    const x = idx % width;
    const bucket = Math.min(numBuckets - 1, Math.floor((x / width) * numBuckets));
    bucketsTotal[bucket] = (bucketsTotal[bucket] ?? 0) + 1;

    const offset = idx * 4;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const a = data[offset + 3] ?? 0;
    if (isChangedPixel(r, g, b, a)) {
      bucketsChanged[bucket] = (bucketsChanged[bucket] ?? 0) + 1;
    }
  }

  return buildChangeDensityFromBuckets(bucketsChanged, bucketsTotal);
}

/**
 * Computes "Near line" (inside a ~5% vertical strip centered at positionPercent)
 * and "Left of line" (all columns left of positionPercent) changed pixel percentages,
 * rounded to 1 decimal place.
 */
export function computeLineMetrics(
  density: ChangeDensityData,
  positionPercent: number,
  stripHalfWidthPercent = 2.5
): LineChangeMetrics {
  const n = density.numBuckets;
  if (n <= 0 || density.totalPixels <= 0) {
    return { nearLinePercent: 0, leftOfLinePercent: 0 };
  }

  const pos = Math.max(0, Math.min(100, positionPercent));

  // Left of line: columns [0, leftEnd)
  const leftEnd = Math.round((pos / 100) * n);
  const leftChanged = density.prefixChanged[leftEnd] ?? 0;
  const leftTotal = density.prefixTotal[leftEnd] ?? 0;
  const leftRaw = leftTotal > 0 ? (leftChanged / leftTotal) * 100 : 0;

  // Near line: vertical strip [pos - stripHalfWidthPercent, pos + stripHalfWidthPercent]
  const startCol = Math.max(0, Math.floor(((pos - stripHalfWidthPercent) / 100) * n));
  const endCol = Math.min(n, Math.ceil(((pos + stripHalfWidthPercent) / 100) * n));
  const nearChanged = (density.prefixChanged[endCol] ?? 0) - (density.prefixChanged[startCol] ?? 0);
  const nearTotal = (density.prefixTotal[endCol] ?? 0) - (density.prefixTotal[startCol] ?? 0);
  const nearRaw = nearTotal > 0 ? (nearChanged / nearTotal) * 100 : 0;

  return {
    nearLinePercent: Number(nearRaw.toFixed(1)),
    leftOfLinePercent: Number(leftRaw.toFixed(1)),
  };
}
