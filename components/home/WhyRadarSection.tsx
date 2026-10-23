'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function WhyRadarSection() {
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
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-8">
        <div>
          <span className="block text-xs text-(--color-text-caption) font-data tracking-wider uppercase mb-1">
            Physical Remote Sensing Principles
          </span>
          <h2 className="text-2xl md:text-3xl font-headline font-semibold text-(--color-text-primary) leading-snug">
            Why radar?
          </h2>
        </div>
        <span className="text-xs font-data text-(--color-text-secondary)">
          Microwave active sensing vs. optical passivity
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Point 1 */}
        <div className="border border-(--color-hairline) p-5 bg-(--color-paper) rounded-[2px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-(--color-hairline) mb-4">
              <span className="font-data text-xs text-(--color-teal) font-semibold">01 / ATMOSPHERIC PENETRATION</span>
              <span className="text-xs font-data text-(--color-text-caption)">C-band &amp; L-band</span>
            </div>
            <h3 className="text-base font-headline font-semibold text-(--color-text-primary) mb-2">
              All-weather, day-and-night observation
            </h3>
            <p className="text-sm text-(--color-text-secondary) leading-relaxed">
              Optical sensors cannot image through cloud decks, haze, smoke, or darkness. Synthetic Aperture Radar (SAR) transmits microwave pulses (wavelengths ~5.6&nbsp;cm for C-band, ~24&nbsp;cm for L-band) that penetrate thick cloud cover unhindered, providing guaranteed observations during major monsoon floods and storm events.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-(--color-hairline) text-[11px] font-data text-(--color-text-caption)">
            Operational in 100% cloud cover
          </div>
        </div>

        {/* Point 2 */}
        <div className="border border-(--color-hairline) p-5 bg-(--color-paper) rounded-[2px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-(--color-hairline) mb-4">
              <span className="font-data text-xs text-(--color-teal) font-semibold">02 / SURFACE DIELECTRICS</span>
              <span className="text-xs font-data text-(--color-text-caption)">Specular vs. Diffuse</span>
            </div>
            <h3 className="text-base font-headline font-semibold text-(--color-text-primary) mb-2">
              Direct measurement of roughness &amp; moisture
            </h3>
            <p className="text-sm text-(--color-text-secondary) leading-relaxed">
              Open water acts as a smooth specular mirror, bouncing radar pulses away from the receiver and producing distinct low backscatter values (&le;&nbsp;&minus;16.0&nbsp;dB). In contrast, rough soil, crop canopies, and urban structures produce diffuse or double-bounce returns, creating sharp physical contrast between flooded and dry ground.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-(--color-hairline) text-[11px] font-data text-(--color-text-caption)">
            Calibrated radiometric thresholding
          </div>
        </div>

        {/* Point 3 */}
        <div className="border border-(--color-hairline) p-5 bg-(--color-paper) rounded-[2px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-(--color-hairline) mb-4">
              <span className="font-data text-xs text-(--color-teal) font-semibold">03 / ORBITAL REPEATABILITY</span>
              <span className="text-xs font-data text-(--color-text-caption)">Identical Geometry</span>
            </div>
            <h3 className="text-base font-headline font-semibold text-(--color-text-primary) mb-2">
              Fixed orbital geometry for date comparison
            </h3>
            <p className="text-sm text-(--color-text-secondary) leading-relaxed">
              Spacecraft fly exact repeat orbits (e.g. Sentinel-1&apos;s 6-to-12 day revisit cycles) from the exact same observation angles. Comparing before and after scenes from identical orbital tracks isolates genuine physical surface transformations, free from the sun-angle and shadow discrepancies inherent in optical photography.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-(--color-hairline) text-[11px] font-data text-(--color-text-caption)">
            Rigorous pixel-by-pixel log-ratio differencing
          </div>
        </div>
      </div>
    </motion.section>
  );
}
