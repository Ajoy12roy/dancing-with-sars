'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

const HAZARDS = [
  {
    id: 'flood',
    title: 'Flood Inundation',
    mode: 'flood',
    kicker: 'Sudden Inundation',
    description:
      'Detects newly submerged terrestrial surfaces where specular water reflection replaces rough land scattering.',
    href: '/explore?mode=flood',
    metricsSummary: 'Specular threshold &le; &minus;16.0 dB &bull; Inundated area (km&sup2;)',
  },
  {
    id: 'river-erosion',
    title: 'River Erosion',
    mode: 'river-erosion',
    kicker: 'Channel Migration',
    description:
      'Tracks multi-year shoreline shifts and channel migration along dynamic braided rivers by analyzing accretion and land loss.',
    href: '/explore?mode=river-erosion',
    metricsSummary: 'Buffered channel corridor &bull; Net land balance &bull; Erosion rate (km&sup2;/yr)',
  },
  {
    id: 'deforestation',
    title: 'Deforestation',
    mode: 'deforestation',
    kicker: 'Canopy Loss',
    description:
      'Identifies forest clearing and canopy loss by flagging significant declines in volumetric radar backscatter.',
    href: '/explore?mode=deforestation',
    metricsSummary: 'Backscatter decline threshold &le; &minus;3.0 dB &bull; Canopy clearing footprint',
  },
  {
    id: 'surface-water',
    title: 'Surface Water',
    mode: 'surface-water',
    kicker: 'Hydrological Cycles',
    description:
      'Quantifies seasonal wetland expansion, water body replenishment, and dry-season reservoir contraction.',
    href: '/explore?mode=surface-water',
    metricsSummary: 'Baseline vs. peak water area &bull; Expansion delta percentage',
  },
];

export function HazardsSection() {
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
            Standardized Remote Sensing Framework
          </span>
          <h2 className="text-2xl md:text-3xl font-headline font-semibold text-(--color-text-primary) leading-snug">
            Four hazards, one workflow
          </h2>
        </div>
        <p className="text-xs font-data text-(--color-text-secondary) max-w-sm">
          A single deterministic pipeline parameterized for four distinct earth surface transformations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {HAZARDS.map((h, idx) => (
          <div
            key={h.id}
            className="border border-(--color-hairline) p-5 bg-(--color-paper) rounded-[2px] flex flex-col justify-between hover:border-(--color-teal) transition-colors duration-150"
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-(--color-hairline) mb-3">
                <span className="text-[11px] font-data text-(--color-text-caption) uppercase">
                  MODE 0{idx + 1}
                </span>
                <span className="text-[11px] font-data text-(--color-teal) font-medium">
                  {h.kicker}
                </span>
              </div>

              <h3 className="text-base font-headline font-semibold text-(--color-text-primary) mb-2">
                {h.title}
              </h3>

              <p className="text-xs text-(--color-text-secondary) leading-relaxed mb-4">
                {h.description}
              </p>
            </div>

            <div className="pt-3 border-t border-(--color-hairline) flex items-center justify-between">
              <span className="text-[11px] font-data text-(--color-text-caption)">
                ?mode={h.mode}
              </span>
              <Link
                href={h.href}
                className="text-xs font-sans font-medium text-(--color-teal) hover:underline flex items-center gap-1"
              >
                Explore mode &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
