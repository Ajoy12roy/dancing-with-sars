'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function AboutSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      id="about"
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
      className="pt-16 pb-8 border-t border-hairline scroll-mt-15 md:scroll-mt-18"
    >
      <span className="block text-xs text-text-caption font-data tracking-wider uppercase mb-2">
        Platform background
      </span>
      <h2 className="text-2xl md:text-3xl font-headline font-semibold text-text-primary">
        About TerraPulse
      </h2>
      <div className="mt-4 max-w-3xl space-y-3 text-base text-text-secondary leading-relaxed">
        <p>
          TerraPulse is a scientific geospatial platform that compares before and after Synthetic Aperture Radar (SAR) satellite imagery to detect, quantify, and explain surface changes with radar precision. The platform provides four specialized analysis pipelines: flood inundation, river bank erosion and accretion, forest canopy loss, and surface water dynamics. Built with deterministic remote sensing algorithms, self-hosted cartography, and precomputed demonstration assets, the system operates completely offline without external cloud dependencies or API keys. When an optional Gemini API key is configured, the platform translates deterministic radar backscatter variations into plain-language environmental interpretations.
        </p>
      </div>
    </motion.section>
  );
}
