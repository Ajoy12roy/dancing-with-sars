'use client';

import { motion } from 'framer-motion';

export function HairlineProgress() {
  return (
    <div className="w-full border border-(--color-hairline) bg-(--color-paper) p-8 rounded-[2px] flex flex-col items-center justify-center text-center space-y-4">
      <p className="text-sm text-(--color-ink) font-medium">
        Processing SAR imagery. This can take up to a minute.
      </p>

      {/* Hairline progress indicator */}
      <div className="w-72 max-w-full h-[2px] bg-(--color-hairline) overflow-hidden relative">
        <motion.div
          className="h-full bg-(--color-teal) w-1/3 absolute"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      </div>

      <p className="font-data text-xs text-(--color-text-secondary)">
        Computing backscatter difference & applying spatial filter
      </p>
    </div>
  );
}
