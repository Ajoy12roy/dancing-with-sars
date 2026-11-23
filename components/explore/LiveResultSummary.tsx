'use client';

import type { ChangeData } from '@/hooks/useChangeData';
import {
  LIVE_RESULT_COPY,
  getLiveModeLabel,
  generateLiveResultSummary,
} from '@/lib/live-result-copy';

interface LiveResultHeaderProps {
  data: ChangeData;
  onBackToMap: () => void;
}

export function LiveResultHeader({ data, onBackToMap }: LiveResultHeaderProps) {
  const title = data.name || 'Custom Area Analysis';
  const modeLabel = getLiveModeLabel(data.mode);

  // Before & After window dates: prioritize provenance, then dates, then dateBefore/dateAfter
  const beforeStart = data.provenance?.beforeDates?.[0] || data.dates?.a || data.dateBefore;
  const beforeEnd = data.provenance?.beforeDates?.[1] || data.dates?.a || data.dateBefore;
  const beforeText = beforeStart && beforeEnd && beforeStart !== beforeEnd
    ? `${beforeStart} to ${beforeEnd}`
    : beforeStart || 'Not specified';

  const afterStart = data.provenance?.afterDates?.[0] || data.dates?.b || data.dateAfter;
  const afterEnd = data.provenance?.afterDates?.[1] || data.dates?.b || data.dateAfter;
  const afterText = afterStart && afterEnd && afterStart !== afterEnd
    ? `${afterStart} to ${afterEnd}`
    : afterStart || 'Not specified';

  return (
    <div className="col-span-12 border border-hairline bg-surface p-4 sm:p-5 rounded-[2px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-hairline">
        <div>
          <span className="text-[11px] font-data uppercase tracking-wider text-teal block mb-1">
            Live Analysis Result
          </span>
          <h2 className="text-xl sm:text-2xl font-headline font-semibold text-text-primary">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onBackToMap}
          className="self-start sm:self-center px-3.5 py-2 text-xs font-medium border border-hairline text-ink hover:border-ink rounded-[2px] transition-colors cursor-pointer bg-surface-2 shrink-0 flex items-center gap-1.5"
        >
          <span>&uarr;</span>
          <span>{LIVE_RESULT_COPY.backToMap}</span>
        </button>
      </div>

      <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-sans text-text-secondary">
        <div>
          <span className="text-text-caption font-medium">{LIVE_RESULT_COPY.analysisModePrefix}</span>{' '}
          <span className="text-text-primary font-medium">{modeLabel}</span>
        </div>
        <div>
          <span className="text-text-caption font-medium">{LIVE_RESULT_COPY.beforeWindowPrefix}</span>{' '}
          <span className="font-data text-text-primary">{beforeText}</span>
        </div>
        <div>
          <span className="text-text-caption font-medium">{LIVE_RESULT_COPY.afterWindowPrefix}</span>{' '}
          <span className="font-data text-text-primary">{afterText}</span>
        </div>
        {typeof data.totalAreaKm2 === 'number' && (
          <div>
            <span className="text-text-caption font-medium">{LIVE_RESULT_COPY.areaFootprintPrefix}</span>{' '}
            <span className="font-data text-text-primary">{data.totalAreaKm2.toFixed(2)} km²</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface LiveResultSummaryProps {
  data: ChangeData;
}

export function LiveResultSummary({ data }: LiveResultSummaryProps) {
  const content = generateLiveResultSummary(data);

  return (
    <div className="col-span-12 border border-hairline bg-surface p-5 sm:p-6 rounded-[2px] space-y-4">
      {/* Card Title */}
      <div className="flex items-center gap-2 border-b border-hairline pb-3">
        <span className="w-2.5 h-2.5 bg-teal inline-block shrink-0" aria-hidden="true" />
        <h3 className="text-base sm:text-lg font-headline font-semibold text-text-primary">
          {LIVE_RESULT_COPY.cardTitle}
        </h3>
      </div>

      {/* Main explanation sentence */}
      <div className="space-y-2">
        <p className="text-sm font-sans text-text-primary leading-relaxed">
          {content.headlineSentence}
        </p>
        {content.secondarySentence && (
          <p className="text-sm font-sans text-text-secondary leading-relaxed">
            {content.secondarySentence}
          </p>
        )}
      </div>

      {/* Tiny before-vs-after category comparison: rendered ONLY if both values exist in data */}
      {content.categoryComparison && content.categoryComparison.length > 0 && (
        <div className="p-3 bg-surface-2 border border-hairline rounded-[2px] space-y-2">
          <div className="text-xs font-semibold font-headline text-text-primary">
            {LIVE_RESULT_COPY.categoryComparisonTitle}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
            {content.categoryComparison.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                <span className="text-text-secondary text-[11px]">{item.label}</span>
                <span className="font-data font-semibold text-teal text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence text (if present) */}
      {content.confidenceText && (
        <div className="text-xs font-data text-text-secondary">
          {content.confidenceText}
        </div>
      )}

      {/* Warnings (if present) */}
      {content.warnings.length > 0 && (
        <div className="p-3 bg-surface-2 border border-hairline rounded-[2px] space-y-1 text-xs font-sans text-text-secondary">
          {content.warnings.map((w, idx) => (
            <p key={idx}>
              <strong className="text-text-primary">{LIVE_RESULT_COPY.noticePrefix}</strong> {w}
            </p>
          ))}
        </div>
      )}

      {/* How to read this */}
      <div className="pt-3 border-t border-hairline space-y-1">
        <div className="text-xs font-semibold font-headline text-text-primary">
          {content.howToReadTitle}
        </div>
        <p className="text-xs font-sans text-text-secondary leading-relaxed">
          {content.howToReadText}
        </p>
      </div>
    </div>
  );
}

export default LiveResultSummary;
