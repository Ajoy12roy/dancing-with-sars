/**
 * lib/retry-backoff.ts
 *
 * Pure algorithmic helper for exponential backoff and retry scheduling.
 * Zero external dependencies, pure TypeScript.
 */

export interface BackoffConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  maxTotalTimeMs: number;
}

export const DEFAULT_HEALTH_BACKOFF: BackoffConfig = {
  initialDelayMs: 2000,
  maxDelayMs: 10000,
  backoffFactor: 1.5,
  maxTotalTimeMs: 90000, // 90 seconds max total duration
};

/**
 * Computes delay in milliseconds for a zero-based attempt number.
 */
export function getBackoffDelay(
  attempt: number,
  config: Partial<BackoffConfig> = {}
): number {
  const c = { ...DEFAULT_HEALTH_BACKOFF, ...config };
  if (attempt <= 0) return c.initialDelayMs;
  const raw = c.initialDelayMs * Math.pow(c.backoffFactor, attempt);
  return Math.min(Math.round(raw), c.maxDelayMs);
}

/**
 * Returns true if total elapsed time has not exceeded maxTotalTimeMs.
 */
export function shouldRetry(
  elapsedMs: number,
  config: Partial<BackoffConfig> = {}
): boolean {
  const c = { ...DEFAULT_HEALTH_BACKOFF, ...config };
  return elapsedMs < c.maxTotalTimeMs;
}

