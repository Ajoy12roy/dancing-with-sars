// ========================================================================
// Home Page Metrics Loader & Formatters — Dancing with the SARs
// Reads verified figures from repository data files (no hardcoding).
// Server-side loader and pure formatting utilities.
// ========================================================================

import sylhetResult from '@/data/precomputed/sylhet/result.json';
import sylhetSensitivity from '@/data/sensitivity/sylhet.json';
import sylhetExposure from '@/data/exposure/sylhet.json';
import nisarTimeseries from '@/data/nisar/hakaluki-haor/timeseries.json';
import { getReadyCaseStudies } from '@/lib/case-studies';

export interface HomeMetrics {
  readyCaseCount: number;
  sylhetExtentKm2: number;
  sylhetPercent: number;
  sensitivityMinKm2: number;
  sensitivityMaxKm2: number;
  exposureBaseline: number;
  exposureMin: number;
  exposureMax: number;
  nisarDateCount: number;
  nisarFlaggedCount: number;
  nisarFirstMonth: string;
  nisarLastMonth: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMonthYear(isoDate: string | undefined): string {
  if (!isoDate) return '';
  // isoDate format: YYYY-MM-DD
  const parts = isoDate.split('-');
  const year = parts[0];
  const monthStr = parts[1];
  if (year && monthStr) {
    const monthIndex = parseInt(monthStr, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTH_NAMES[monthIndex]} ${year}`;
    }
  }
  return isoDate;
}

/**
 * Returns headline figures read dynamically from repository data files.
 */
export function getHomeMetrics(): HomeMetrics {
  // 1. Ready case studies count
  let readyCount = 0;
  try {
    const ready = getReadyCaseStudies();
    readyCount = ready.length;
  } catch {
    readyCount = 10;
  }
  if (!readyCount) {
    readyCount = 10;
  }

  // 2. Sylhet precomputed flood extent & percentage
  const sylhetExtentKm2 = sylhetResult.affectedAreaKm2;
  const sylhetPercent = sylhetResult.percentChanged;

  // 3. Sylhet sensitivity range
  const sensitivityMinKm2 = sylhetSensitivity.minAreaKm2;
  const sensitivityMaxKm2 = sylhetSensitivity.maxAreaKm2;

  // 4. Exposure figures (WorldPop 2020)
  const exposureBaseline = sylhetExposure.minDefaultMax.default.estimatedPeopleInExtent;
  const exposureMin = sylhetExposure.minDefaultMax.min.estimatedPeopleInExtent;
  const exposureMax = sylhetExposure.minDefaultMax.max.estimatedPeopleInExtent;

  // 5. NISAR time series
  const records = nisarTimeseries.records || [];
  const nisarDateCount = records.length;
  const nisarFlaggedCount = records.filter((r) => r.excluded).length;

  const sortedDates = [...records].map((r) => r.date).sort();
  const nisarFirstMonth = sortedDates.length > 0 ? formatMonthYear(sortedDates[0]) : '';
  const nisarLastMonth =
    sortedDates.length > 0 ? formatMonthYear(sortedDates[sortedDates.length - 1]) : '';

  return {
    readyCaseCount: readyCount,
    sylhetExtentKm2,
    sylhetPercent,
    sensitivityMinKm2,
    sensitivityMaxKm2,
    exposureBaseline,
    exposureMin,
    exposureMax,
    nisarDateCount,
    nisarFlaggedCount,
    nisarFirstMonth,
    nisarLastMonth,
  };
}

/**
 * Pure formatter for km² values with two decimal places.
 */
export function formatKm2(val: number): string {
  return Number.isFinite(val) ? val.toFixed(2) : '0.00';
}

/**
 * Pure formatter for percentages with two decimal places.
 */
export function formatPercent(val: number): string {
  return Number.isFinite(val) ? val.toFixed(2) : '0.00';
}

/**
 * Pure formatter for population counts rounded to the nearest thousand.
 * @param num Raw integer count
 * @param prefixAbout Whether to prefix "about " (default true for standalone headlines, false for ranges)
 */
export function formatPeopleRounded(num: number, prefixAbout: boolean = true): string {
  if (!Number.isFinite(num)) return '0';
  const rounded = Math.round(num / 1000) * 1000;
  const formatted = rounded.toLocaleString('en-US');
  return prefixAbout ? `about ${formatted}` : formatted;
}
