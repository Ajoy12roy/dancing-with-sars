'use client';

import type { ReactNode } from 'react';

interface VideoStageProps {
  children: ReactNode;
  aspectRatio?: string;
}

/**
 * Responsive, theme-aware stage frame for the /how-it-works overview video.
 * Provides layered depth (faint radar-ring graticule backdrop, soft shadow plate,
 * and a minimal device bezel) while keeping rounded-[2px] design tokens.
 */
export function VideoStage({ children, aspectRatio = '16 / 9' }: VideoStageProps) {
  return (
    <div className="w-full max-w-5xl mx-auto relative py-2">
      {/* Subtle radial glow + faint radar-ring / graticule backdrop */}
      <div
        aria-hidden="true"
        className="absolute -inset-3 sm:-inset-5 pointer-events-none overflow-hidden rounded-[2px]"
        style={{
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
      </div>

      {/* Soft shadow plate behind the frame */}
      <div
        aria-hidden="true"
        className="absolute inset-x-3 sm:inset-x-4 top-4 bottom-0 bg-surface-2 border border-hairline rounded-[2px] opacity-80 pointer-events-none"
      />

      {/* Device Bezel Frame */}
      <div className="relative z-10 w-full border border-hairline rounded-[2px] bg-surface overflow-hidden">
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
      </div>
    </div>
  );
}
