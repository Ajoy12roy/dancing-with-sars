'use client';

import { useAnalysisMode } from '@/context';
import { MODE_METRICS_CONFIG, MetricConfig } from '@/constants';
import type { ChangeData } from '@/hooks/useChangeData';
import type { ResultMetrics, ResultCategory } from '@/types';

interface StatsPanelProps {
  data?: ChangeData;
  percentChanged?: number;
  affectedAreaKm2?: number;
  confidence?: number;
  totalAreaKm2?: number;
  metrics?: ResultMetrics;
  categories?: ResultCategory[];
  mode?: string;
}

interface DisplayedMetricCard {
  id: string;
  label: string;
  value: string;
  unit?: string;
  description?: string;
  isNullText?: boolean;
}

function getValueByKey(obj: Record<string, unknown> | undefined, key: string): unknown {
  if (!obj) return undefined;
  const parts = key.split('.');
  let curr: unknown = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined || typeof curr !== 'object') return undefined;
    curr = (curr as Record<string, unknown>)[part];
  }
  return curr;
}

export default function StatsPanel({
  data,
  percentChanged,
  affectedAreaKm2,
  confidence,
  totalAreaKm2,
  metrics,
  mode: propMode,
}: StatsPanelProps) {
  const { mode: contextMode } = useAnalysisMode();
  const activeMode = propMode || data?.mode || contextMode;

  // Consolidate data source from data object or fallback props
  const source: Record<string, unknown> = (data as unknown as Record<string, unknown>) || {
    percentChanged,
    affectedAreaKm2,
    confidence,
    signalStrength: confidence,
    totalAreaKm2,
    metrics,
  };

  const metricConfigs: MetricConfig[] =
    MODE_METRICS_CONFIG[activeMode] || MODE_METRICS_CONFIG['flood'] || [];

  const cards: DisplayedMetricCard[] = [];

  for (const cfg of metricConfigs) {
    let rawVal = getValueByKey(source, cfg.resultKey);
    if ((rawVal === undefined || rawVal === null) && cfg.fallbackKey) {
      rawVal = getValueByKey(source, cfg.fallbackKey);
    }

    if (rawVal === null || rawVal === undefined) {
      // If nullText is defined, show the note (e.g. "needs both dates" for erosion rate)
      if (cfg.nullText) {
        cards.push({
          id: cfg.id,
          label: cfg.label,
          value: cfg.nullText,
          unit: undefined,
          description: cfg.description,
          isNullText: true,
        });
      }
      // Otherwise, rule 6: "Do not show a metric whose value is null or missing"
      continue;
    }

    const num = Number(rawVal);
    if (!isNaN(num)) {
      cards.push({
        id: cfg.id,
        label: cfg.label,
        value: num.toFixed(cfg.decimals ?? 2),
        unit: cfg.unit,
        description: cfg.description,
        isNullText: false,
      });
    }
  }

  if (cards.length === 0) {
    return null;
  }

  // Determine desktop column count based on active visible cards
  const desktopColsClass =
    cards.length === 1
      ? 'lg:grid-cols-1'
      : cards.length === 2
      ? 'lg:grid-cols-2'
      : cards.length === 3
      ? 'lg:grid-cols-3'
      : cards.length === 5
      ? 'lg:grid-cols-5'
      : 'lg:grid-cols-4';

  return (
    <div className={`w-full grid gap-6 grid-cols-1 sm:grid-cols-2 ${desktopColsClass}`}>
      {cards.map((card) => (
        <div
          key={card.id}
          className="border border-hairline bg-surface p-4 rounded-[2px] flex flex-col justify-between h-full min-h-26"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-xs text-text-secondary font-medium">
              {card.label}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mt-2 whitespace-nowrap overflow-hidden">
            <span
              className={`font-data leading-none shrink-0 ${
                card.isNullText
                  ? 'text-sm lg:text-base text-text-secondary font-normal italic'
                  : 'text-2xl lg:text-3xl font-medium text-teal'
              }`}
            >
              {card.value}
            </span>
            {card.unit && !card.isNullText && (
              <span className="font-data text-xs lg:text-sm text-text-secondary font-normal leading-none shrink-0">
                {card.unit}
              </span>
            )}
          </div>

          {card.description && (
            <p className="font-sans text-[11px] text-text-secondary mt-2 leading-snug">
              {card.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
