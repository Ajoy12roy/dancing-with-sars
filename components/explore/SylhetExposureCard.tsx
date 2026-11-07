'use client';

import { useState, useEffect, useId } from 'react';
import { Sparkles, Info } from 'lucide-react';
import { useAccessibility } from '@/context';
import type { SylhetExposureData, ExposureThresholdRow } from '@/lib/exposure';

interface SylhetExposureCardProps {
  initialData?: SylhetExposureData | null;
}

export function SylhetExposureCard({ initialData }: SylhetExposureCardProps) {
  const [data, setData] = useState<SylhetExposureData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const { emitEvent } = useAccessibility();
  const svgId = useId();

  useEffect(() => {
    if (initialData) return;
    let isMounted = true;
    fetch('/api/exposure/sylhet')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json: SylhetExposureData) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load exposure data');
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
        id="exposure"
        className="border border-hairline bg-surface p-6 rounded-[2px] animate-pulse scroll-mt-6"
        aria-label="Sylhet Exposure Analytics Loading"
      >
        <div className="h-6 w-1/3 bg-surface-2 rounded mb-4" />
        <div className="h-20 bg-surface-2 rounded mb-4" />
        <div className="h-40 bg-surface-2 rounded" />
      </section>
    );
  }

  if (error || !data) {
    return (
      <section
        id="exposure"
        className="border border-hairline bg-surface p-6 rounded-[2px] text-rust scroll-mt-6"
        aria-label="Sylhet Exposure Analytics Error"
      >
        <p className="text-sm font-sans">
          Unable to display exposure data: {error || 'Data unavailable'}
        </p>
      </section>
    );
  }

  const { min, default: def, max } = data.minDefaultMax;
  const defRounded = Math.round(def.estimatedPeopleInExtent / 1000) * 1000;
  const minRounded = Math.round(min.estimatedPeopleInExtent / 1000) * 1000;
  const maxRounded = Math.round(max.estimatedPeopleInExtent / 1000) * 1000;
  const aoiTotalPop = data.aoiTotalPopulation;
  const defSharePct = ((def.estimatedPeopleInExtent / aoiTotalPop) * 100).toFixed(1);
  const minSharePct = ((min.estimatedPeopleInExtent / aoiTotalPop) * 100).toFixed(1);
  const maxSharePct = ((max.estimatedPeopleInExtent / aoiTotalPop) * 100).toFixed(1);

  // SVG bar chart dimensions
  const chartHeight = 160;
  const chartWidth = 500;
  const margin = { top: 20, right: 20, bottom: 35, left: 65 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;
  const maxVal = 100000;
  const rows = data.perThresholdRows;
  const barWidth = innerWidth / (rows.length * 1.6);

  return (
    <section
      id="exposure"
      className="border border-hairline bg-surface p-6 rounded-[2px] space-y-6 scroll-mt-6"
      aria-labelledby="exposure-heading"
    >
      {/* ── a. Header Badges, Explain with Chiku, and Title ── */}
      <div className="space-y-2 border-b border-hairline pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-medium tracking-wider uppercase px-2 py-0.5 border border-hairline bg-surface-2 text-ink rounded-[2px]">
              Prototype, not validated
            </span>
            <span className="font-mono text-xs font-medium tracking-wider uppercase px-2 py-0.5 border border-hairline bg-surface-2 text-ink rounded-[2px]">
              Sentinel-1 C-band, 2022
            </span>
            <span className="font-mono text-xs font-medium tracking-wider uppercase px-2 py-0.5 border border-hairline bg-surface-2 text-text-secondary rounded-[2px]">
              WorldPop 2020 (CC BY 4.0)
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              emitEvent({
                type: 'exposure-view',
                message:
                  'Estimated people living inside the mapped new-water extent: prototype, not validated.',
                data: { exposure: data },
              });
            }}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-teal hover:text-ink border border-hairline hover:border-teal rounded-[2px] bg-surface hover:bg-surface-2 transition-colors focus:outline-2 focus:outline-teal focus:outline-offset-2 cursor-pointer"
            title="Listen to Chiku narration for Sylhet exposure estimate"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal" aria-hidden="true" />
            <span>Explain with Chiku</span>
          </button>
        </div>

        <h2
          id="exposure-heading"
          className="text-xl font-serif text-ink tracking-tight font-semibold"
        >
          Estimated people living inside the mapped new-water extent
        </h2>
        <p className="text-xs font-sans text-text-secondary">
          Areal demographic weighting across monitored study area ({data.aoiTotalAreaKm2.toFixed(2)} km², {aoiTotalPop.toLocaleString()} residents)
        </p>
      </div>

      {/* ── b. Headline Numbers & Population Share ── */}
      <div className="p-4 bg-surface-2 border border-hairline rounded-[2px] flex flex-col md:flex-row md:items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">
            Baseline Exposure (Threshold {def.thresholdDb.toFixed(1)} dB)
          </div>
          <div className="text-2xl md:text-3xl font-serif font-bold text-ink">
            about {defRounded.toLocaleString()}
            <span className="text-sm font-sans font-normal text-text-secondary ml-2">
              (range {minRounded.toLocaleString()} to {maxRounded.toLocaleString()})
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">
            Share of Monitored Study Area
          </div>
          <div className="text-lg font-serif font-semibold text-teal">
            {defSharePct}%
            <span className="text-xs font-sans font-normal text-text-secondary ml-1.5">
              (range {minSharePct}% to {maxSharePct}%)
            </span>
          </div>
        </div>
      </div>

      {/* ── c. Core Limitations & How to Read This (Visible by Default) ── */}
      <div className="space-y-3">
        <div className="border border-hairline bg-surface-2 p-3.5 rounded-[2px] text-xs font-sans text-ink space-y-2">
          <div className="font-mono font-semibold uppercase tracking-wider text-text-secondary">
            Core Limitations (Visible by Default)
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-ink leading-relaxed">
            <li>
              <strong className="text-ink">Estimate, not casualty count:</strong> This figure estimates how many people live inside the mapped water extent based on residential density—it is <span className="font-semibold text-rust">NOT a count of displaced, affected, or injured people</span>.
            </li>
            <li>
              <strong className="text-ink">2-year temporal mismatch:</strong> The population raster (WorldPop 2020) is from 2020; the flood analyzed occurred in 2022. Population will have grown or moved in those two years.
            </li>
            <li>
              <strong className="text-ink">Uniform cell distribution:</strong> The method assumes population is spread evenly inside each ~100 m grid cell (areal redistribution without local land-cover weighting).
            </li>
            <li>
              <strong className="text-ink">Radar threshold dependence:</strong> The result depends directly on the radar threshold: the default −16.0 dB indicates about 74,000 people, but across the sweep (−18.0 dB to −14.0 dB) the estimate spans 57,000 to 94,000 people.
            </li>
          </ul>
          <div className="pt-2 border-t border-hairline font-mono text-xs text-rust font-medium uppercase tracking-wider">
            Notice: Not for relief routing or casualty estimates.
          </div>
        </div>

        <details className="border border-hairline bg-surface p-3.5 rounded-[2px] text-xs font-sans text-text-secondary group">
          <summary className="font-mono font-medium text-ink cursor-pointer hover:text-teal select-none flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-text-secondary group-hover:text-teal" aria-hidden="true" />
              Technical pipeline details and references
            </span>
            <span className="text-text-secondary font-sans text-xs group-open:hidden">Show details</span>
            <span className="text-text-secondary font-sans text-xs hidden group-open:inline">Hide details</span>
          </summary>
          <div className="mt-3 pt-3 border-t border-hairline space-y-2 text-ink">
            <ul className="list-disc pl-5 space-y-1.5">
              {data.limitations.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>

      {/* ── d. Table and SVG Bar Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table Column */}
        <div className="lg:col-span-7 space-y-2">
          <div className="border border-hairline rounded-[2px] overflow-hidden">
            <table className="w-full text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-hairline text-left text-text-secondary font-mono">
                  <th className="py-2 px-3 font-medium">Threshold (dB)</th>
                  <th className="py-2 px-3 font-medium text-right">Area (km²)</th>
                  <th className="py-2 px-3 font-medium text-right">Estimated people</th>
                  <th className="py-2 px-3 font-medium text-right">Share (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((r: ExposureThresholdRow) => {
                  const isDefault = r.thresholdDb === def.thresholdDb;
                  return (
                    <tr
                      key={r.thresholdDb}
                      className={
                        isDefault
                          ? 'bg-teal/10 font-medium text-ink'
                          : 'hover:bg-surface-2/60 text-text-secondary'
                      }
                    >
                      <td className="py-2 px-3 font-mono">
                        {r.thresholdDb.toFixed(1)} dB {isDefault && <span className="text-teal font-sans text-[10px] uppercase ml-1">(default)</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-ink">
                        {r.pipelineAreaKm2.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-ink">
                        {r.estimatedPeopleInExtent.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {r.populationSharePct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-sans text-text-secondary italic">
            * Note: precision is not accuracy. Exact values reflect raw cell counts weighted by areal fractions.
          </p>
        </div>

        {/* SVG Bar Chart Column */}
        <div className="lg:col-span-5 border border-hairline bg-surface-2 p-3 rounded-[2px] space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-text-secondary">
            Estimated people by threshold
          </div>
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto max-h-[180px]"
              role="img"
              aria-labelledby={`${svgId}-title`}
            >
              <title id={`${svgId}-title`}>
                Bar chart of estimated people living inside mapped new-water extent across radar threshold sweep
              </title>

              {/* Grid Lines */}
              {[0, 25000, 50000, 75000, 100000].map((val) => {
                const y = margin.top + innerHeight - (val / maxVal) * innerHeight;
                return (
                  <g key={val}>
                    <line
                      x1={margin.left}
                      y1={y}
                      x2={chartWidth - margin.right}
                      y2={y}
                      stroke="var(--color-hairline)"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={margin.left - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="font-mono text-[9px] fill-current text-text-caption"
                    >
                      {val === 0 ? '0' : `${val / 1000}k`}
                    </text>
                  </g>
                );
              })}

              {/* Axis Label: Y-axis */}
              <text
                x={12}
                y={margin.top - 6}
                className="font-mono text-[9px] fill-current text-text-caption"
              >
                People
              </text>

              {/* Bars */}
              {rows.map((r, i) => {
                const isDefault = r.thresholdDb === def.thresholdDb;
                const barHeight = (r.estimatedPeopleInExtent / maxVal) * innerHeight;
                const x =
                  margin.left +
                  (i + 0.5) * (innerWidth / rows.length) -
                  barWidth / 2;
                const y = margin.top + innerHeight - barHeight;

                return (
                  <g key={r.thresholdDb}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={isDefault ? 'var(--color-teal)' : '#64748B'}
                      rx={1}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={margin.top + innerHeight + 14}
                      textAnchor="middle"
                      className="font-mono text-[9px] fill-current text-text-secondary"
                    >
                      {r.thresholdDb.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Axis Label: X-axis */}
              <text
                x={chartWidth / 2}
                y={chartHeight - 4}
                textAnchor="middle"
                className="font-mono text-[9px] fill-current text-text-caption"
              >
                Radar threshold (dB)
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* ── e. Per-Upazila Breakdown ── */}
      <div className="border border-hairline bg-surface-2 p-3.5 rounded-[2px] text-xs font-sans">
        {data.perUpazila && data.perUpazila.length > 0 ? (
          <div className="space-y-2">
            <div className="font-mono font-medium uppercase tracking-wider text-text-secondary">
              Relative exposure by administrative division
            </div>
            <table className="w-full text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-hairline text-left text-text-secondary font-mono">
                  <th className="py-1">Upazila</th>
                  <th className="py-1 text-right">Inside AOI (km²)</th>
                  <th className="py-1 text-right">Population</th>
                  <th className="py-1 text-right">Estimated people (default)</th>
                </tr>
              </thead>
              <tbody>
                {[...data.perUpazila]
                  .sort((a, b) => b.exposedDefault - a.exposedDefault)
                  .map((u) => (
                    <tr key={u.name} className="border-b border-hairline/50">
                      <td className="py-1 font-medium text-ink">{u.name}</td>
                      <td className="py-1 text-right font-mono">{u.areaKm2InsideAoi.toFixed(2)}</td>
                      <td className="py-1 text-right font-mono">{u.populationInsideAoi.toLocaleString()}</td>
                      <td className="py-1 text-right font-mono text-teal">{u.exposedDefault.toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-text-secondary">
            <span className="font-mono font-medium uppercase tracking-wider text-text-caption mr-2">
              Per-upazila breakdown:
            </span>
            not run (administrative boundaries not provided)
          </div>
        )}
      </div>

      {/* ── f. Attribution Line ── */}
      <div className="text-xs font-sans text-text-secondary border-t border-hairline pt-3 space-y-1">
        <p>
          <span className="font-mono font-medium uppercase text-text-caption mr-1.5">Population Source:</span>
          <a
            href={data.populationSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal hover:underline font-medium"
          >
            {data.populationSource.name} ({data.populationSource.year})
          </a>{' '}
          under {data.populationSource.licenceName}.
        </p>
        <p className="text-[11px] text-text-caption leading-relaxed italic">
          Citation: {data.populationSource.citation}{!data.populationSource.citation.includes('10.5258') ? ' https://dx.doi.org/10.5258/SOTON/WP00660' : ''}
        </p>
      </div>

      {/* ── g. What This Does Not Show Line ── */}
      <div className="p-3 bg-surface-2 border border-hairline rounded-[2px] text-xs font-sans text-text-secondary space-y-1">
        <p>
          <span className="font-mono font-semibold uppercase text-ink mr-2">
            What this does not show:
          </span>
          no information on shelters or where people moved, no road network access, and no injury records.
        </p>
        <p className="text-rust/90 font-medium text-[11px]">
          Not for relief routing or casualty estimates.
        </p>
      </div>
    </section>
  );
}
