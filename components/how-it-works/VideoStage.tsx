'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'framer-motion';

interface VideoStageProps {
  children: ReactNode;
  aspectRatio?: string;
  isPlaying?: boolean;
}

/**
 * Responsive, 3D-perspective stage frame for the /how-it-works overview video.
 * - Scroll-driven 3D entrance (useScroll + useTransform + useSpring)
 * - Fine-pointer tilt (disabled while playing, over iframe, focused inside, or on touch/reduced motion)
 * - Subtle opposite parallax on the backdrop graticule and shadow plate
 */
export function VideoStage({
  children,
  aspectRatio = '16 / 9',
  isPlaying = false,
}: VideoStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [canPointerTilt, setCanPointerTilt] = useState(false);
  const [isFocusInside, setIsFocusInside] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanPointerTilt(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ['start end', 'center center'],
  });

  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 26,
    mass: 0.4,
  });

  const scrollRotateX = useTransform(smoothScroll, [0, 1], [12, 0]);
  const scrollScale = useTransform(smoothScroll, [0, 1], [0.94, 1]);
  const scrollY = useTransform(smoothScroll, [0, 1], [24, 0]);

  const pointerRotateX = useSpring(0, { stiffness: 200, damping: 24 });
  const pointerRotateY = useSpring(0, { stiffness: 200, damping: 24 });

  const tiltDisabled = Boolean(shouldReduceMotion) || isPlaying || isFocusInside || !canPointerTilt;

  useEffect(() => {
    if (tiltDisabled) {
      pointerRotateX.set(0);
      pointerRotateY.set(0);
    }
  }, [tiltDisabled, pointerRotateX, pointerRotateY]);

  const combinedRotateX = useTransform(
    [scrollRotateX, pointerRotateX],
    ([sx, px]: number[]) => (shouldReduceMotion || isPlaying ? 0 : (sx ?? 0) + (px ?? 0))
  );
  const combinedRotateY = useTransform(pointerRotateY, (py: number) =>
    shouldReduceMotion || isPlaying ? 0 : py
  );
  const frameScale = useTransform(scrollScale, (s: number) =>
    shouldReduceMotion || isPlaying ? 1 : s
  );
  const frameY = useTransform(scrollY, (y: number) =>
    shouldReduceMotion || isPlaying ? 0 : y
  );

  // Opposite parallax for backdrop and shadow plate
  const backdropX = useTransform(pointerRotateY, (py: number) =>
    shouldReduceMotion || isPlaying ? 0 : -py * 1.5
  );
  const backdropY = useTransform(
    [scrollY, pointerRotateX],
    ([sy, px]: number[]) => (shouldReduceMotion || isPlaying ? 0 : -(sy ?? 0) * 0.35 + (px ?? 0) * 1.5)
  );
  const shadowX = useTransform(pointerRotateY, (py: number) =>
    shouldReduceMotion || isPlaying ? 0 : -py * 0.9
  );
  const shadowY = useTransform(
    [scrollY, pointerRotateX],
    ([sy, px]: number[]) => (shouldReduceMotion || isPlaying ? 0 : -(sy ?? 0) * 0.2 + (px ?? 0) * 0.9)
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tiltDisabled || !stageRef.current) return;
    if (e.target instanceof HTMLIFrameElement) {
      pointerRotateX.set(0);
      pointerRotateY.set(0);
      return;
    }
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    pointerRotateY.set(Math.max(-6, Math.min(6, nx * 12)));
    pointerRotateX.set(Math.max(-6, Math.min(6, -ny * 12)));
  };

  const handlePointerLeave = () => {
    pointerRotateX.set(0);
    pointerRotateY.set(0);
  };

  return (
    <div
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onFocusCapture={() => setIsFocusInside(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocusInside(false);
        }
      }}
      className="w-full max-w-5xl mx-auto relative py-2"
      style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
    >
      {/* Subtle radial glow + faint radar-ring / graticule backdrop */}
      <motion.div
        aria-hidden="true"
        className="absolute -inset-3 sm:-inset-5 pointer-events-none overflow-hidden rounded-[2px]"
        style={{
          x: backdropX,
          y: backdropY,
          background:
            'radial-gradient(ellipse at 50% 45%, var(--color-teal-faint) 0%, transparent 70%)',
        }}
      >
        <svg
          className="w-full h-full opacity-25"
          viewBox="0 0 800 450"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <circle cx="400" cy="225" r="110" stroke="var(--color-hairline)" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="400" cy="225" r="190" stroke="var(--color-hairline)" strokeWidth="1" />
          <circle cx="400" cy="225" r="270" stroke="var(--color-hairline)" strokeWidth="1" strokeDasharray="2 6" />
          <line x1="0" y1="225" x2="800" y2="225" stroke="var(--color-hairline)" strokeWidth="0.75" />
          <line x1="400" y1="0" x2="400" y2="450" stroke="var(--color-hairline)" strokeWidth="0.75" />
        </svg>
      </motion.div>

      {/* Soft shadow plate behind the frame */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-3 sm:inset-x-4 top-4 bottom-0 bg-surface-2 border border-hairline rounded-[2px] opacity-80 pointer-events-none"
        style={{
          x: shadowX,
          y: shadowY,
        }}
      />

      {/* Device Bezel Frame */}
      <motion.div
        className="relative z-10 w-full border border-hairline rounded-[2px] bg-surface overflow-hidden"
        style={
          shouldReduceMotion
            ? undefined
            : {
                rotateX: combinedRotateX,
                rotateY: combinedRotateY,
                scale: frameScale,
                y: frameY,
                transformStyle: 'preserve-3d',
                willChange: isPlaying ? 'auto' : 'transform',
              }
        }
      >
        {/* Subtle Top Bezel Bar */}
        <div
          aria-hidden="true"
          className="h-7 px-3 border-b border-hairline bg-surface-2 flex items-center justify-between"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-hairline inline-block" />
            <span className="w-2 h-2 rounded-full bg-hairline inline-block" />
            <span className="w-2 h-2 rounded-full bg-hairline inline-block" />
          </div>
          <span className="text-[10px] font-data uppercase tracking-wider text-text-caption">
            SAR // OVERVIEW
          </span>
        </div>

        {/* Video Viewport */}
        <div
          className="w-full min-h-[220px] bg-surface-2 relative overflow-hidden flex items-center justify-center mx-auto"
          style={{ aspectRatio, maxHeight: '80vh' }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
