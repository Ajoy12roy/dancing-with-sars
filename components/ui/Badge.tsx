// ========================================================================
// Badge — Revised: no pill shape, no rounded-full, understated.
// A small inline label with a hairline border, sharp edges.
// ========================================================================

import React from 'react';

type BadgeVariant = 'teal' | 'rust' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  teal: 'text-(--color-teal) border-(--color-teal)',
  rust: 'text-(--color-rust) border-(--color-rust)',
  neutral: 'text-(--color-text-secondary) border-(--color-hairline)',
};

export function Badge({
  children,
  variant = 'neutral',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-2 py-0.5
        text-xs font-medium
        border
        font-data
        ${variantStyles[variant]}
        ${className}
      `.trim()}
    >
      {children}
    </span>
  );
}
