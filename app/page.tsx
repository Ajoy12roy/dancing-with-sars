// ========================================================================
// Landing Page — Dancing with the SARs
// Route: /
// Left-aligned, editorial — reads like a technical brief, not a marketing page.
// ========================================================================

'use client';

import Link from 'next/link';
import { Satellite } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  WhyRadarSection,
  HazardsSection,
  PipelineSection,
  OfflineArchitectureSection,
  DataSourcesSection,
  AboutSection,
} from '@/components/home';
import ExploreButton from '@/components/ui/ExploreButton';

// Deterministic, hard-coded starfield for hero in dark mode (36 stars, 2-3px, 4-8s twinkle)
const HERO_STARS = [
  { top: '26.8%', left: '76.2%', size: 3, color: '#19E66F', duration: '5.52s', delay: '-4.45s' },
  { top: '82.7%', left: '77.4%', size: 3, color: '#19E66F', duration: '7.76s', delay: '-5.55s' },
  { top: '89.6%', left: '36.4%', size: 3, color: '#19E66F', duration: '5.84s', delay: '-0.84s' },
  { top: '77.2%', left: '16.9%', size: 2, color: '#19E66F', duration: '6.27s', delay: '-5.55s' },
  { top: '74.1%', left: '69.8%', size: 2, color: '#19E66F', duration: '6.78s', delay: '-0.44s' },
  { top: '26.6%', left: '86.4%', size: 2, color: '#13964D', duration: '6.45s', delay: '-0.41s' },
  { top: '58.8%', left: '92.0%', size: 2, color: '#19E66F', duration: '6.88s', delay: '-5.24s' },
  { top: '67.5%', left: '5.0%', size: 2, color: '#19E66F', duration: '7.18s', delay: '-6.05s' },
  { top: '88.1%', left: '79.6%', size: 3, color: '#13964D', duration: '6.38s', delay: '-2.16s' },
  { top: '62.2%', left: '59.4%', size: 2, color: '#19E66F', duration: '5.05s', delay: '-2.43s' },
  { top: '63.0%', left: '33.8%', size: 3, color: '#19E66F', duration: '5.66s', delay: '-4.54s' },
  { top: '38.0%', left: '58.2%', size: 2, color: '#13964D', duration: '4.72s', delay: '-3.99s' },
  { top: '42.3%', left: '54.3%', size: 3, color: '#19E66F', duration: '6.69s', delay: '-6.60s' },
  { top: '46.4%', left: '91.3%', size: 3, color: '#19E66F', duration: '7.08s', delay: '-6.30s' },
  { top: '75.4%', left: '45.8%', size: 2, color: '#19E66F', duration: '4.48s', delay: '-2.78s' },
  { top: '36.9%', left: '37.8%', size: 2, color: '#13964D', duration: '6.42s', delay: '-0.20s' },
  { top: '41.8%', left: '6.0%', size: 2, color: '#19E66F', duration: '7.62s', delay: '-5.03s' },
  { top: '54.8%', left: '76.6%', size: 2, color: '#13964D', duration: '6.99s', delay: '-4.16s' },
  { top: '80.7%', left: '91.5%', size: 3, color: '#19E66F', duration: '7.37s', delay: '-2.22s' },
  { top: '20.3%', left: '88.6%', size: 3, color: '#19E66F', duration: '6.71s', delay: '-3.00s' },
  { top: '11.8%', left: '20.1%', size: 2, color: '#19E66F', duration: '7.12s', delay: '-6.65s' },
  { top: '11.6%', left: '82.3%', size: 2, color: '#13964D', duration: '7.59s', delay: '-2.70s' },
  { top: '51.8%', left: '21.7%', size: 2, color: '#19E66F', duration: '7.08s', delay: '-7.08s' },
  { top: '52.8%', left: '5.1%', size: 3, color: '#19E66F', duration: '6.73s', delay: '-1.09s' },
  { top: '80.6%', left: '29.7%', size: 2, color: '#13964D', duration: '5.27s', delay: '-4.45s' },
  { top: '10.1%', left: '44.6%', size: 3, color: '#19E66F', duration: '5.42s', delay: '-1.34s' },
  { top: '85.9%', left: '74.6%', size: 3, color: '#19E66F', duration: '5.96s', delay: '-5.05s' },
  { top: '18.1%', left: '52.1%', size: 2, color: '#19E66F', duration: '6.36s', delay: '-6.61s' },
  { top: '57.0%', left: '27.5%', size: 3, color: '#19E66F', duration: '5.13s', delay: '-7.05s' },
  { top: '48.0%', left: '96.0%', size: 2, color: '#13964D', duration: '5.74s', delay: '-4.85s' },
  { top: '39.1%', left: '70.2%', size: 3, color: '#19E66F', duration: '7.36s', delay: '-2.27s' },
  { top: '42.6%', left: '14.3%', size: 3, color: '#19E66F', duration: '6.37s', delay: '-1.21s' },
  { top: '39.8%', left: '37.4%', size: 3, color: '#19E66F', duration: '4.64s', delay: '-5.85s' },
  { top: '86.0%', left: '28.1%', size: 2, color: '#19E66F', duration: '5.79s', delay: '-1.56s' },
  { top: '38.0%', left: '93.3%', size: 3, color: '#19E66F', duration: '4.57s', delay: '-4.66s' },
  { top: '47.6%', left: '18.0%', size: 2, color: '#13964D', duration: '5.58s', delay: '-0.87s' },
] as const;

