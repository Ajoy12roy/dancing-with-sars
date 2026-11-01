'use client';

import type { ChangeData } from '@/hooks/useChangeData';
import type { AreaOfInterest } from '@/types';
import type { CaseStudy } from '@/lib/case-studies';
import { useAccessibility } from '@/context';
import { getSensitivityClass, getSensitivityDelta, getSensitivityParameterLabel } from '@/lib/sensitivity';

interface MapTextSummaryProps {
  data: ChangeData;
  aoi?: AreaOfInterest | null;
  caseStudy?: CaseStudy | null;
}

export function MapTextSummary({ data, aoi, caseStudy }: MapTextSummaryProps) {
  const { emitEvent } = useAccessibility();
  const caseTitle = caseStudy?.title || aoi?.name || data.aoiId || 'Active Case';
  const modeLabel = caseStudy?.modeLabel || aoi?.mode || data.mode || 'SAR change';

  // Format dates / date ranges
  let dateText = 'Not specified';
  const beforeRange = data.beforeRange || caseStudy?.beforeRange;
  const afterRange = data.afterRange || caseStudy?.afterRange;

  if (beforeRange && afterRange) {
    dateText = `Baseline (${beforeRange.start} to ${beforeRange.end}) vs Post-event (${afterRange.start} to ${afterRange.end})`;
  } else if (data.dateBefore && data.dateAfter) {
    dateText = `Before (${data.dateBefore}) vs After (${data.dateAfter})`;
  } else if (beforeRange) {
    dateText = `Baseline range (${beforeRange.start} to ${beforeRange.end})`;
  }

  const headlineArea = data.affectedAreaKm2.toFixed(1);
  const headlinePercent = data.percentChanged.toFixed(1);

  // Sensitivity
  const sensitivity = data.sensitivity || caseStudy?.sensitivity;
  let sensitivityText = '';
  if (sensitivity) {
    const cls = getSensitivityClass(sensitivity);
    const delta = getSensitivityDelta(sensitivity);
    const deltaStr = delta % 1 === 0 ? delta.toFixed(0) : delta.toFixed(1);
    const paramLabel = getSensitivityParameterLabel(sensitivity.parameterName);
    const bracketLabel =
      cls === 'stable'
        ? 'Stable (<15% span)'
        : cls === 'moderate'
        ? 'Moderate (15–50% span)'
        : 'High (>50% span; indicative only)';
    sensitivityText = `${bracketLabel}: Spans ${sensitivity.minAreaKm2.toFixed(1)} to ${sensitivity.maxAreaKm2.toFixed(1)} km² when ${paramLabel} varies by ±${deltaStr} ${sensitivity.unit}.`;
  }

  // Reliability note
  const reliabilityNote = caseStudy?.honestyNote || data.honestyNote;

  return (
    <details
      className="mt-3 border border-hairline bg-surface p-3 text-xs text-ink rounded-[2px] group"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) {
          emitEvent({
            type: 'hint',
            message: 'This is a text description of the map.',
            data: { hintId: 'text-summary' },
          });
        }
      }}
    >
      <summary className="font-semibold text-ink cursor-pointer hover:text-teal focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2 flex items-center justify-between list-none">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-teal inline-block" />
          <span>Accessible Text Summary: {caseTitle} ({modeLabel})</span>
        </span>
        <span className="font-data text-[11px] text-text-secondary group-open:hidden">Show summary ▼</span>
        <span className="font-data text-[11px] text-text-secondary hidden group-open:inline">Hide summary ▲</span>
      </summary>
      <div className="mt-2.5 pt-2.5 border-t border-hairline space-y-1.5 font-sans text-xs text-text-secondary leading-relaxed">
        <p><strong className="text-ink">Case:</strong> {caseTitle} — <span className="capitalize">{modeLabel}</span> classification</p>
        <p><strong className="text-ink">Observation Period:</strong> {dateText}</p>
        <p><strong className="text-ink">Headline Affected Area:</strong> <span className="font-data text-ink font-semibold">{headlineArea} km²</span> ({headlinePercent}% of analysis frame)</p>
        {sensitivityText && (
          <p><strong className="text-ink">Sensitivity Bracket:</strong> {sensitivityText}</p>
        )}
        {reliabilityNote && (
          <p><strong className="text-ink">Reliability &amp; Honesty Notice:</strong> {reliabilityNote}</p>
        )}
      </div>
    </details>
  );
}
