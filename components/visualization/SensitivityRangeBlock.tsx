'use client';

import { useMemo } from 'react';
import type { SensitivityData } from '@/types';
import {
  getSensitivityParameterLabel,
  getSensitivityDelta,
} from '@/lib/sensitivity';

interface SensitivityRangeBlockProps {
  sensitivity?: SensitivityData | null;
  headlineResult?: string;
  className?: string;
}

export default function SensitivityRangeBlock({
  sensitivity,
  headlineResult,
  className = '',
}: SensitivityRangeBlockProps) {
  const delta = useMemo(() => {
    if (!sensitivity) return 0;
    return getSensitivityDelta(sensitivity);
  }, [sensitivity]);

  const paramLabel = useMemo(() => {
    if (!sensitivity) return 'threshold';
    return getSensitivityParameterLabel(sensitivity.parameterName);
  }, [sensitivity]);

  if (!sensitivity) {
    return (
      <div className={`p-4 bg-surface-2 border border-hairline rounded-[2px] text-xs font-sans text-text-secondary ${className}`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary uppercase tracking-wider font-headline">
            Sensitivity Range
          </span>
        </div>
        <p className="mt-1 italic text-text-secondary">
          Sensitivity not computed for this case.
        </p>
      </div>
    );
  }

  const deltaStr = delta % 1 === 0 ? delta.toFixed(0) : delta.toFixed(1);
  const steps = sensitivity.steps || [];

  return (
    <div className={`p-4 bg-surface-2 border border-hairline rounded-[2px] space-y-3 ${className}`}>
      {/* Header and Headline Result */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-hairline pb-2.5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary font-headline">
            Sensitivity Range (Trust Layer)
          </span>
          {headlineResult && (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xs text-text-secondary font-sans">Baseline Result:</span>
              <span className="text-sm font-semibold font-data text-teal">
                {headlineResult}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs font-data text-teal self-start sm:self-auto">
          {sensitivity.parameterName}: {sensitivity.centre > 0 ? `+${sensitivity.centre}` : sensitivity.centre} {sensitivity.unit}
        </span>
      </div>

      {/* Result Range Statement */}
      <div className="text-xs font-sans text-text-primary leading-relaxed">
        <span className="font-semibold text-text-primary">Result range: </span>
        <span className="font-data text-teal font-medium">
          {sensitivity.minAreaKm2.toFixed(2)} to {sensitivity.maxAreaKm2.toFixed(2)} km²
        </span>{' '}
        when {paramLabel} varies by ±{deltaStr} {sensitivity.unit}
      </div>

      {/* Visual Range Bar with 5 Ticks */}
      <div className="pt-2 pb-1">
        <div className="relative w-full">
          {/* Base bar */}
          <div className="h-2 w-full bg-surface border border-hairline rounded-[2px] relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 right-0 bg-teal/20" />
          </div>

          {/* Step markers container */}
          <div className="relative w-full h-8 mt-1">
            {steps.map((st, idx) => {
              const count = steps.length;
              // Distribute tick points evenly across 0% to 100%
              const leftPercent = count > 1 ? (idx / (count - 1)) * 100 : 50;
              const isCentre = st.value === sensitivity.centre;

              return (
                <div
                  key={st.value}
                  className="absolute -top-3 transform -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${leftPercent}%` }}
                >
                  {/* Tick marker */}
                  <div
                    className={`w-0.5 ${
                      isCentre
                        ? 'h-3.5 bg-teal -mt-0.5'
                        : 'h-2.5 bg-hairline'
                    }`}
                  />
                  {/* Step value label */}
                  <span
                    className={`mt-1 font-data text-[10px] whitespace-nowrap ${
                      isCentre
                        ? 'text-teal font-semibold'
                        : 'text-text-secondary'
                    }`}
                  >
                    {st.value > 0 ? `+${st.value}` : st.value}
                  </span>
                  {/* Area value below */}
                  <span
                    className={`font-data text-[9px] whitespace-nowrap ${
                      isCentre ? 'text-teal font-medium' : 'text-text-secondary'
                    }`}
                  >
                    {st.areaKm2.toFixed(1)} km²
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expandable Disclosure Table */}
      <details className="group border border-hairline rounded-[2px] bg-surface text-xs font-sans">
        <summary className="px-3 py-2 cursor-pointer text-text-secondary hover:text-text-primary flex items-center justify-between transition-colors select-none">
          <span className="font-medium">
            View 5-point sensitivity calibration table ({steps.length} values)
          </span>
          <span className="font-data text-teal text-[11px] group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>

        <div className="px-3 pb-3 pt-1 border-t border-hairline overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-hairline text-text-secondary font-headline">
                <th className="py-1.5 pr-3 font-semibold">Threshold ({sensitivity.unit})</th>
                <th className="py-1.5 px-3 font-semibold">Detected Area</th>
                <th className="py-1.5 px-3 font-semibold">Change %</th>
                <th className="py-1.5 pl-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline font-data">
              {steps.map((st) => {
                const isCentre = st.value === sensitivity.centre;
                return (
                  <tr
                    key={st.value}
                    className={isCentre ? 'bg-surface-2 text-teal font-medium' : 'text-text-primary'}
                  >
                    <td className="py-1.5 pr-3">
                      {st.value > 0 ? `+${st.value.toFixed(1)}` : st.value.toFixed(1)} {sensitivity.unit}
                    </td>
                    <td className="py-1.5 px-3">{st.areaKm2.toFixed(2)} km²</td>
                    <td className="py-1.5 px-3">{st.percentChanged.toFixed(2)}%</td>
                    <td className="py-1.5 pl-3 text-right">
                      {isCentre ? (
                        <span className="px-1.5 py-0.5 bg-surface border border-hairline text-teal text-[10px] rounded-[2px] uppercase">
                          Baseline
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-secondary">
                          {st.value < sensitivity.centre ? 'Strict' : 'Relaxed'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      {/* Honest Scientific Caveat */}
      <p className="text-[11px] font-sans text-text-secondary leading-relaxed pt-1">
        This shows how sensitive the result is to one threshold choice. It is not an accuracy measure against ground truth.
      </p>
    </div>
  );
}
