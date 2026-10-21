import { useState, useCallback } from 'react';
import type { ChangeData } from './useChangeData';

export interface UploadAnalyzeOptions {
  mode?: string;
  dateA?: string;
  dateB?: string;
}

export interface UseUploadChangeDataReturn {
  data: ChangeData | null;
  loading: boolean;
  error: string | null;
  analyze: (beforeFile: File, afterFile: File, options?: UploadAnalyzeOptions) => Promise<boolean>;
  reset: () => void;
}

export function useUploadChangeData(): UseUploadChangeDataReturn {
  const [data, setData] = useState<ChangeData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (
    beforeFile: File, 
    afterFile: File,
    options?: UploadAnalyzeOptions
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('beforeImage', beforeFile);
    formData.append('afterImage', afterFile);
    if (options?.mode) {
      formData.append('mode', options.mode);
    }
    if (options?.dateA) {
      formData.append('dateA', options.dateA);
    }
    if (options?.dateB) {
      formData.append('dateB', options.dateB);
    }

    try {
      const response = await fetch('/api/analyze-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Upload failed with status code ${response.status}`);
      }

      const unifiedData: ChangeData = {
        aoiId: result.aoiId || 'custom-upload',
        name: result.name || 'Uploaded SAR Imagery',
        dateBefore: result.dateBefore || (result.dates?.a ? result.dates.a : 'Before Scene'),
        dateAfter: result.dateAfter || (result.dates?.b ? result.dates.b : 'After Scene'),
        percentChanged: typeof result.percentChanged === 'number' ? result.percentChanged : 0,
        affectedAreaKm2: typeof result.affectedAreaKm2 === 'number' ? result.affectedAreaKm2 : 0,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0,
        chartData: Array.isArray(result.chartData)
          ? result.chartData
          : (Array.isArray(result.categories)
            ? result.categories.map((c: { label?: string; id?: string; kind?: string; areaKm2?: number }) => ({
                category: c.label || c.id || 'Category',
                value: c.kind === 'loss' ? -(c.areaKm2 ?? 0) : (c.areaKm2 ?? 0),
              }))
            : []),
        beforeImage: result.beforeImage || '',
        afterImage: result.afterImage || '',
        changeMapImage: result.changeMapImage || '',
        bounds: result.bounds,
        center: result.center,
        zoom: result.zoom,
        mode: result.mode,
        signalStrength: result.signalStrength,
        totalAreaKm2: result.totalAreaKm2,
        dates: result.dates,
        categories: result.categories,
        metrics: result.metrics,
        params: result.params,
        warnings: result.warnings,
      };

      setData(unifiedData);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during analysis.';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, analyze, reset };
}
