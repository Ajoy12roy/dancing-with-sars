// ========================================================================
// Landing Page — Dancing with the SARs
// Route: /
// Left-aligned, editorial — reads like a technical brief, not a marketing page.
// ========================================================================

'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { motion, useReducedMotion } from 'framer-motion';
import {
  WhyRadarSection,
  HazardsSection,
  PipelineSection,
  LiveResultsSection,
  OfflineArchitectureSection,
  DataSourcesSection,
  CtaSection,
  AboutSection,
} from '@/components/home';

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
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      {/* Hero Section with staggered entrance */}
      <motion.div
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
        variants={containerVariants}
        className="pb-16"
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
          <Link
            href="/explore"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-(--color-teal) text-(--color-paper) hover:underline hover:underline-offset-4 transition-all duration-150"
          >
            Open explorer
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-(--color-teal) border border-(--color-teal) hover:border-(--color-teal-light) hover:text-(--color-teal-light) transition-colors duration-150"
          >
            How it works
          </Link>
        </motion.div>
      </motion.div>

      {/* 1. Why radar? */}
      <WhyRadarSection />

      {/* 2. Four hazards, one workflow */}
      <HazardsSection />

      {/* 3. From radar scene to answer */}
      <PipelineSection />

      {/* 4. Live results from the demo areas */}
      <LiveResultsSection />

      {/* 5. Built to work offline */}
      <OfflineArchitectureSection />

      {/* 6. Data sources */}
      <DataSourcesSection />

      {/* 7. Closing call-to-action */}
      <CtaSection />

      {/* 8. About section (preserved id="about") */}
      <AboutSection />
    </div>
  );
}
