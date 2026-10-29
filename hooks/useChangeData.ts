import { useState, useEffect } from 'react';

export interface ChartDataPoint {
  category: string;
  value: number;
}

import type { AnalysisMode, DateRange, ResultBounds, ResultCategory, ResultDates, ResultMetrics, ResultParams } from '@/types';

export interface ChangeData {
  aoiId: string;
  name: string;
  dateBefore: string;
  dateAfter: string;
  percentChanged: number;
  affectedAreaKm2: number;
  confidence: number;
  chartData?: ChartDataPoint[];
  beforeImage: string;
  afterImage: string;
  changeMapImage: string;
  bounds?: ResultBounds | { north: number; south: number; east: number; west: number };
  center?: [number, number];
  zoom?: number;
  mode?: AnalysisMode | 'change' | string;
  signalStrength?: number;
  totalAreaKm2?: number;
  dates?: ResultDates;
  categories?: ResultCategory[];
  metrics?: ResultMetrics;
  params?: ResultParams;
  warnings?: string[];
  beforeRange?: DateRange;
  afterRange?: DateRange;
  honestyNote?: string;
}

export { useUploadChangeData } from './useUploadChangeData';

export function useChangeData(aoiId: string | null) {
  const [data, setData] = useState<ChangeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!aoiId) {
      // Avoid synchronous setState in effect when possible
      // if it's already null we don't need to do anything
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/change-detection?aoi=${aoiId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [aoiId]);

  return { data, loading, error };
}
