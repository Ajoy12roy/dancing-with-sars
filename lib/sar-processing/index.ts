// ========================================================================
// SAR Processing — Placeholder
// Server-side utilities for SAR data processing.
// In production, this wraps calls to the Python pipeline.
// ========================================================================

export interface ProcessingConfig {
  aoiId: string;
  dateA: string;
  dateB: string;
  algorithm: 'difference' | 'ratio' | 'log-ratio';
  threshold: number;
}

/**
 * Placeholder: triggers the Python change-detection script.
 * In the offline demo, this simply reads from cached results.
 */
export async function runChangeDetection(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: ProcessingConfig
): Promise<{ success: boolean; resultPath: string }> {
  // TODO: spawn Python subprocess or call FastAPI endpoint
  return { success: true, resultPath: '/data/cached-result.json' };
}
