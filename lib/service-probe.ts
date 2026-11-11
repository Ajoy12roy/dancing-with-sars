/**
 * Pure functions to determine whether the browser client should probe the
 * backend processing service at runtime.
 */

export function isLocalHostname(hostname: string): boolean {
  if (!hostname) return false;
  let h = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (h === '::1' || h.startsWith('::1')) return true;
  if (h.includes(':') && !h.includes('::')) {
    h = h.split(':')[0] || '';
  }
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

export function isLoopbackHost(hostOrUrl: string): boolean {
  if (!hostOrUrl) return false;
  let host = hostOrUrl.trim().toLowerCase();
  try {
    if (host.includes('://')) {
      const parsed = new URL(host);
      host = parsed.hostname.toLowerCase();
    }
  } catch {
    // If invalid full URL, treat as hostname string
  }
  host = host.replace(/^\[|\]$/g, '');
  if (host === '::1' || host.startsWith('::1')) return true;
  if (host.includes(':') && !host.includes('::')) {
    host = host.split(':')[0] || '';
  }
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
}

/**
 * Returns false if:
 * 1. apiUrl is not configured or empty.
 * 2. The page is served from a non-local host (not localhost, 127.0.0.1, ::1)
 *    and apiUrl points to a loopback address or is empty.
 * Otherwise returns true.
 */
export function shouldProbeService(
  hostname: string,
  apiUrl: string | undefined | null
): boolean {
  if (!apiUrl || !apiUrl.trim()) {
    return false;
  }
  const isLocalHost = isLocalHostname(hostname);
  const isLoopbackApi = isLoopbackHost(apiUrl);

  // If served from a non-local host and apiUrl is empty or loopback address, send NO request
  if (!isLocalHost && isLoopbackApi) {
    return false;
  }

  return true;
}
