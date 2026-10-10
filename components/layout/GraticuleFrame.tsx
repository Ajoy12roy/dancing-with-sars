// ========================================================================
// GraticuleFrame — Coordinate-grid layout wrapper
// Thin hairline border with tick marks along top and left edges,
// echoing the graticule of a real geospatial chart.
// ========================================================================

import React from 'react';

interface GraticuleFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function GraticuleFrame({ children, className = '' }: GraticuleFrameProps) {
  return (
    <div className={`graticule-frame ${className}`}>
      <div className="pl-3 pt-3">
        {children}
      </div>
    </div>
  );
}
