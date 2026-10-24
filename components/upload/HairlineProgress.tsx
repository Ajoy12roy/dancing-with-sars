'use client';

import { motion } from 'framer-motion';

interface HairlineProgressProps {
  statusText?: string;
  detailText?: string;
}

export function HairlineProgress({
  statusText = 'Processing SAR imagery. This can take up to a minute.',
  detailText = 'Computing backscatter difference & applying spatial filter',
}: HairlineProgressProps) {
  return (
    <div className="w-full border border-hairline bg-surface p-8 rounded-[2px] flex flex-col items-center justify-center text-center space-y-4">
      <p className="text-sm text-ink font-medium">
        {statusText}
      </p>

      {/* Hairline progress indicator */}
      <div className="w-72 max-w-full h-0.5 bg-hairline overflow-hidden relative">
        <motion.div
          className="h-full bg-teal w-1/3 absolute"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      </div>

      <p className="font-data text-xs text-text-secondary">
        {detailText}
      </p>
    </div>
  );
}

