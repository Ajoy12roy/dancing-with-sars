'use client';

import { motion, useReducedMotion } from 'framer-motion';

const OFFLINE_FEATURES = [
  {
    num: '01',
    title: 'Offline Radar Basemap',
    technicalTag: 'Zero Tile Server Calls',
    description:
      'Defaults to a neutral survey background with local SAR before-scene backscatter raster overlays, an SVG/polyline coordinate graticule in IBM Plex Mono, and a metric scale bar. Fully functional without an internet connection.',
  },
  {
    num: '02',
    title: 'Self-Hosted Fonts & Map Assets',
    technicalTag: 'Zero CDN Dependencies',
    description:
      'Typography (Source Serif 4, Public Sans, IBM Plex Mono) is bundled locally via next/font/local. All Leaflet marker icons, layer graphics, and styles are served directly from public/leaflet/ without external unpkg or cdnjs requests.',
  },
  {
    num: '03',
    title: 'Local Python Service Processing',
    technicalTag: 'Local Workstation Execution',
    description:
      'Custom GeoTIFF uploads are processed on your local machine using rasterio, numpy, and scipy. Rasters, spatial bounds, and coordinates never leave your workstation, ensuring complete data privacy and offline readiness.',
  },
  {
    num: '04',
    title: 'Deterministic Fallback Insights',
    technicalTag: 'Zero API Key Required',
    description:
      'When GEMINI_API_KEY is not configured or during field operations without connectivity, the narrative panel automatically synthesizes deterministic, publication-grade analytical summaries directly from the computed metrics.',
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

              <p className="text-xs text-text-secondary leading-relaxed">
                {feat.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-hairline text-[11px] font-data text-text-caption">
              Offline status: <span className="text-teal font-medium">Fully verified &bull; Autonomous</span>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
