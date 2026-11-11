'use client';

import { useNetworkMode } from '@/context';
import { Wifi, WifiOff } from 'lucide-react';

interface NetworkModeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function NetworkModeToggle({ showLabel = false, className = '' }: NetworkModeToggleProps) {
  const { manualOffline, effectiveOffline, statusLabel, toggleManualOffline } = useNetworkMode();

  const isChecked = manualOffline;
  const label = manualOffline ? 'Return online' : 'Work offline';

  return (
    /* eslint-disable-next-line jsx-a11y/role-supports-aria-props */
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-pressed={isChecked}
      aria-label={label}
      onClick={toggleManualOffline}
      title={`${statusLabel} — click to ${label.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[2px] text-xs font-sans transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
        effectiveOffline
          ? 'bg-rust/15 text-rust border border-rust/40 hover:bg-rust/25'
          : 'bg-surface-2/60 text-navbar-text hover:text-navbar-link-hover border border-transparent hover:border-hairline'
      } ${className}`}
    >
      {effectiveOffline ? (
        <WifiOff className="w-3.5 h-3.5 text-rust shrink-0" />
      ) : (
        <Wifi className="w-3.5 h-3.5 text-teal shrink-0" />
      )}
      {showLabel ? (
        <span className="font-medium text-xs">
          {manualOffline ? 'Work offline: ON' : 'Work offline: OFF'}
        </span>
      ) : (
        <span className="hidden xl:inline text-[11px] font-medium">
          {statusLabel}
        </span>
      )}
    </button>
  );
}
