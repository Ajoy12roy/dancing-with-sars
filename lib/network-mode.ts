/**
 * Network Mode pure logic
 * Project: Dancing with the SARs (TerraPulse)
 */

export type NetworkStatusLabel = 'Online' | 'Offline (manual)' | 'Offline (no connection)';

/**
 * Determines whether the application should operate in offline mode.
 * Effective offline is true if the user manually toggled offline mode OR
 * the browser reports navigator.onLine as false.
 */
export function effectiveOffline(manualOffline: boolean, browserOnline: boolean): boolean {
  return Boolean(manualOffline || !browserOnline);
}

/**
 * Returns a human-readable formal status label for the current network mode state.
 */
export function statusLabel(manualOffline: boolean, browserOnline: boolean): NetworkStatusLabel {
  if (!browserOnline) {
    return 'Offline (no connection)';
  }
  if (manualOffline) {
    return 'Offline (manual)';
  }
  return 'Online';
}

