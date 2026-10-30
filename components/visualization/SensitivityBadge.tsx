'use client';

import type { SensitivityData } from '@/types';
import { getSensitivityClass, getSensitivityClassBadgeInfo } from '@/lib/sensitivity';

interface SensitivityBadgeProps {
  sensitivity?: SensitivityData | null;
  className?: string;
}

export default function SensitivityBadge({
  sensitivity,
  className = '',
}: SensitivityBadgeProps) {
  if (!sensitivity) return null;

  const cls = getSensitivityClass(sensitivity);
  const info = getSensitivityClassBadgeInfo(cls);

  const colorStyles =
    cls === 'stable'
      ? 'border-teal text-teal bg-surface-2'
      : cls === 'moderate'
      ? 'border-hairline text-text-primary bg-surface-2'
      : 'border-rust text-rust bg-surface-2';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded-[2px] text-xs font-sans font-medium select-none ${colorStyles} ${className}`}
      title={info.label}
    >
      {/* Accessible screen reader text */}
      <span className="sr-only">{info.srText}</span>
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          cls === 'stable' ? 'bg-teal' : cls === 'moderate' ? 'bg-hairline' : 'bg-rust'
        }`}
      />
      <span>{info.label}</span>
    </span>
  );
}
