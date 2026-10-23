'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

export function CtaSection() {
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
      className="py-16 border-t border-(--color-hairline)"
    >
      <div className="border border-(--color-hairline) p-8 md:p-10 bg-(--color-paper-warm) rounded-[2px] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <span className="block text-xs text-(--color-text-caption) font-data tracking-wider uppercase mb-1">
            Ready for Analysis
          </span>
          <h2 className="text-2xl md:text-3xl font-headline font-semibold text-(--color-text-primary) leading-snug">
            Explore the analysis
          </h2>
          <p className="mt-2 text-sm text-(--color-text-secondary) leading-relaxed">
            Examine calibrated before/after SAR imagery across Sylhet, Jamuna, Amazon, and Tanguar Haor, or drag-and-drop your own GeoTIFF rasters into the local processing engine.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            href="/explore"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium bg-(--color-teal) text-(--color-paper) hover:underline hover:underline-offset-4 transition-all duration-150 rounded-[1px]"
          >
            Open explorer &rarr;
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-(--color-teal) border border-(--color-teal) hover:border-(--color-teal-light) hover:text-(--color-teal-light) transition-colors duration-150 rounded-[1px]"
          >
            How it works
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
