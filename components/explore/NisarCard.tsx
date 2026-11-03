'use client';

import { useState, useEffect, useId } from 'react';
import Image from 'next/image';
import type { NisarTimeseriesData } from '@/lib/nisar';

interface NisarCardProps {
  initialData?: NisarTimeseriesData | null;
}

export function NisarCard({ initialData }: NisarCardProps) {
  const [data, setData] = useState<NisarTimeseriesData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [selectedThreshold, setSelectedThreshold] = useState<number>(-16);
  const svgId = useId();

  useEffect(() => {
    if (initialData) return;
    let isMounted = true;
    fetch('/api/nisar/timeseries')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json: NisarTimeseriesData) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load NISAR data');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [initialData]);

  if (loading) {
    return (
      <section
        id="nisar"
        className="border border-hairline bg-surface p-6 rounded-[2px] space-y-4 animate-pulse"
        aria-label="NASA NISAR L-band Analysis Loading"
      >
        <div className="h-6 bg-surface-2 w-48 rounded-[2px]" />
        <div className="h-4 bg-surface-2 w-96 rounded-[2px]" />
        <div className="h-64 bg-surface-2 w-full rounded-[2px]" />
      </section>
    );
  }

  if (error || !data) {
    return (
      <section
        id="nisar"
        className="border border-hairline bg-surface p-6 rounded-[2px]"
        aria-label="NASA NISAR L-band Analysis Error"
      >
        <p className="font-mono text-xs text-rust">
          Error loading NISAR dataset: {error || 'No data available'}
        </p>
      </section>
    );
  }

  const { crid, dataMaturity, polarization, window: win, records, referenceGridDb } = data;

  // SVG Chart Geometry
  const svgWidth = 720;
  const svgHeight = 320;
  const margin = { top: 24, right: 32, bottom: 48, left: 56 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const yMax = 105; // km2 (window is 104.86 km2)
  const yTicks = [0, 20, 40, 60, 80, 100];

  const getX = (index: number) => margin.left + (index / (records.length - 1)) * plotWidth;
  const getY = (valKm2: number) => margin.top + plotHeight - (valKm2 / yMax) * plotHeight;

  // Build line paths for each threshold across valid records, splitting at excluded indices
  const thresholdColors: Record<number, string> = {
    [-24]: '#94A3B8',
    [-22]: '#64748B',
    [-20]: '#0EA5E9',
    [-18]: '#0284C7',
    [-16]: '#2C5C61', // Display reference accent
    [-14]: '#0D9488',
    [-12]: '#059669',
    [-10]: '#16A34A',
  };

  const excludedRecordIndex = records.findIndex((r) => r.excluded);

  return (
    <section
      id="nisar"
      className="border border-hairline bg-surface p-6 rounded-[2px] space-y-6"
      aria-labelledby="nisar-heading"
    >
      {/* ── a. Header Badges and Subtitle ── */}
      <div className="space-y-2 border-b border-hairline pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-medium tracking-wider uppercase px-2 py-0.5 border border-hairline bg-surface-2 text-ink rounded-[2px]">
            NASA NISAR L-band
          </span>
          <span className="font-mono text-[11px] font-medium tracking-wider uppercase px-2 py-0.5 border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-[2px]">
            {dataMaturity}
          </span>
          <span className="font-mono text-[11px] font-medium px-2 py-0.5 border border-hairline bg-surface-2 text-text-secondary rounded-[2px]">
            CRID: {crid}
          </span>
          <span className="font-mono text-[11px] font-medium px-2 py-0.5 border border-hairline bg-surface-2 text-text-secondary rounded-[2px]">
            Pol: {polarization}
          </span>
        </div>
        <h2 id="nisar-heading" className="text-xl font-serif text-ink tracking-tight font-semibold">
          NISAR GCOV Time Series
        </h2>
        <p className="text-sm font-sans text-text-secondary">
          Low-backscatter area in a {win.windowAreaKm2.toFixed(2)} km² window (about{' '}
          {win.windowCoveragePercentageOfCaseBbox.toFixed(1)}% of the Hakaluki case area)
        </p>
      </div>

      {/* ── b. How to Read This ── */}
      <div className="border border-hairline bg-surface-2 p-3.5 rounded-[2px] text-xs font-sans text-ink leading-relaxed">
        <span className="font-mono font-semibold uppercase tracking-wider text-text-secondary mr-2">
          How to read this:
        </span>
        The area below a chosen backscatter threshold. No single threshold could be justified for this
        data, so results are shown for fixed thresholds. This is not a water map.
      </div>

      {/* ── c. Threshold-Grid Time Series (Plain SVG) ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-serif font-semibold text-ink">
              Multi-Threshold Distribution Across Dates
            </h3>
            <p className="text-xs font-sans text-text-secondary">
              Values differ by threshold. Click a threshold below to highlight its curve.
            </p>
          </div>

          {/* Threshold Selector */}
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="radiogroup"
            aria-label="Backscatter threshold selector"
          >
            {referenceGridDb.map((tDb) => {
              const isSelected = selectedThreshold === tDb;
              const isRef = tDb === -16;
              return (
                <button
                  key={tDb}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedThreshold(tDb)}
                  className={`font-mono text-xs px-2 py-1 rounded-[2px] border transition-colors ${
                    isSelected
                      ? 'border-teal bg-teal text-paper font-semibold'
                      : 'border-hairline bg-surface hover:bg-surface-2 text-ink'
                  }`}
                  title={isRef ? 'Display reference, not a recommendation' : `${tDb} dB`}
                >
                  {tDb} dB{isRef ? ' *' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] font-mono text-text-secondary">
          * -16 dB: display reference, not a recommendation
        </div>

        {/* SVG Container */}
        <div className="border border-hairline bg-surface-2 p-3 rounded-[2px] overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full max-w-full h-auto select-none"
            role="img"
            aria-label="SVG Chart displaying low-backscatter area (km²) across 10 repeat acquisitions for thresholds -24 dB to -10 dB. 2026-08-22 is marked excluded."
          >
            <defs>
              <pattern
                id={`${svgId}-hatch`}
                width="8"
                height="8"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" className="text-hairline" />
              </pattern>
            </defs>

            {/* Y-axis grid lines & labels */}
            {yTicks.map((tick) => {
              const y = getY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={svgWidth - margin.right}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray={tick === 0 ? undefined : '2,2'}
                    className="text-hairline"
                  />
                  <text
                    x={margin.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="font-mono text-[10px] fill-current text-text-secondary"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Y-axis Title */}
            <text
              transform={`rotate(-90)`}
              x={-(margin.top + plotHeight / 2)}
              y={16}
              textAnchor="middle"
              className="font-mono text-[11px] fill-current text-text-secondary"
            >
              Area (km²)
            </text>

            {/* Excluded Date Band (2026-08-22) */}
            {excludedRecordIndex >= 0 && (
              <g aria-label="Excluded date vertical indicator">
                <rect
                  x={getX(excludedRecordIndex) - 16}
                  y={margin.top}
                  width={32}
                  height={plotHeight}
                  fill={`url(#${svgId}-hatch)`}
                  opacity={0.4}
                />
                <line
                  x1={getX(excludedRecordIndex)}
                  y1={margin.top}
                  x2={getX(excludedRecordIndex)}
                  y2={margin.top + plotHeight}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  className="text-rust"
                />
                {/* Hollow exclusion marker */}
                <circle
                  cx={getX(excludedRecordIndex)}
                  cy={margin.top + plotHeight / 2}
                  r="7"
                  fill="var(--color-surface, #F1F0EC)"
                  stroke="var(--color-rust, #A8462E)"
                  strokeWidth="2"
                />
                <line
                  x1={getX(excludedRecordIndex) - 4}
                  y1={margin.top + plotHeight / 2 - 4}
                  x2={getX(excludedRecordIndex) + 4}
                  y2={margin.top + plotHeight / 2 + 4}
                  stroke="var(--color-rust, #A8462E)"
                  strokeWidth="1.5"
                />
                <line
                  x1={getX(excludedRecordIndex) - 4}
                  y1={margin.top + plotHeight / 2 + 4}
                  x2={getX(excludedRecordIndex) + 4}
                  y2={margin.top + plotHeight / 2 - 4}
                  stroke="var(--color-rust, #A8462E)"
                  strokeWidth="1.5"
                />
                <text
                  x={getX(excludedRecordIndex)}
                  y={margin.top + plotHeight / 2 - 12}
                  textAnchor="middle"
                  className="font-mono text-[9px] font-semibold fill-current text-rust"
                >
                  EXCLUDED
                </text>
              </g>
            )}

            {/* Threshold Lines (drawn strictly across valid dates, NOT connecting across excluded date) */}
            {referenceGridDb.map((tDb) => {
              const isSelected = selectedThreshold === tDb;
              const color = thresholdColors[tDb] || '#2C5C61';

              // Segment 1: indices before excluded index
              const seg1Records = records.slice(0, excludedRecordIndex);
              const path1 = seg1Records
                .map((r, i) => {
                  const item = r.referenceGrid.find((g) => g.thresholdDb === tDb);
                  const val = item ? item.lowBackscatterAreaKm2 : 0;
                  const x = getX(i);
                  const y = getY(val);
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ');

              // Segment 2: indices after excluded index
              const seg2Records = records.slice(excludedRecordIndex + 1);
              const path2 = seg2Records
                .map((r, i) => {
                  const globalIdx = excludedRecordIndex + 1 + i;
                  const item = r.referenceGrid.find((g) => g.thresholdDb === tDb);
                  const val = item ? item.lowBackscatterAreaKm2 : 0;
                  const x = getX(globalIdx);
                  const y = getY(val);
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ');

              return (
                <g key={tDb} opacity={isSelected ? 1 : 0.45}>
                  {path1 && (
                    <path
                      d={path1}
                      fill="none"
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 1.25}
                    />
                  )}
                  {path2 && (
                    <path
                      d={path2}
                      fill="none"
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 1.25}
                    />
                  )}

                  {/* Valid Data Points */}
                  {records.map((r, idx) => {
                    if (r.excluded) return null;
                    const item = r.referenceGrid.find((g) => g.thresholdDb === tDb);
                    const val = item ? item.lowBackscatterAreaKm2 : 0;
                    const cx = getX(idx);
                    const cy = getY(val);
                    return (
                      <circle
                        key={r.date}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 4 : 2.5}
                        fill={color}
                        stroke="var(--color-surface, #F1F0EC)"
                        strokeWidth={1}
                      >
                        <title>{`${r.date}: ${val.toFixed(2)} km² (${tDb} dB)`}</title>
                      </circle>
                    );
                  })}
                </g>
              );
            })}

            {/* X-axis ticks & date labels */}
            {records.map((r, idx) => {
              const x = getX(idx);
              const isExcluded = r.excluded;
              return (
                <g key={r.date}>
                  <line
                    x1={x}
                    y1={margin.top + plotHeight}
                    x2={x}
                    y2={margin.top + plotHeight + 5}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-hairline"
                  />
                  <text
                    x={x}
                    y={margin.top + plotHeight + 16}
                    textAnchor="middle"
                    className={`font-mono text-[9px] ${
                      isExcluded ? 'fill-current text-rust font-semibold' : 'fill-current text-text-secondary'
                    }`}
                  >
                    {r.date.slice(5)}
                  </text>
                  <text
                    x={x}
                    y={margin.top + plotHeight + 28}
                    textAnchor="middle"
                    className="font-mono text-[8px] fill-current text-text-secondary"
                  >
                    {r.date.slice(0, 4)}
                  </text>
                </g>
              );
            })}

            {/* X-axis Title */}
            <text
              x={margin.left + plotWidth / 2}
              y={svgHeight - 6}
              textAnchor="middle"
              className="font-mono text-[11px] fill-current text-text-secondary"
            >
              Acquisition Date (2026)
            </text>
          </svg>
        </div>

        {/* Accessibility Details Table */}
        <details className="text-xs font-sans text-ink border border-hairline bg-surface p-3 rounded-[2px]">
          <summary className="font-mono font-medium text-text-secondary cursor-pointer hover:text-ink">
            Accessible data table: Area (km²) per acquisition date by threshold
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-surface-2">
                  <th className="py-1.5 px-2">Date</th>
                  <th className="py-1.5 px-2">Status</th>
                  {referenceGridDb.map((t) => (
                    <th key={t} className="py-1.5 px-2 text-right">
                      {t} dB
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.date}
                    className={`border-b border-hairline ${
                      r.excluded ? 'bg-rust/5 text-rust' : 'hover:bg-surface-2'
                    }`}
                  >
                    <td className="py-1 px-2 font-semibold">{r.date}</td>
                    <td className="py-1 px-2">
                      {r.excluded ? 'EXCLUDED (Radiometric outlier)' : 'Included'}
                    </td>
                    {referenceGridDb.map((t) => {
                      const item = r.referenceGrid.find((g) => g.thresholdDb === t);
                      return (
                        <td key={t} className="py-1 px-2 text-right">
                          {r.excluded ? '—' : item ? item.lowBackscatterAreaKm2.toFixed(2) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {/* ── d. Compact Acquisition Table ── */}
      <div className="space-y-2">
        <h3 className="text-sm font-serif font-semibold text-ink">Repeat Acquisition Archive</h3>
        <div className="border border-hairline rounded-[2px] overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-surface-2 text-text-secondary">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Granule ID (Short)</th>
                <th className="py-2 px-3 text-right">Median HH (dB)</th>
                <th className="py-2 px-3 text-right">Valid Fraction</th>
                <th className="py-2 px-3">Status / Exclusion Rule</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const shortGranule = r.granuleId.length > 32
                  ? `${r.granuleId.slice(0, 16)}...${r.granuleId.slice(-12)}`
                  : r.granuleId;
                return (
                  <tr
                    key={r.date}
                    className={`border-b border-hairline ${
                      r.excluded
                        ? 'bg-rust/5 text-rust font-medium'
                        : 'hover:bg-surface-2 text-ink'
                    }`}
                  >
                    <td className="py-1.5 px-3 whitespace-nowrap">{r.date}</td>
                    <td className="py-1.5 px-3 font-mono text-[11px] text-text-secondary" title={r.granuleId}>
                      {shortGranule}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      {r.medianHhDb > 0 ? `+${r.medianHhDb.toFixed(2)}` : r.medianHhDb.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3 text-right">{(r.validFraction * 100).toFixed(1)}%</td>
                    <td className="py-1.5 px-3 text-[11px]">
                      {r.excluded ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold uppercase tracking-wider text-rust">
                            EXCLUDED: Radiometric outlier
                          </span>
                          <div className="text-[10px] text-rust/90">
                            Rule: |m_d - M| = 40.00 dB &gt; 2.62 dB; mean_corr = 0.279 &lt; 0.362. Cause not established.
                          </div>
                        </div>
                      ) : (
                        <span className="text-teal font-medium">Included</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── e. Preview PNGs + Excluded Placeholder Tile ── */}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-serif font-semibold text-ink">
            Raster Preview Gallery (512×512)
          </h3>
          <p className="text-xs font-sans text-text-secondary">
            Fixed stretch: -25 dB to 0 dB linear grayscale (0 = -25 dB, 255 = 0 dB). Bilinear downsampling from 1024×1024 (10m) to 512×512.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Tile 1: 2026-06-23 */}
          <div className="border border-hairline bg-surface-2 p-2 rounded-[2px] space-y-1.5">
            <div className="aspect-square bg-black overflow-hidden rounded-[1px] border border-hairline relative">
              <Image
                src="/nisar/hakaluki-haor/2026-06-23_HH_preview.png"
                alt="NISAR L-band HH preview 2026-06-23"
                width={512}
                height={512}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="font-mono text-[11px] text-ink font-semibold">2026-06-23</div>
            <div className="font-sans text-[10px] text-text-secondary leading-tight">
              First date: 68.59 km² (65.4%) at -16 dB
            </div>
          </div>

          {/* Tile 2: 2026-08-10 */}
          <div className="border border-hairline bg-surface-2 p-2 rounded-[2px] space-y-1.5">
            <div className="aspect-square bg-black overflow-hidden rounded-[1px] border border-hairline relative">
              <Image
                src="/nisar/hakaluki-haor/2026-08-10_HH_preview.png"
                alt="NISAR L-band HH preview 2026-08-10"
                width={512}
                height={512}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="font-mono text-[11px] text-ink font-semibold">2026-08-10</div>
            <div className="font-sans text-[10px] text-text-secondary leading-tight">
              Intermediate high: 66.74 km² (63.7%) at -16 dB
            </div>
          </div>

          {/* Tile 3: 2026-08-22 (EXCLUDED TILE) */}
          <div className="border border-rust/40 bg-rust/5 p-2 rounded-[2px] space-y-1.5 flex flex-col justify-between">
            <div className="aspect-square bg-surface border border-dashed border-rust/60 rounded-[1px] flex flex-col items-center justify-center p-3 text-center">
              <span className="font-mono text-xs font-bold text-rust tracking-wider uppercase">
                EXCLUDED
              </span>
              <span className="font-mono text-[10px] text-rust mt-1">
                2026-08-22
              </span>
              <span className="font-sans text-[9px] text-text-secondary mt-2">
                No raster generated
              </span>
            </div>
            <div>
              <div className="font-mono text-[11px] text-rust font-semibold">2026-08-22 (Excluded)</div>
              <div className="font-sans text-[10px] text-rust/90 leading-tight">
                Radiometric outlier (|m_d - M| = 40.00 dB). Cause not established.
              </div>
            </div>
          </div>

          {/* Tile 4: 2026-10-09 */}
          <div className="border border-hairline bg-surface-2 p-2 rounded-[2px] space-y-1.5">
            <div className="aspect-square bg-black overflow-hidden rounded-[1px] border border-hairline relative">
              <Image
                src="/nisar/hakaluki-haor/2026-10-09_HH_preview.png"
                alt="NISAR L-band HH preview 2026-10-09"
                width={512}
                height={512}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="font-mono text-[11px] text-ink font-semibold">2026-10-09</div>
            <div className="font-sans text-[10px] text-text-secondary leading-tight">
              Intermediate low: 46.12 km² (44.0%) at -16 dB
            </div>
          </div>

          {/* Tile 5: 2026-10-21 */}
          <div className="border border-hairline bg-surface-2 p-2 rounded-[2px] space-y-1.5">
            <div className="aspect-square bg-black overflow-hidden rounded-[1px] border border-hairline relative">
              <Image
                src="/nisar/hakaluki-haor/2026-10-21_HH_preview.png"
                alt="NISAR L-band HH preview 2026-10-21"
                width={512}
                height={512}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="font-mono text-[11px] text-ink font-semibold">2026-10-21</div>
            <div className="font-sans text-[10px] text-text-secondary leading-tight">
              Last date: 39.61 km² (37.8%) at -16 dB
            </div>
          </div>
        </div>
      </div>

      {/* ── f. Data-Gap Note ── */}
      <div className="border-l-2 border-hairline pl-3 py-1 font-sans text-xs text-text-secondary leading-relaxed">
        <span className="font-mono font-semibold text-ink mr-1">Data gap note:</span>
        No acquisition on 2026-07-29 (nominal cycle 026). A documented permanent instrument data gap occurred
        between 2026-07-27T22:03:25Z and 2026-08-10T00:55:27Z (source: nisar-docs availability-overview).
        The granule was not downlinked by the spacecraft.
      </div>

      {/* ── g. Limitations Details ── */}
      <details className="border border-hairline bg-surface-2 p-3.5 rounded-[2px] text-xs font-sans text-ink space-y-2">
        <summary className="font-mono font-medium text-text-secondary cursor-pointer hover:text-ink">
          Data limitations and methodological constraints
        </summary>
        <ul className="mt-3 space-y-2 list-disc list-inside text-text-secondary leading-relaxed">
          <li>
            <strong className="text-ink">Data maturity:</strong> PROVISIONAL release (CRID {crid});
            forward reprocessing is planned by the NASA/ISRO Science Data System.
          </li>
          <li>
            <strong className="text-ink">Single geometry:</strong> Ascending pass only (Track 141, Frame 014,
            Mode 4005). Descending geometries are not analyzed here.
          </li>
          <li>
            <strong className="text-ink">Polarization:</strong> HH polarization only. Dual-pol HV channels
            exhibit different backscatter dynamics and remain uncalibrated.
          </li>
          <li>
            <strong className="text-ink">Spatial coverage:</strong> The 1024×1024 pixel window (104.86 km²)
            covers approximately 32.4% of the Hakaluki case bounding box (NW quadrant) and is not directly
            comparable with the C-band Hakaluki case extent (321.14 km²).
          </li>
          <li>
            <strong className="text-ink">Threshold selection:</strong> Thresholds are not calibrated. The
            pooled HH backscatter histogram failed the pre-declared bimodality rule (valley ratio 0.7027 &gt; 0.60);
            no single threshold is scientifically justified.
          </li>
          <li>
            <strong className="text-ink">Classification ambiguity:</strong> Low-backscatter area at L-band
            can encompass wet vegetation, saturated soil, and agricultural fields in addition to standing water.
          </li>
          <li>
            <strong className="text-ink">Independent ground validation:</strong> No ground reference or
            coincident in-situ data was available during this analysis.
          </li>
        </ul>
      </details>

      {/* ── What This Could Mean (Hypotheses & Future Uses) ── */}
      <details className="border border-hairline bg-surface-2 p-3.5 rounded-[2px] text-xs font-sans text-ink space-y-3">
        <summary className="font-mono font-medium text-text-secondary cursor-pointer hover:text-ink">
          What this could mean: hypotheses and future uses
        </summary>
        <div className="mt-3 space-y-4">
          {/* Block 1: Possible drivers */}
          <div className="space-y-1.5">
            <h4 className="font-serif font-semibold text-ink text-xs">
              Possible drivers (Hypothesis (not tested))
            </h4>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              L-band radar backscatter (~24 cm wavelength) is physically sensitive to several environmental variables documented in the ASF NISAR User Guide (https://nisar-docs.asf.alaska.edu/gcov/):
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-secondary text-[11px] leading-relaxed">
              <li>
                <strong className="text-ink">Surface roughness:</strong> Specular reflections over smooth terrain divert radar pulses away from the receiver (resulting in lower backscatter), while rougher surfaces cause diffuse scattering back to the sensor.
              </li>
              <li>
                <strong className="text-ink">Dielectric constant and moisture:</strong> Variations in soil moisture and wetness saturation alter the dielectric properties of the surface, directly shifting backscatter intensity.
              </li>
              <li>
                <strong className="text-ink">Vegetation structure:</strong> The long L-band wavelength penetrates foliage canopies to interact with branches and vertical stems via volume scattering and double-bounce reflection.
              </li>
              <li>
                <strong className="text-ink">Polarization differences:</strong> Co-polarized HH is responsive to horizontal structures and specular surface reflections, whereas cross-polarized HV is dominated by volume scattering from vegetation.
              </li>
            </ul>
            <p className="font-mono text-[10px] text-text-secondary mt-1">
              None of these were tested against ground data.
            </p>
          </div>

          {/* Block 2: Possible future uses of NISAR */}
          <div className="space-y-1.5 border-t border-hairline pt-3">
            <h4 className="font-serif font-semibold text-ink text-xs">
              Possible future uses of NISAR
            </h4>
            <ul className="list-disc list-inside space-y-1 text-text-secondary text-[11px] leading-relaxed">
              <li>
                <strong className="text-ink">Wetlands and floodplains monitoring:</strong> Continuous mapping of inundation dynamics beneath dense vegetation canopies across large wetland systems (possible application, not demonstrated here).
              </li>
              <li>
                <strong className="text-ink">Forest change:</strong> Tracking canopy structure variations, disturbance, and biomass dynamics (possible application, not demonstrated here).
              </li>
              <li>
                <strong className="text-ink">Agriculture and soil moisture:</strong> Monitoring crop growth cycles and field moisture status (possible application, not demonstrated here).
              </li>
              <li>
                <strong className="text-ink">Ground deformation:</strong> Measuring millimeter-scale land subsidence and tectonic displacement with repeat-pass interferometry (possible application, not demonstrated here).
              </li>
            </ul>
          </div>

          {/* Block 3: Next steps */}
          <div className="border-t border-hairline pt-2 text-[11px] text-text-secondary leading-relaxed">
            <strong className="text-ink">Next steps:</strong> independent validation (for example comparison with the NASA OPERA surface water product and optical imagery), threshold calibration, reprocessed (non-provisional) NISAR data.
          </div>
        </div>
      </details>
    </section>
  );
}

export default NisarCard;
