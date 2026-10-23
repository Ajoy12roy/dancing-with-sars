'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

export function DataSourcesSection() {
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
      className="py-14 border-t border-(--color-hairline)"
    >
      <div className="border border-(--color-hairline) p-6 bg-(--color-paper) rounded-[2px]">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 pb-4 border-b border-(--color-hairline) mb-4">
          <div>
            <span className="block text-xs text-(--color-text-caption) font-data tracking-wider uppercase mb-1">
              Provenance &amp; Attribution
            </span>
            <h2 className="text-xl md:text-2xl font-headline font-semibold text-(--color-text-primary)">
              Data sources &amp; satellite missions
            </h2>
          </div>
          <Link
            href="/data-sources"
            className="text-xs font-sans font-medium text-(--color-teal) hover:underline flex items-center gap-1"
          >
            View full citations &amp; software stack &rarr;
          </Link>
        </div>

        <p className="text-sm text-(--color-text-secondary) leading-relaxed mb-6 max-w-3xl">
          All observation scenes are sourced from public, open-access Earth observation constellations. Synthetic Aperture Radar data is captured by the Copernicus Sentinel-1 C-band constellation (European Space Agency / European Commission) and processed via Alaska Satellite Facility (ASF DAAC). Basemap overlays incorporate OpenStreetMap open data (&copy; OpenStreetMap contributors).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-data">
          <div className="border border-(--color-hairline) p-3 bg-(--color-paper-warm) rounded-[1px]">
            <span className="text-(--color-text-caption) block text-[11px] mb-1">CONSTELLATION</span>
            <span className="text-(--color-ink) font-medium">Copernicus Sentinel-1 (C-band)</span>
          </div>
          <div className="border border-(--color-hairline) p-3 bg-(--color-paper-warm) rounded-[1px]">
            <span className="text-(--color-text-caption) block text-[11px] mb-1">ARCHIVE DISTRIBUTION</span>
            <span className="text-(--color-ink) font-medium">ASF DAAC / NASA Earthdata</span>
          </div>
          <div className="border border-(--color-hairline) p-3 bg-(--color-paper-warm) rounded-[1px]">
            <span className="text-(--color-text-caption) block text-[11px] mb-1">GEOSPATIAL PROCESSING</span>
            <span className="text-(--color-ink) font-medium">GDAL &bull; Rasterio &bull; NumPy &bull; SciPy</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
