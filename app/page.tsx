// ========================================================================
// Landing Page — Dancing with the SARs
// Route: /
// Left-aligned, editorial — reads like a technical brief, not a marketing page.
// ========================================================================

'use client';

import { Badge } from '@/components/ui/Badge';
import { GraticuleFrame } from '@/components/layout/GraticuleFrame';
import { motion, useReducedMotion } from 'framer-motion';

export default function HomePage() {
  const shouldReduceMotion = useReducedMotion();

  // Single orchestrated entrance sequence for the hero section
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Hero Section with staggered entrance */}
      <motion.div
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Badge variant="teal">NASA Space Apps 2026</Badge>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="mt-6 text-4xl md:text-5xl font-headline font-semibold text-(--color-text-primary) leading-tight"
        >
          Dancing with the SARs
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mt-4 text-lg text-(--color-text-secondary) max-w-xl leading-relaxed"
        >
          A platform that compares before/after SAR satellite images to detect
          and explain surface change — floods, land-cover shifts — with
          scientific precision and AI-narrated insight, fully usable offline.
        </motion.p>

        <motion.div variants={itemVariants} className="mt-8 flex gap-3">
          <a
            href="/explore"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-(--color-teal) text-(--color-paper) hover:underline hover:underline-offset-4 transition-all duration-150"
          >
            Open explorer
          </a>
          <a
            href="/how-it-works"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-(--color-teal) border border-(--color-teal) hover:border-(--color-teal-light) hover:text-(--color-teal-light) transition-colors duration-150"
          >
            How it works
          </a>
        </motion.div>
      </motion.div>

      {/* Overview specimen - Static, no entrance animation on scroll */}
      <GraticuleFrame className="mt-16">
        <div className="p-6">
          <span className="block text-xs text-(--color-text-caption) font-data mb-4">
            Project overview — SAR change detection pipeline
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border-t border-(--color-hairline) pt-4">
              <h3 className="text-base font-headline font-semibold text-(--color-text-primary)">
                SAR acquisition
              </h3>
              <p className="mt-2 text-sm text-(--color-text-secondary)">
                Sentinel-1 C-band and NISAR L-band data from ASF DAAC, capturing
                surface conditions across two observation dates.
              </p>
            </div>

            <div className="border-t border-(--color-hairline) pt-4">
              <h3 className="text-base font-headline font-semibold text-(--color-text-primary)">
                Change detection
              </h3>
              <p className="mt-2 text-sm text-(--color-text-secondary)">
                Deterministic processing — calibration, speckle filtering,
                log-ratio differencing — produces a change map and statistics.
                No AI in the science loop.
              </p>
            </div>

            <div className="border-t border-(--color-hairline) pt-4">
              <h3 className="text-base font-headline font-semibold text-(--color-text-primary)">
                AI narration
              </h3>
              <p className="mt-2 text-sm text-(--color-text-secondary)">
                An explanation layer translates the deterministic results into
                plain-language insight. Clearly labeled, never the source of the
                numbers. Cached for offline use.
              </p>
            </div>
          </div>
        </div>
      </GraticuleFrame>
    </div>
  );
}
