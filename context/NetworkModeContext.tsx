'use client';

import React, { createContext, useContext, useSyncExternalStore, useCallback, useMemo } from 'react';
import { effectiveOffline, statusLabel, NetworkStatusLabel } from '@/lib/network-mode';

const LOCAL_STORAGE_KEY = 'terrapulse_manual_offline';

interface NetworkModeContextValue {
  manualOffline: boolean;
  browserOnline: boolean;
  effectiveOffline: boolean;
  statusLabel: NetworkStatusLabel;
  setManualOffline: (val: boolean) => void;
  toggleManualOffline: () => void;
}

const NetworkModeContext = createContext<NetworkModeContextValue>({
  manualOffline: false,
  browserOnline: true,
  effectiveOffline: false,
  statusLabel: 'Online',
  setManualOffline: () => {},
  toggleManualOffline: () => {},
});

// Window storage event subscription for multi-tab and manual changes
function subscribeManualOffline(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('terrapulse-network-mode', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('terrapulse-network-mode', callback);
  };
}

function getManualOfflineSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getManualOfflineServerSnapshot(): boolean {
  return false;
}

// Window online/offline event subscription
function subscribeBrowserOnline(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getBrowserOnlineSnapshot(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

function getBrowserOnlineServerSnapshot(): boolean {
  return true;
}

export function NetworkModeProvider({ children }: { children: React.ReactNode }) {
  const manualOffline = useSyncExternalStore(
    subscribeManualOffline,
    getManualOfflineSnapshot,
    getManualOfflineServerSnapshot
  );

  const browserOnline = useSyncExternalStore(
    subscribeBrowserOnline,
    getBrowserOnlineSnapshot,
    getBrowserOnlineServerSnapshot
  );

  const setManualOffline = useCallback((val: boolean) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, val ? 'true' : 'false');
      window.dispatchEvent(new Event('terrapulse-network-mode'));
    } catch {
      // LocalStorage access may fail
    }
  }, []);

  const toggleManualOffline = useCallback(() => {
    try {
      const current = localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
      const next = !current;
      localStorage.setItem(LOCAL_STORAGE_KEY, next ? 'true' : 'false');
      window.dispatchEvent(new Event('terrapulse-network-mode'));
    } catch {
      // LocalStorage access may fail
    }
  }, []);

  const isEffectiveOffline = useMemo(
    () => effectiveOffline(manualOffline, browserOnline),
    [manualOffline, browserOnline]
  );

  const currentStatusLabel = useMemo(
    () => statusLabel(manualOffline, browserOnline),
    [manualOffline, browserOnline]
  );

  const contextValue = useMemo<NetworkModeContextValue>(
    () => ({
      manualOffline,
      browserOnline,
      effectiveOffline: isEffectiveOffline,
      statusLabel: currentStatusLabel,
      setManualOffline,
      toggleManualOffline,
    }),
    [manualOffline, browserOnline, isEffectiveOffline, currentStatusLabel, setManualOffline, toggleManualOffline]
  );

  return (
    <NetworkModeContext.Provider value={contextValue}>
      {children}
    </NetworkModeContext.Provider>
  );
}

export function useNetworkMode(): NetworkModeContextValue {
  return useContext(NetworkModeContext);
}