export default function HomePage() {
  const shouldReduceMotion = useReducedMotion();

  // Gentle Framer Motion entrance (fade + 12px slide-up, staggered by 80ms)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.4,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <div className="w-full">
      {/* Hero Section — centered column, vertically centered in min-height: calc(100svh - navbar height) */}
      <section className="hero-section min-h-[calc(100svh-60px)] md:min-h-[calc(100svh-72px)] flex items-center justify-center px-6 py-12 md:py-16">
        {/* CSS-only Earth Arc (Dark mode only) */}
        <div className="hero-earth-arc" aria-hidden="true" />

        {/* CSS-only Star field (Dark mode only) */}
        <div className="hero-stars-container" aria-hidden="true">
          {HERO_STARS.map((star, idx) => (
            <span
              key={idx}
              className="hero-star"
              style={{
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
                animationDuration: star.duration,
                animationDelay: star.delay,
              }}
            />
          ))}
        </div>

        <motion.div
          initial={shouldReduceMotion ? 'visible' : 'hidden'}
          animate="visible"
          variants={containerVariants}
          className="w-full max-w-4xl mx-auto flex flex-col items-center text-center relative z-10"
        >
          {/* 1. Eyebrow: small lucide Satellite icon + uppercase text */}
          <motion.div
            variants={itemVariants}
            className="hero-eyebrow inline-flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.08em]"
          >
            <Satellite className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>NASA SPACE APPS CHALLENGE 2026</span>
          </motion.div>

          {/* 2. Title: TerraPulse, Public Sans weight 700, clamp(56px, 9vw, 120px), line-height 1.02, letter-spacing -0.02em */}
          <motion.h1
            variants={itemVariants}
            className="hero-title mt-4 md:mt-6 font-bold text-[clamp(56px,9vw,120px)] leading-[1.02] tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            TerraPulse
          </motion.h1>

          {/* Subtitle: Dancing with the SARs */}
          <motion.p
            variants={itemVariants}
            className="hero-subtitle mt-3 md:mt-4 text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight"
          >
            Dancing with the SARs
          </motion.p>

          {/* 3. Paragraph: current text kept exactly as is, centered, max-width 760px, 20px / 1.6 */}
          <motion.p
            variants={itemVariants}
            className="hero-paragraph mt-6 text-base sm:text-lg md:text-[20px] leading-[1.6] max-w-190 mx-auto"
          >
            A platform that compares before/after SAR satellite images to detect
            and explain surface change — floods, land-cover shifts — with
            scientific precision and AI-narrated insight, fully usable offline.
          </motion.p>

          {/* 4. Two buttons: height 56px, padding 0 28px, radius 2px, weight 600, no glow, no shadow */}
          <motion.div
            variants={itemVariants}
            className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <ExploreButton href="/explore" label="Explore Now" />
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center h-12.5 px-8 rounded-[6px] font-body text-sm font-semibold text-ink bg-transparent border border-hairline hover:border-teal hover:text-teal transition-colors duration-150 select-none shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              How It Works
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Main content sections */}
      <div className="mx-auto max-w-5xl px-6 pb-16">
        {/* 1. Why radar? */}
        <WhyRadarSection />

        {/* 2. Four hazards, one workflow */}
        <HazardsSection />

        {/* 3. From radar scene to answer */}
        <PipelineSection />

        {/* 4. Built to work offline */}
        <OfflineArchitectureSection />

        {/* 5. Data sources */}
        <DataSourcesSection />

        {/* 8. About section (preserved id="about") */}
        <AboutSection />
      </div>
    </div>
  );
}
