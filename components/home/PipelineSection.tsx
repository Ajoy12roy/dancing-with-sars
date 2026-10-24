'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

const STEPS = [
  {
    step: '01',
    name: 'GeoTIFF Ingestion & Calibration',
    codeRef: 'rasterio & affine',
    summary:
      'Reads paired Sentinel-1 or NISAR GeoTIFFs (image_a.tif and image_b.tif), extracts coordinate reference systems and affine matrices, and converts raw linear amplitude to calibrated decibels (dB) when needed.',
  },
  {
    step: '02',
    name: 'Speckle Filtering & Differencing',
    codeRef: 'scipy.ndimage & numpy',
    summary:
      'Suppresses multiplicative granular speckle noise using spatial window filtering (5x5 kernel), then computes the log-ratio backscatter difference: ΔdB = Scene_B − Scene_A.',
  },
  {
    step: '03',
    name: 'Classification & Area in km²',
    codeRef: 'morphological filtering',
    summary:
      'Applies physical thresholds (e.g. ≤ −16 dB for specular water, ≤ −3 dB for canopy loss). Filters isolated noise clusters (< 20 pixels) and multiplies pixel counts by ground resolution into exact km².',
  },
  {
    step: '04',
    name: 'Synthesis & AI Explanation',
    codeRef: 'deterministic + LLM',
    summary:
      'Outputs transparent PNG overlays and structured result.json. Renders dual-mode cartography and generates plain-language environmental interpretations (offline deterministic summary or Gemini narration).',
  },
];

export function PipelineSection() {
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
      className="py-16 border-t border-hairline"
    >
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-8">
        <div>
          <span className="block text-xs text-text-caption font-data tracking-wider uppercase mb-1">
            Deterministic Processing Architecture
          </span>
          <h2 className="text-2xl md:text-3xl font-headline font-semibold text-text-primary leading-snug">
            From radar scene to answer
          </h2>
        </div>
        <Link
          href="/how-it-works"
          className="text-xs font-sans font-medium text-teal hover:underline flex items-center gap-1 shrink-0"
        >
          Read complete technical methodology &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map((s, idx) => (
          <div
            key={s.step}
            className="border border-hairline p-5 bg-surface rounded-[2px] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-hairline mb-3">
                <span className="font-data text-xs text-teal font-semibold">
                  STEP {s.step}
                </span>
                <span className="text-[11px] font-data text-text-caption">
                  {idx < 3 ? 'Stage →' : 'Final'}
                </span>
              </div>

              <h3 className="text-base font-headline font-semibold text-text-primary mb-2">
                {s.name}
              </h3>

              <p className="text-xs text-text-secondary leading-relaxed mb-4">
                {s.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-hairline text-[11px] font-data text-text-caption">
              Stack: <span className="text-ink">{s.codeRef}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
