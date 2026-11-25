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

  return (
    <div className="col-span-12 border border-hairline bg-surface px-4 py-2.5 rounded-[2px] flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
        <h2 className="text-base sm:text-lg font-headline font-semibold text-text-primary truncate">
          {title}
        </h2>
        <span className="text-hairline" aria-hidden="true">|</span>
        <span className="text-xs font-data text-teal font-medium shrink-0">
          {modeLabel}
        </span>
      </div>
      <button
        type="button"
        onClick={onBackToMap}
        className="px-3 py-1.5 text-xs font-medium border border-hairline text-ink hover:border-ink rounded-[2px] transition-colors cursor-pointer bg-surface-2 shrink-0 flex items-center gap-1.5"
      >
        <span aria-hidden="true">&uarr;</span>
        <span>{LIVE_RESULT_COPY.backToMap}</span>
      </button>
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
