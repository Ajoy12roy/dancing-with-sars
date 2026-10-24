import { useState, useCallback, useRef } from 'react';
import type { ChangeData } from './useChangeData';

export interface UploadAnalyzeOptions {
  mode?: string;
  dateA?: string;
  dateB?: string;
  aoiName?: string;
}

export interface SampleAnalyzeOptions {
  name: string;
  mode?: string;
  dateA?: string;
  dateB?: string;
}

export type ServerHealthStatus = 'idle' | 'waking' | 'ready' | 'offline';

export interface UseUploadChangeDataReturn {
  data: ChangeData | null;
  loading: boolean;
  statusText: string;
  error: string | null;
  serverStatus: ServerHealthStatus;
  apiUrl: string;
  analyze: (beforeFile: File, afterFile: File, options?: UploadAnalyzeOptions) => Promise<boolean>;
  analyzeSample: (options: SampleAnalyzeOptions) => Promise<boolean>;
  reset: () => void;
  pingHealth: () => Promise<void>;
}

const MAX_UPLOAD_BYTES = 60 * 1024 * 1024; // 60 MB

function isValidGeoTiff(fileName: string): boolean {
  return /\.(tif|tiff)$/i.test(fileName);
}

export function useUploadChangeData(): UseUploadChangeDataReturn {
  const [data, setData] = useState<ChangeData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerHealthStatus>('idle');

  const apiUrl = (process.env.NEXT_PUBLIC_PROCESSING_API_URL || '').trim().replace(/\/+$/, '');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Non-blocking ping to wake the server
  const pingHealth = useCallback(async () => {
    if (!apiUrl) {
      setServerStatus('offline');
      return;
    }
    setServerStatus('waking');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout

    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      if (response.ok) {
        setServerStatus('ready');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    } finally {
      clearTimeout(timeout);
    }
  }, [apiUrl]);

  const sendAnalysisRequest = useCallback(
    async (
      endpoint: string,
      formData: FormData,
      defaultAoiId: string,
      defaultName: string,
      defaultMode?: string
    ): Promise<boolean> => {
      if (!apiUrl) {
        setError('Live processing is not configured; precomputed areas still work.');
        return false;
      }

      setLoading(true);
      setStatusText('Waking up the processing server (can take up to a minute)');

      // Cancel any previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 150000); // 150 seconds timeout

      // Progressive progress states
      const uploadingTimer = setTimeout(() => {
        setStatusText('Uploading');
      }, 1500);

      const analyzingTimer = setTimeout(() => {
        setStatusText('Analyzing radar change');
      }, 5000);

      try {
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(uploadingTimer);
        clearTimeout(analyzingTimer);

        let resJson: any = null;
        try {
          resJson = await response.json();
        } catch {
          // Response body wasn't JSON
        }

        if (!response.ok) {
          const serverMsg = resJson?.detail || resJson?.error;
          if (response.status === 400) {
            throw new Error(
              serverMsg || 'Invalid GeoTIFF format, mismatched coordinates/dimensions, or bad parameters.'
            );
          } else if (response.status === 429) {
            throw new Error(
              serverMsg || 'Server busy, try again in a minute.'
            );
          } else if (response.status === 504) {
            throw new Error(
              serverMsg || 'Analysis timed out on the processing server.'
            );
          } else {
            throw new Error(
              serverMsg || `Processing failed with server status ${response.status}.`
            );
          }
        }

        setStatusText('Done');
        setServerStatus('ready');

        const apiResult = resJson.result || {};
        const apiImages = resJson.images || {};

        const unifiedData: ChangeData = {
          aoiId: apiResult.aoiId || defaultAoiId,
          name: apiResult.name || defaultName,
          dateBefore: apiResult.dateBefore || (apiResult.dates?.a ? apiResult.dates.a : 'Before Scene'),
          dateAfter: apiResult.dateAfter || (apiResult.dates?.b ? apiResult.dates.b : 'After Scene'),
          percentChanged: typeof apiResult.percentChanged === 'number' ? apiResult.percentChanged : 0,
          affectedAreaKm2: typeof apiResult.affectedAreaKm2 === 'number' ? apiResult.affectedAreaKm2 : 0,
          confidence: typeof apiResult.confidence === 'number' ? apiResult.confidence : 0,
          beforeImage: apiImages.before || '',
          afterImage: apiImages.after || '',
          changeMapImage: apiImages.change_map || '',
          bounds: apiResult.bounds,
          center: apiResult.center,
          zoom: apiResult.zoom || 11,
          mode: apiResult.mode || defaultMode || 'flood',
          signalStrength: apiResult.signalStrength,
          totalAreaKm2: apiResult.totalAreaKm2,
          dates: apiResult.dates,
          categories: apiResult.categories,
          metrics: apiResult.metrics,
          params: apiResult.params,
          warnings: apiResult.warnings,
        };

        setData(unifiedData);
        return true;
      } catch (err: unknown) {
        clearTimeout(uploadingTimer);
        clearTimeout(analyzingTimer);

        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            setError('Analysis timed out after 150 seconds. The server might still be waking up or processing large imagery.');
          } else if (err.message.includes('Failed to fetch') || err instanceof TypeError) {
            setError('Unable to connect to the processing server. Please check your network or verify the processing server is running.');
            setServerStatus('offline');
          } else {
            setError(err.message);
          }
        } else {
          setError('An unexpected error occurred during analysis.');
        }
        return false;
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const analyze = useCallback(
    async (
      beforeFile: File,
      afterFile: File,
      options?: UploadAnalyzeOptions
    ): Promise<boolean> => {
      setError(null);

      // 1. Client-side Validation (Plain-English errors)
      if (!beforeFile || !afterFile) {
        setError('Please select both a Before image and an After image.');
        return false;
      }

      if (!isValidGeoTiff(beforeFile.name)) {
        setError(
          `Before file "${beforeFile.name}" is not a valid GeoTIFF. Only .tif and .tiff files are accepted.`
        );
        return false;
      }

      if (!isValidGeoTiff(afterFile.name)) {
        setError(
          `After file "${afterFile.name}" is not a valid GeoTIFF. Only .tif and .tiff files are accepted.`
        );
        return false;
      }

      if (beforeFile.size > MAX_UPLOAD_BYTES) {
        const mb = (beforeFile.size / (1024 * 1024)).toFixed(1);
        setError(
          `Before image "${beforeFile.name}" is ${mb} MB, which exceeds the maximum allowed size of 60 MB.`
        );
        return false;
      }

      if (afterFile.size > MAX_UPLOAD_BYTES) {
        const mb = (afterFile.size / (1024 * 1024)).toFixed(1);
        setError(
          `After image "${afterFile.name}" is ${mb} MB, which exceeds the maximum allowed size of 60 MB.`
        );
        return false;
      }

      const formData = new FormData();
      formData.append('before', beforeFile);
      formData.append('after', afterFile);
      formData.append('aoi_name', options?.aoiName || 'custom-upload');
      if (options?.mode) {
        formData.append('mode', options.mode);
      }
      if (options?.dateA) {
        formData.append('date_a', options.dateA);
      }
      if (options?.dateB) {
        formData.append('date_b', options.dateB);
      }

      const defaultName = options?.aoiName ? `${options.aoiName} (Custom)` : 'Custom SAR Analysis';
      return sendAnalysisRequest('/analyze', formData, 'custom-upload', defaultName, options?.mode);
    },
    [sendAnalysisRequest]
  );

  const analyzeSample = useCallback(
    async (options: SampleAnalyzeOptions): Promise<boolean> => {
      setError(null);

      const formData = new FormData();
      formData.append('name', options.name || 'sylhet');
      if (options.mode) {
        formData.append('mode', options.mode);
      }
      if (options.dateA) {
        formData.append('date_a', options.dateA);
      }
      if (options.dateB) {
        formData.append('date_b', options.dateB);
      }

      const sampleName = options.name === 'sylhet' ? 'Sylhet Floods (Sample)' : `${options.name} (Sample)`;
      return sendAnalysisRequest('/analyze-sample', formData, options.name || 'sylhet', sampleName, options.mode);
    },
    [sendAnalysisRequest]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setData(null);
    setError(null);
    setLoading(false);
    setStatusText('');
  }, []);

  return {
    data,
    loading,
    statusText,
    error,
    serverStatus,
    apiUrl,
    analyze,
    analyzeSample,
    reset,
    pingHealth,
  };
}
