/**
 * Service status presentation and diagnostics logic.
 * Adheres strictly to DESIGN_SYSTEM.md: no exclamation marks, no emojis, hairline borders.
 */

export type ServiceState =
  | 'not-enabled'
  | 'checking'
  | 'connected'
  | 'not-reachable'
  | 'idle'
  | 'waking'
  | 'ready'
  | 'offline';

export interface StatusPresentation {
  label: string;
  tone: 'muted' | 'neutral' | 'success' | 'alert';
  description: string;
  canAnalyze: boolean;
  showRetry: boolean;
}

export const REAL_SERVICE_COMMAND = 'uvicorn api:app --host 0.0.0.0 --port 7860';
export const REAL_SERVICE_ENV_VAR = 'NEXT_PUBLIC_PROCESSING_API_URL';
export const REAL_SERVICE_CORS_VAR = 'ALLOWED_ORIGINS';
export const REAL_SERVICE_DOC_PATH = 'docs/DEPLOYMENT.md';

/**
 * Pure function to format the service status presentation.
 * Deterministic for testing.
 */
export function statusPresentation(
  state: ServiceState,
  serviceConfigured: boolean
): StatusPresentation {
  if (!serviceConfigured) {
    return {
      label: 'Processing service: not enabled on this deployment',
      tone: 'muted',
      description: 'Live analysis requires the processing service, which is not available on this deployment.',
      canAnalyze: false,
      showRetry: false,
    };
  }

  if (state === 'checking' || state === 'waking' || state === 'idle') {
    return {
      label: 'Processing service: checking',
      tone: 'neutral',
      description: 'Checking connection to the processing service.',
      canAnalyze: false,
      showRetry: false,
    };
  }

  if (state === 'connected' || state === 'ready') {
    return {
      label: 'Processing service: connected',
      tone: 'success',
      description: 'Processing service is online and ready for analysis.',
      canAnalyze: true,
      showRetry: false,
    };
  }

  // Not reachable / offline
  return {
    label: 'Processing service: not reachable',
    tone: 'alert',
    description: 'Processing service not reachable. Check the service status above.',
    canAnalyze: false,
    showRetry: true,
  };
}
