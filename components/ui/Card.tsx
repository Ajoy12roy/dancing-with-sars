// ========================================================================
// SpecimenSheet — Replaces Card.
// Hairline top border only, no full box, no shadow, no border-radius.
// Each instance shows a mono-font identifier (AOI name + coordinates).
// ========================================================================

import React from 'react';

interface SpecimenSheetProps {
  children: React.ReactNode;
  /** Identifier shown in mono type — e.g. AOI name or coordinates */
  identifier?: string;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

export function SpecimenSheet({
  children,
  identifier,
  className = '',
  as: Component = 'div',
}: SpecimenSheetProps) {
  return (
    <Component
      className={`
        border-t border-hairline
        pt-4 pb-6
        ${className}
      `.trim()}
    >
      {identifier && (
        <span className="block mb-3 text-xs text-text-secondary font-data tracking-wide">
          {identifier}
        </span>
      )}
      {children}
    </Component>
  );
}
