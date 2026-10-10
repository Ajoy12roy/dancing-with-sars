// ========================================================================
// Animation Variants — Revised
// Almost everything removed. The design is content-first, not motion-first.
// Only two motion behaviors are kept:
//   1. Before/after slider contour-line sweep (to be built in BeforeAfterViewer)
//   2. Hairline underline hover on links/buttons (handled via CSS transitions)
//
// These variant objects are preserved as empty/minimal for API compatibility
// if any consuming code references them, but they produce no visible motion.
// ========================================================================

/** No-op: sections appear immediately, no fade-up */
export const fadeInUp = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

/** No-op stagger */
export const staggerContainer = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

/** No-op scale */
export const scaleIn = {
  hidden: { opacity: 1, scale: 1 },
  visible: { opacity: 1, scale: 1 },
};

/** No-op slide */
export const slideFromLeft = {
  hidden: { opacity: 1, x: 0 },
  visible: { opacity: 1, x: 0 },
};

/** No-op slide */
export const slideFromRight = {
  hidden: { opacity: 1, x: 0 },
  visible: { opacity: 1, x: 0 },
};
