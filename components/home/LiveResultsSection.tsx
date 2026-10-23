'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

interface DemoResult {
  id: string;
  name: string;
  modeLabel: string;
  mode: string;
  location: string;
  dateRange: string;
  days: number;
  primaryStatLabel: string;
  primaryStatValue: string;
  primaryStatUnit: string;
  totalAreaKm2: number;
  stats: { label: string; value: string }[];
  href: string;
}

const DEMO_AREAS: DemoResult[] = [
  {
    id: 'sylhet',
    name: 'Sylhet Basin',
    location: 'Surma-Kushiyara Floodplain, Bangladesh',
    modeLabel: 'Flood Inundation',
    mode: 'flood',
    dateRange: '2022-05-01 → 2022-06-21',
    days: 51,
    primaryStatLabel: 'Flooded Area',
    primaryStatValue: '37.19',
    primaryStatUnit: 'km²',
    totalAreaKm2: 218.1,
    stats: [
      { label: 'Proportion of Scene', value: '17.05%' },
      { label: 'Persistent Water', value: '2.82 km²' },
      { label: 'Receded Water', value: '0.34 km²' },
      { label: 'Signal Strength', value: '100.0%' },
    ],
    href: '/explore?mode=flood',
  },
  {
    id: 'jamuna',
    name: 'Jamuna River',
    location: 'Braided Channel Belt, Bangladesh',
    modeLabel: 'River Bank Erosion',
    mode: 'river-erosion',
    dateRange: '2019-02-15 → 2024-02-15',
    days: 1826,
    primaryStatLabel: 'Erosion Area',
    primaryStatValue: '47.59',
    primaryStatUnit: 'km²',
    totalAreaKm2: 842.38,
    stats: [
      { label: 'Accretion / Deposition', value: '42.38 km²' },
      { label: 'Net Land Balance', value: '-5.21 km²' },
      { label: 'Erosion Rate', value: '9.52 km²/yr' },
      { label: 'Active River Channel', value: '64.95 km²' },
    ],
    href: '/explore?mode=river-erosion',
  },
  {
    id: 'amazon',
    name: 'Amazon Basin',
    location: 'Rondônia, Brazil',
    modeLabel: 'Deforestation',
    mode: 'deforestation',
    dateRange: '2021-01-01 → 2023-01-01',
    days: 730,
    primaryStatLabel: 'Canopy Loss',
    primaryStatValue: '0.62',
    primaryStatUnit: 'km²',
    totalAreaKm2: 485.21,
    stats: [
      { label: 'Proportion of Scene', value: '0.13%' },
      { label: 'Decline Threshold', value: '≤ -3.0 dB' },
      { label: 'Observation Period', value: '730 days' },
      { label: 'Analyzed Footprint', value: '485.21 km²' },
    ],
    href: '/explore?mode=deforestation',
  },
  {
    id: 'tanguar',
    name: 'Tanguar Haor',
    location: 'Ramsar Wetland Complex, Bangladesh',
    modeLabel: 'Surface Water',
    mode: 'surface-water',
    dateRange: '2023-02-15 → 2023-08-15',
    days: 181,
    primaryStatLabel: 'New Water Area',
    primaryStatValue: '262.60',
    primaryStatUnit: 'km²',
    totalAreaKm2: 418.4,
    stats: [
      { label: 'Seasonal Expansion', value: '+728.87%' },
      { label: 'Dry Baseline Water', value: '35.99 km²' },
      { label: 'Monsoon Peak Water', value: '298.31 km²' },
      { label: 'Persistent Core Water', value: '35.71 km²' },
    ],
    href: '/explore?mode=surface-water',
  },
];

export function LiveResultsSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={shouldReduceMotion ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: 'easeOut' },
        },
      }}
      className="py-20 border-t border-(--color-hairline)"
    >
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-8">
        <div>
          <span className="block text-xs text-(--color-text-caption) font-data tracking-wider uppercase mb-1">
            Precomputed Sentinel-1 Benchmark Observations
          </span>
          <h2 className="text-2xl md:text-3xl font-headline font-semibold text-(--color-text-primary) leading-snug">
            Live results from the demo areas
          </h2>
        </div>
        <p className="text-xs font-data text-(--color-text-secondary) max-w-sm">
          Strictly verified quantities read from committed <code className="text-(--color-ink)">result.json</code> telemetry files
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DEMO_AREAS.map((demo) => (
          <div
            key={demo.id}
            className="border border-(--color-hairline) p-6 bg-(--color-paper) rounded-[2px] flex flex-col justify-between hover:border-(--color-teal) transition-colors duration-150"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-(--color-hairline) mb-4">
                <div>
                  <span className="text-[11px] font-data text-(--color-text-caption) uppercase block">
                    {demo.modeLabel}
                  </span>
                  <h3 className="text-lg font-headline font-semibold text-(--color-text-primary)">
                    {demo.name}
                  </h3>
                </div>
                <span className="text-xs font-data text-(--color-text-secondary) bg-(--color-paper-warm) px-2 py-0.5 border border-(--color-hairline) rounded-[1px]">
                  {demo.days}d baseline
                </span>
              </div>

              <div className="text-xs text-(--color-text-secondary) mb-5">
                {demo.location}
              </div>

              {/* Primary Metric Banner */}
              <div className="bg-(--color-paper-warm) border border-(--color-hairline) p-4 rounded-[2px] mb-5">
                <div className="text-xs font-sans text-(--color-text-secondary) mb-1">
                  {demo.primaryStatLabel}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-data font-semibold text-(--color-teal) tracking-tight">
                    {demo.primaryStatValue}
                  </span>
                  <span className="text-sm font-data text-(--color-text-secondary)">
                    {demo.primaryStatUnit}
                  </span>
                  <span className="text-xs font-data text-(--color-text-caption) ml-auto">
                    of {demo.totalAreaKm2} km² scene
                  </span>
                </div>
              </div>

              {/* Secondary Telemetry Table */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs pb-4 border-b border-(--color-hairline)">
                {demo.stats.map((st) => (
                  <div key={st.label} className="flex flex-col">
                    <span className="text-[11px] text-(--color-text-secondary)">{st.label}</span>
                    <span className="font-data font-medium text-(--color-teal)">{st.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer with observation dates and direct explore link */}
            <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-data text-[11px] text-(--color-text-caption)">
                Dates: {demo.dateRange}
              </span>
              <Link
                href={demo.href}
                className="font-sans font-medium text-(--color-teal) hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                Inspect scene in viewer &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
