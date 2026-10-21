import { useState, useEffect } from 'react';
import { useAnalysisMode } from '@/context';
import { generateFallbackInsight } from '@/lib/ai-insight-fallback';
import type { ChangeData } from '@/hooks/useChangeData';
import type { ResultMetrics, ResultCategory, ResultDates } from '@/types';

interface AIInsightPanelProps {
  percentChanged: number;
  affectedAreaKm2: number;
  confidence: number;
  aoiName: string;
  aoiId: string;
  mode?: string;
  data?: ChangeData;
  metrics?: ResultMetrics;
  categories?: ResultCategory[];
  dates?: ResultDates;
  warnings?: string[];
  totalAreaKm2?: number;
}

export function AIInsightPanel({
  percentChanged,
  affectedAreaKm2,
  confidence,
  aoiName,
  aoiId,
  mode: propMode,
  data,
  metrics: propMetrics,
  categories: propCategories,
  dates: propDates,
  warnings: propWarnings,
  totalAreaKm2: propTotalArea,
}: AIInsightPanelProps) {
  const { mode: contextMode } = useAnalysisMode();
  const activeMode = propMode || data?.mode || contextMode;

  const activeMetrics = data?.metrics || propMetrics;
  const activeCategories = data?.categories || propCategories;
  const activeDates = data?.dates || propDates;
  const activeWarnings = data?.warnings || propWarnings;
  const activeTotalArea = data?.totalAreaKm2 || propTotalArea;

  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [usedFallback, setUsedFallback] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const payload = {
      mode: activeMode,
      aoiName,
      aoiId,
      percentChanged,
      affectedAreaKm2,
      confidence,
      totalAreaKm2: activeTotalArea,
      metrics: activeMetrics,
      categories: activeCategories,
      dates: activeDates,
      warnings: activeWarnings,
    };

    const fetchInsight = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/ai-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (isMounted) {
          setExplanation(result.explanation);
          setUsedFallback(Boolean(result.usedFallback));
          setLoading(false);
        }
      } catch (err) {
        console.warn('AI insight fetch failed; generating deterministic offline summary:', err);
        if (isMounted) {
          const fallbackText = generateFallbackInsight(payload);
          setExplanation(fallbackText);
          setUsedFallback(true);
          setLoading(false);
        }
      }
    };

    fetchInsight();

    return () => {
      isMounted = false;
    };
  }, [
    activeMode,
    aoiName,
    aoiId,
    percentChanged,
    affectedAreaKm2,
    confidence,
    activeTotalArea,
    activeMetrics,
    activeCategories,
    activeDates,
    activeWarnings,
  ]);

  return (
    <div className="border border-(--color-hairline) bg-(--color-paper) rounded-[2px] flex flex-col h-full min-h-80 w-full">
      {/* Header bar (h-12) */}
      <div className="h-12 px-4 border-b border-(--color-hairline) flex items-center justify-between bg-(--color-paper) shrink-0 gap-3">
        <h3 className="font-bold font-headline text-base text-(--color-ink) shrink-0">
          Radar Interpretation
        </h3>
        <span className="font-sans text-xs text-(--color-text-secondary) truncate text-right">
          {usedFallback
            ? 'Offline summary generated from the computed numbers'
            : 'AI-generated explanation of computed results'}
        </span>
      </div>

      {/* Body (flex-1) */}
      <div className="flex-1 p-5 flex flex-col justify-center">
        {loading ? (
          <div className="space-y-3">
            <div className="h-3.5 bg-(--color-hairline) rounded-sm w-full animate-pulse"></div>
            <div className="h-3.5 bg-(--color-hairline) rounded-sm w-5/6 animate-pulse"></div>
            <div className="h-3.5 bg-(--color-hairline) rounded-sm w-4/6 animate-pulse"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-(--color-ink) font-sans leading-relaxed">
              {explanation}
            </p>
            <div className="pt-3 border-t border-(--color-hairline) flex items-center justify-between text-xs text-(--color-text-secondary) font-data">
              <span>Target: {aoiName || aoiId}</span>
              <span>{usedFallback ? 'Deterministic summary' : 'gemini-3.5-flash'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
