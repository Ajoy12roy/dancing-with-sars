import { useState, useEffect, useRef } from 'react';
import { useAnalysisMode } from '@/context';
import { generateFallbackInsight, type InsightPayload } from '@/lib/ai-insight-fallback';
import type { ChangeData } from '@/hooks/useChangeData';
import type { ResultMetrics, ResultCategory, ResultDates } from '@/types';
import { isKnownCaseId, getCaseStudyById } from '@/lib/case-studies';
import {
  getSensitivityForCase,
  getSensitivityClass,
  getSensitivityDelta,
  getSensitivityParameterLabel,
} from '@/lib/sensitivity';
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
  notes?: string[];
}

// Module-level cache and in-flight request map keyed by `${aoi}:${mode}`
const insightCache = new Map<string, InsightCacheEntry>();
const inFlightRequests = new Map<string, Promise<InsightCacheEntry>>();

function getLocalFallbackNotes(aoiId: string, payload: InsightPayload): string[] {
  const notes: string[] = [];
  if (aoiId && isKnownCaseId(aoiId)) {
    const cs = getCaseStudyById(aoiId);
    const sens = cs?.sensitivity || getSensitivityForCase(aoiId);
    if (sens) {
      const cls = getSensitivityClass(sens);
      const delta = getSensitivityDelta(sens);
      const deltaStr = delta % 1 === 0 ? delta.toFixed(0) : delta.toFixed(1);
      const paramLabel = getSensitivityParameterLabel(sens.parameterName);
      const classLabel =
        cls === 'stable'
          ? 'Stable under threshold changes'
          : cls === 'moderate'
          ? 'Moderately threshold-sensitive'
          : 'Highly threshold-sensitive (treat headline number as indicative only)';
      notes.push(
        `Sensitivity analysis (${classLabel}): Result spans ${sens.minAreaKm2.toFixed(2)} to ${sens.maxAreaKm2.toFixed(2)} km² when ${paramLabel} varies by ±${deltaStr} ${sens.unit}.`
      );
    }
    if (cs?.honestyNote) {
      notes.push(cs.honestyNote);
    }
    if (cs?.beforeRange && cs?.afterRange) {
      notes.push(
        `Composite dates: Imagery is a median composite of Sentinel-1 scenes acquired from ${cs.beforeRange.start} to ${cs.beforeRange.end} (Before) and ${cs.afterRange.start} to ${cs.afterRange.end} (After).`
      );
    } else if (payload.dates?.a && payload.dates?.b) {
      notes.push(
        `Composite dates: Reference dates (${payload.dates.a} and ${payload.dates.b}) represent median composites around those dates (full acquisition range not recorded).`
      );
    }
    const rawSignal = payload.confidence ?? payload.signalStrength;
    if (rawSignal == null || isNaN(rawSignal)) {
      notes.push('Signal strength: Not available for this observation.');
    }
  } else {
    const rawSignal = payload.confidence ?? payload.signalStrength;
    if (rawSignal == null || isNaN(rawSignal)) {
      notes.push('Signal strength: Not available for this custom upload.');
    }
    if (payload.warnings && payload.warnings.length > 0) {
      for (const w of payload.warnings) {
        notes.push(`Notice: ${w}`);
      }
    }
  }
  return notes;
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
  const [notes, setNotes] = useState<string[] | undefined>(undefined);
  const currentKeyRef = useRef<string>('');

  useEffect(() => {
    if (!aoiId && !activeMode) return;

    const cacheKey = `${aoiId || 'none'}:${activeMode}`;
    currentKeyRef.current = cacheKey;

    // 1. Cache hit: restore state from cache via Promise to avoid synchronous setState in effect
    let requestPromise = insightCache.has(cacheKey)
      ? Promise.resolve(insightCache.get(cacheKey)!)
      : inFlightRequests.get(cacheKey);

    const isDemoAoi = isKnownCaseId(aoiId);

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
                  notes: Array.isArray(resJson.notes)
                    ? resJson.notes
                    : getLocalFallbackNotes(aoiId, localFallbackPayload),
                };
                insightCache.set(cacheKey, entry);
                return entry;
              }
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const result = await response.json();
          const isFallback = Boolean(result.fallback ?? result.usedFallback);
          const returnedNotes = Array.isArray(result.notes)
            ? result.notes
            : getLocalFallbackNotes(aoiId, localFallbackPayload);
          const entry: InsightCacheEntry = {
            explanation: result.explanation || generateFallbackInsight(localFallbackPayload),
            usedFallback: isFallback,
            notes: returnedNotes.length > 0 ? returnedNotes : undefined,
          };
          insightCache.set(cacheKey, entry);
          return entry;
        } catch {
          // Fall back to offline text on timeout or fetch error; never show empty box
          const fallbackText = generateFallbackInsight(localFallbackPayload);
          const fallbackNotes = getLocalFallbackNotes(aoiId, localFallbackPayload);
          const entry: InsightCacheEntry = {
            explanation: fallbackText,
            usedFallback: true,
            notes: fallbackNotes.length > 0 ? fallbackNotes : undefined,
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
          setNotes(entry.notes);
        }
      })
      .catch(() => {
        if (currentKeyRef.current === cacheKey) {
          const fallbackText = generateFallbackInsight(localFallbackPayload);
          const fallbackNotes = getLocalFallbackNotes(aoiId, localFallbackPayload);
          setExplanation(fallbackText);
          setUsedFallback(true);
          setNotes(fallbackNotes.length > 0 ? fallbackNotes : undefined);
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
          <div className="space-y-3">
            <p className="text-sm text-ink font-sans leading-relaxed">
              {explanation}
            </p>
            {notes && notes.length > 0 && (
              <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-1.5 text-xs">
                <div className="font-semibold text-text-primary uppercase tracking-wider font-headline text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                  <span>Reliability notes (computed from data, not AI-written)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-text-secondary font-sans leading-relaxed">
                  {notes.map((note, idx) => (
                    <li key={idx} className="leading-snug">
                      <span className="text-ink">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs text-text-secondary font-data shrink-0">
            <span>Target: {aoiName || aoiId}</span>
            <span>{usedFallback ? 'Offline summary' : 'gemini-2.5-flash'}</span>
          </div>
        </div>
      )}
    </DataPanel>
  );
}
