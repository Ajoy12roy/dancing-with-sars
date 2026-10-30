import type { ValidationData } from '@/lib/validation';
import { getAgreementSummary } from '@/lib/validation';

interface ValidationBlockProps {
  validation?: ValidationData | null;
}

export default function ValidationBlock({ validation }: ValidationBlockProps) {
  if (!validation) return null;

  const summaryText = getAgreementSummary(validation.metrics.iou, validation.referenceName);
  const iouPct = (validation.metrics.iou * 100).toFixed(1);
  const precisionPct = (validation.metrics.precision * 100).toFixed(1);
  const recallPct = (validation.metrics.recall * 100).toFixed(1);
  const isHigh = validation.metrics.iou >= 0.6;
  const isMod = validation.metrics.iou >= 0.3 && validation.metrics.iou < 0.6;

  return (
    <div className="border border-hairline rounded-[2px] bg-surface-2 p-3.5 space-y-3 text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
          <h4 className="font-semibold text-text-primary uppercase tracking-wider font-headline text-[11px]">
            Independent Comparison
          </h4>
        </div>
        <span
          className={`font-data text-[11px] px-2 py-0.5 rounded-[2px] font-medium border ${
            isHigh
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : isMod
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
              : 'bg-rust/10 border-rust/30 text-rust'
          }`}
        >
          {summaryText}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
        <div>
          <span className="text-text-secondary block mb-0.5">Reference Source:</span>
          <span className="text-text-primary font-medium block">
            {validation.referenceName}
          </span>
          <span className="text-text-secondary text-[11px] block">
            {validation.referenceSource} ({validation.referenceDate})
          </span>
        </div>

        <div>
          <span className="text-text-secondary block mb-0.5">Area Comparison:</span>
          <div className="font-data space-y-0.5">
            <div>
              <span className="text-text-secondary">Ours: </span>
              <span className="text-ink font-semibold">{validation.metrics.ourAreaKm2.toFixed(2)} km²</span>
            </div>
            <div>
              <span className="text-text-secondary">Ref: </span>
              <span className="text-ink font-semibold">{validation.metrics.referenceAreaKm2.toFixed(2)} km²</span>
            </div>
          </div>
        </div>

        <div>
          <span className="text-text-secondary block mb-0.5">Spatial Overlap:</span>
          <div className="font-data space-y-0.5">
            <div>
              <span className="text-text-secondary">Overlap: </span>
              <span className="text-teal font-semibold">{validation.metrics.overlapKm2.toFixed(2)} km²</span>
            </div>
            <div>
              <span className="text-text-secondary">IoU: </span>
              <span className="text-ink font-semibold">{iouPct}%</span>
            </div>
          </div>
        </div>

        <div>
          <span className="text-text-secondary block mb-0.5">Classification Rates:</span>
          <div className="font-data space-y-0.5">
            <div>
              <span className="text-text-secondary">Precision: </span>
              <span className="text-ink font-semibold">{precisionPct}%</span>
            </div>
            <div>
              <span className="text-text-secondary">Recall: </span>
              <span className="text-ink font-semibold">{recallPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes if present */}
      {validation.notes && validation.notes.length > 0 && (
        <div className="pt-2 border-t border-hairline">
          <ul className="list-disc list-inside space-y-1 text-text-secondary font-sans leading-relaxed text-[11px]">
            {validation.notes.map((note, idx) => (
              <li key={idx}>
                <span className="text-ink">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mandatory Honest Disclaimer */}
      <div className="pt-2 border-t border-hairline text-text-secondary font-sans text-[11px] italic flex items-center gap-1.5">
        <span className="text-rust font-normal">Notice:</span>
        <span>Agreement with another model or map is not proof of accuracy. Both are estimates.</span>
      </div>
    </div>
  );
}
