'use client';

import { motion, useReducedMotion } from 'framer-motion';

const OFFLINE_FEATURES = [
  {
    num: '01',
    title: 'Offline Radar Basemap',
    technicalTag: 'Zero Tile Server Calls',
    summary:
      'Defaults to a neutral survey background with local SAR backscatter raster overlays, an SVG graticule, and a metric scale bar.',
    details:
      'Fully functional without an internet connection. Coordinates and scale indicators render client-side without calling third-party map tile servers.',
  },
  {
    num: '02',
    title: 'Self-Hosted Fonts & Map Assets',
    technicalTag: 'Zero CDN Dependencies',
    summary:
      'Typography and map assets are self-hosted with zero external CDN dependencies.',
    details:
      'Typography (Source Serif 4, Public Sans, IBM Plex Mono) is bundled locally via next/font/local. All Leaflet marker icons, layer graphics, and styles are served directly from public/leaflet/.',
  },
  {
    num: '03',
    title: 'Local Python Service Processing',
    technicalTag: 'Local Workstation Execution',
    summary:
      'Offline processing applies to local builds; hosted deployments serve precomputed cases directly.',
    details:
      'On hosted sites, precomputed cases are served directly from the server. In local builds, rasters are processed locally using Python, rasterio, numpy, and scipy without external network requests.',
  },
  {
    num: '04',
    title: 'Deterministic Fallback Insights',
    technicalTag: 'Zero API Key Required',
    summary:
      'Analytical summaries generate deterministically when no API key is configured or when offline.',
    details:
      'When GEMINI_API_KEY is not configured, the narrative panel automatically synthesizes deterministic analytical summaries directly from the computed metrics.',
  },
];

export function OfflineArchitectureSection() {
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
            Resilient Field Operations
          </span>
          <h2 className="text-2xl md:text-3xl font-headline font-semibold text-text-primary leading-snug">
            Built to work offline
          </h2>
        </div>
        <p className="text-xs font-data text-text-secondary max-w-sm">
          Engineered for disaster response teams and field stations with intermittent or zero internet access
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {OFFLINE_FEATURES.map((feat) => (
          <div
            key={feat.num}
            className="border border-hairline p-5 bg-surface rounded-[2px] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-hairline mb-3">
                <span className="font-data text-xs text-teal font-semibold">
                  FEATURE {feat.num}
                </span>
                <span className="text-[11px] font-data text-text-caption">
                  {feat.technicalTag}
                </span>
              </div>

              <h3 className="text-base font-headline font-semibold text-text-primary mb-2">
                {feat.title}
              </h3>

              <p className="text-xs text-text-secondary leading-relaxed mb-2">
                {feat.summary}
              </p>

              <details className="text-xs text-text-secondary leading-relaxed group">
                <summary className="font-data text-[11px] text-teal hover:text-ink cursor-pointer select-none py-0.5 focus:outline-none focus-visible:underline">
                  Technical details
                </summary>
                <div className="pt-1.5 border-t border-hairline/60 text-text-secondary text-[11px]">
                  {feat.details}
                </div>
              </details>
            </div>

            <div className="mt-4 pt-3 border-t border-hairline text-[11px] font-data text-text-caption">
              Offline status: <span className="text-teal font-medium">Applies to local build (hosted site uses configured endpoints)</span>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
