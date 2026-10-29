'use client';

import type { CaseStudy } from '@/lib/case-studies';
import type { DateRange } from '@/types';
import { DataPanel } from '@/components/ui/DataPanel';

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
  dateBefore?: string;
  dateAfter?: string;
  beforeRange?: DateRange;
  afterRange?: DateRange;
}

export default function CaseStudyCard({
  caseStudy,
  dateBefore,
  dateAfter,
  beforeRange,
  afterRange,
}: CaseStudyCardProps) {
  // Normalize array or string for limitations and validation lists
  const limitationsList = Array.isArray(caseStudy.limitations)
    ? caseStudy.limitations
    : caseStudy.limitations
    ? [caseStudy.limitations]
    : [];

  const validationList = Array.isArray(caseStudy.validateAgainst)
    ? caseStudy.validateAgainst
    : caseStudy.validateAgainst
    ? [caseStudy.validateAgainst]
    : [];

  // Dates actually used from result.json (fallback to dateA / dateB if available)
  const actualBefore = dateBefore || caseStudy.dateA;
  const actualAfter = dateAfter || caseStudy.dateB;
  const actualDates = actualBefore && actualAfter ? `${actualBefore} → ${actualAfter}` : null;
  const effectiveBeforeRange = beforeRange || caseStudy.beforeRange;
  const effectiveAfterRange = afterRange || caseStudy.afterRange;

  const locationSubtitle = [caseStudy.location, caseStudy.country].filter(Boolean).join(', ');

  return (
    <DataPanel
      title={caseStudy.title}
      subtitle={locationSubtitle || undefined}
      rightSlot={
        <span className="text-xs font-data px-2.5 py-0.5 bg-surface-2 border border-hairline text-teal uppercase font-medium">
          {caseStudy.module.replace('-', ' ')}
        </span>
      }
      className="w-full"
    >
      <div className="space-y-4">
        {/* Summary */}
        {caseStudy.summary && (
          <p className="text-sm text-text-primary leading-relaxed font-sans">
            {caseStudy.summary}
          </p>
        )}

        {/* Visible Honesty Note (Steps 2b & 3b) */}
        {caseStudy.honestyNote && (
          <div className="p-3 bg-surface-2 border border-hairline rounded-[2px] text-xs font-sans text-ink flex items-start gap-2">
            <span className="text-teal font-semibold shrink-0 uppercase font-data text-[11px] mt-0.5">Note:</span>
            <span className="leading-relaxed">{caseStudy.honestyNote}</span>
          </div>
        )}

        {/* Causes & Impacts (only show if exists) */}
        {caseStudy.causesAndImpacts && (
          <div className="space-y-1 bg-surface-2 p-3 border border-hairline rounded-[2px]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary font-headline">
              Causes & Impacts
            </h4>
            <p className="text-xs text-text-primary leading-relaxed font-sans">
              {caseStudy.causesAndImpacts}
            </p>
          </div>
        )}

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-hairline text-xs">
          {/* Actual Observation Dates from result.json */}
          {actualDates && (
            <div>
              <span className="text-text-secondary block font-sans mb-0.5">Observation Dates (SAR):</span>
              {effectiveBeforeRange && effectiveAfterRange ? (
                <span className="font-data text-teal font-medium block">
                  Before: median of Sentinel-1 scenes, {effectiveBeforeRange.start} to {effectiveBeforeRange.end}
                  <br />
                  After: median of Sentinel-1 scenes, {effectiveAfterRange.start} to {effectiveAfterRange.end}
                </span>
              ) : (
                <span className="font-data text-teal font-medium block">
                  Reference date: {actualBefore} (median composite; full range not recorded)
                </span>
              )}
            </div>
          )}

          {/* Event Period */}
          {caseStudy.eventPeriod && (
            <div>
              <span className="text-text-secondary block font-sans mb-0.5">Event Period:</span>
              <span className="font-data text-text-primary">{caseStudy.eventPeriod}</span>
            </div>
          )}

          {/* Dataset Line (Requirement 1) */}
          <div>
            <span className="text-text-secondary block font-sans mb-0.5">Radar Dataset:</span>
            <span className="font-data text-text-primary">
              Sentinel-1 C-band SAR, GRD, VV via Google Earth Engine
            </span>
          </div>

          {/* Attribution Line */}
          {caseStudy.attribution && (
            <div>
              <span className="text-text-secondary block font-sans mb-0.5">Attribution:</span>
              <span className="text-text-secondary font-sans">{caseStudy.attribution}</span>
            </div>
          )}
        </div>

        {/* Limitations & Validate Against (only show if non-empty) */}
        {(limitationsList.length > 0 || validationList.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-hairline text-xs">
            {limitationsList.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5 font-headline">
                  Limitations
                </h4>
                <ul className="list-disc list-inside space-y-1 text-text-secondary font-sans leading-relaxed">
                  {limitationsList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationList.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5 font-headline">
                  Validate Against
                </h4>
                <ul className="list-disc list-inside space-y-1 text-text-secondary font-sans leading-relaxed">
                  {validationList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Short Note (Requirement 4) */}
        <div className="pt-3 border-t border-hairline flex items-center gap-2 text-xs font-sans text-text-secondary">
          <span className="text-rust font-semibold shrink-0">Note:</span>
          <span>SAR backscatter change is an indicator. Results are not an official assessment.</span>
        </div>
      </div>
    </DataPanel>
  );
}
