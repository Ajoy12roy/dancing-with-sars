// ========================================================================
// StatCounter — Revised: flat, monospace data only where numeric.
// No animated glow, no accent color on label. Clean report-style stat.
// ========================================================================



interface StatCounterProps {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
  /** Use 'rust' only for flagged/changed-region stats */
  highlight?: boolean;
}

export function StatCounter({
  label,
  value,
  unit,
  className = '',
  highlight = false,
}: StatCounterProps) {
  const valueColor = highlight
    ? 'text-rust'
    : 'text-ink';

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs tracking-wide text-text-secondary">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-semibold font-data tabular-nums ${valueColor}`}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-text-secondary font-data">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
