'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { GraticuleFrame } from '@/components/layout/GraticuleFrame';

export function HowItWorksClient() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' as const },
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <motion.div
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
        variants={containerVariants}
        className="mb-16"
      >
        <motion.h1 
          variants={itemVariants}
          className="text-3xl md:text-4xl font-headline font-semibold text-(--color-text-primary)"
        >
          How it works
        </motion.h1>
        <motion.p 
          variants={itemVariants}
          className="mt-4 text-lg text-(--color-text-secondary) max-w-2xl leading-relaxed"
        >
          What SAR is, why it matters for Earth observation, and the deterministic mathematics behind our change detection pipeline.
        </motion.p>
      </motion.div>

      {/* Static content per design system: no scroll-triggered reveal animations */}
      <div className="space-y-16">
        <GraticuleFrame>
          <div className="p-6 md:p-10">
            <h2 className="text-2xl font-headline font-semibold text-(--color-text-primary)">
              What is SAR?
            </h2>
            <p className="mt-4 text-(--color-text-secondary) leading-relaxed">
              Synthetic Aperture Radar (SAR) is an active remote sensing technology. Unlike optical satellites that rely on sunlight and require clear skies, SAR emits its own microwave energy and records the signal that bounces back (backscatter). This allows SAR to &quot;see&quot; through clouds, smoke, and darkness, providing reliable Earth observation day or night, in any weather.
            </p>
          </div>
        </GraticuleFrame>

        <GraticuleFrame>
          <div className="p-6 md:p-10">
            <h2 className="text-2xl font-headline font-semibold text-(--color-text-primary)">
              Why it matters
            </h2>
            <p className="mt-4 text-(--color-text-secondary) leading-relaxed">
              For disaster response—like the floods in Bangladesh—time is critical. Optical sensors often capture nothing but cloud cover during monsoon events. SAR guarantees an acquisition, revealing exactly where water has spilled over banks. For deforestation tracking, SAR can detect structural canopy loss regardless of persistent tropical cloud cover.
            </p>
          </div>
        </GraticuleFrame>

        <GraticuleFrame>
          <div className="p-6 md:p-10">
            <h2 className="text-2xl font-headline font-semibold text-(--color-text-primary)">
              The Mathematics of Change
            </h2>
            <p className="mt-4 text-(--color-text-secondary) leading-relaxed mb-6">
              Our change detection pipeline does not use AI to &quot;guess&quot; where change happened. It relies on strict, deterministic mathematics to compare a &quot;before&quot; image and an &quot;after&quot; image:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-t border-(--color-hairline) pt-4">
                <h3 className="text-base font-headline font-semibold text-(--color-text-primary)">
                  1. Calibration
                </h3>
                <p className="mt-2 text-sm text-(--color-text-secondary)">
                  Raw satellite data is converted to physical units (Sigma Nought, σ⁰). This ensures the radar backscatter values are directly comparable between different dates and different sensors.
                </p>
              </div>

              <div className="border-t border-(--color-hairline) pt-4">
                <h3 className="text-base font-headline font-semibold text-(--color-text-primary)">
                  2. Speckle Filtering
                </h3>
                <p className="mt-2 text-sm text-(--color-text-secondary)">
                  SAR images contain natural &quot;salt and pepper&quot; noise called speckle. We apply a spatial filter to smooth this out while preserving structural edges, preventing false change detection.
                </p>
              </div>

              <div className="border-t border-(--color-hairline) pt-4">
                <h3 className="text-base font-headline font-semibold text-(--color-text-primary)">
                  3. Log-Ratio
                </h3>
                <p className="mt-2 text-sm text-(--color-text-secondary)">
                  We subtract the log-scaled &quot;before&quot; image from the &quot;after&quot; image. A large negative value indicates a drop in backscatter (e.g., flooding), while a large positive value indicates an increase (e.g., new structures).
                </p>
              </div>
            </div>
          </div>
        </GraticuleFrame>
      </div>
    </div>
  );
}
