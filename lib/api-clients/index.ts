// ========================================================================
// API Clients — Placeholder
// Wrappers for ASF DAAC search, AI API calls, etc.
// ========================================================================

/**
 * Placeholder: fetches AI insight from the local API route.
 * Handles offline fallback gracefully.
 */
export async function fetchAIInsight(statsJson: Record<string, unknown>): Promise<{
  summary: string;
  details: string;
  isLive: boolean;
}> {
  try {
    const res = await fetch('/api/ai-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statsJson),
    });
    const data = await res.json();
    return data.data ?? { summary: 'Insight unavailable.', details: '', isLive: false };
  } catch {
    return { summary: 'AI insight unavailable (offline).', details: '', isLive: false };
  }
}
