import { useState, useEffect, useRef } from 'react';
import { useAnalysisMode } from '@/context';
import { generateFallbackInsight, type InsightPayload } from '@/lib/ai-insight-fallback';
import type { ChangeData } from '@/hooks/useChangeData';
import type { ResultMetrics, ResultCategory, ResultDates } from '@/types';
import { DataPanel } from '@/components/ui/DataPanel';

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

interface InsightCacheEntry {
  explanation: string;
  usedFallback: boolean;
}

// Module-level cache and in-flight request map keyed by `${aoi}:${mode}`
const insightCache = new Map<string, InsightCacheEntry>();
const inFlightRequests = new Map<string, Promise<InsightCacheEntry>>();

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
  const currentKeyRef = useRef<string>('');

  useEffect(() => {
    if (!aoiId && !activeMode) return;

    const cacheKey = `${aoiId || 'none'}:${activeMode}`;
    currentKeyRef.current = cacheKey;

    // 1. Cache hit: restore state from cache via Promise to avoid synchronous setState in effect
    let requestPromise = insightCache.has(cacheKey)
      ? Promise.resolve(insightCache.get(cacheKey)!)
      : inFlightRequests.get(cacheKey);

    const isDemoAoi = ['sylhet', 'jamuna', 'amazon', 'tanguar'].includes(aoiId);

    const localFallbackPayload: InsightPayload = {
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

    let requestBody: Record<string, unknown>;
    if (isDemoAoi) {
      requestBody = {
        aoi: aoiId,
        mode: activeMode,
      };
    } else {
      const metricsObj: Record<string, number> = {};
      if (typeof percentChanged === 'number' && Number.isFinite(percentChanged)) {
        metricsObj.percentChanged = percentChanged;
      }
      if (typeof affectedAreaKm2 === 'number' && Number.isFinite(affectedAreaKm2)) {
        metricsObj.affectedAreaKm2 = affectedAreaKm2;
      }
      if (typeof confidence === 'number' && Number.isFinite(confidence)) {
        metricsObj.confidence = confidence;
      }
      if (typeof activeTotalArea === 'number' && Number.isFinite(activeTotalArea)) {
        metricsObj.totalAreaKm2 = activeTotalArea;
      }
      if (activeMetrics && typeof activeMetrics === 'object') {
        for (const [k, v] of Object.entries(activeMetrics)) {
          if (typeof v === 'number' && Number.isFinite(v)) {
            metricsObj[k] = v;
          }
        }
      }
      requestBody = {
        mode: activeMode,
        metrics: metricsObj,
      };
    }

    // 2. Reuse one in-flight promise per key if not in cache
    if (!requestPromise) {
      requestPromise = inFlightRequests.get(cacheKey);
    }

    if (!requestPromise) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 20000); // 20-second AbortController timeout

      requestPromise = (async () => {
        try {
          const response = await fetch('/api/ai-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          if (!response.ok) {
            // Rate limit (429) returns fallback explanation directly
            if (response.status === 429) {
              const resJson = await response.json().catch(() => null);
              if (resJson?.explanation) {
                const entry: InsightCacheEntry = {
                  explanation: resJson.explanation,
                  usedFallback: true,
                };
                insightCache.set(cacheKey, entry);
                return entry;
              }
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const result = await response.json();
          const isFallback = Boolean(result.fallback ?? result.usedFallback);
          const entry: InsightCacheEntry = {
            explanation: result.explanation || generateFallbackInsight(localFallbackPayload),
            usedFallback: isFallback,
          };
          insightCache.set(cacheKey, entry);
          return entry;
        } catch {
          // Fall back to offline text on timeout or fetch error; never show empty box
          const fallbackText = generateFallbackInsight(localFallbackPayload);
          const entry: InsightCacheEntry = {
            explanation: fallbackText,
            usedFallback: true,
          };
          insightCache.set(cacheKey, entry);
          return entry;
        } finally {
          clearTimeout(timeoutId);
          inFlightRequests.delete(cacheKey);
        }
      })();

      inFlightRequests.set(cacheKey, requestPromise);
    }

    // 3. Await in-flight request, ignore response only if current key differs, setLoading(false) in finally
    requestPromise
      .then((entry) => {
        if (currentKeyRef.current === cacheKey) {
          setExplanation(entry.explanation);
          setUsedFallback(entry.usedFallback);
        }
      })
      .catch(() => {
        if (currentKeyRef.current === cacheKey) {
          const fallbackText = generateFallbackInsight(localFallbackPayload);
          setExplanation(fallbackText);
          setUsedFallback(true);
        }
      })
      .finally(() => {
        if (currentKeyRef.current === cacheKey) {
          setLoading(false);
        }
      });
  }, [
    activeMode,
    aoiId,
    aoiName,
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
    <DataPanel
      title="Radar Interpretation"
      rightSlot={
        <span className="font-sans text-xs text-text-secondary truncate text-right">
          {usedFallback
            ? 'Offline summary'
            : 'AI-generated explanation of computed results'}
        </span>
      }
      className="h-full min-h-80 w-full"
      bodyClassName="justify-between overflow-y-auto"
    >
        {loading ? (
          <div className="space-y-3">
            <div className="h-3.5 bg-hairline rounded-sm w-full animate-pulse"></div>
            <div className="h-3.5 bg-hairline rounded-sm w-5/6 animate-pulse"></div>
            <div className="h-3.5 bg-hairline rounded-sm w-4/6 animate-pulse"></div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <p className="text-sm text-ink font-sans leading-relaxed">
              {explanation}
            </p>
            <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs text-text-secondary font-data shrink-0">
              <span>Target: {aoiName || aoiId}</span>
              <span>{usedFallback ? 'Offline summary' : 'gemini-2.5-flash'}</span>
            </div>
          </div>
        )}
    </DataPanel>
  );
}
