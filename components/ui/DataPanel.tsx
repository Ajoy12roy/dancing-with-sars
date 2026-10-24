'use client';

import React from 'react';

export interface DataPanelProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  noPadding?: boolean;
  footer?: React.ReactNode;
}

export function DataPanel({
  title,
  subtitle,
  rightSlot,
  children,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  noPadding = false,
  footer,
}: DataPanelProps) {
  return (
    <section
      className={`border-panel-border bg-surface text-ink rounded-[2px] flex flex-col overflow-hidden shadow-none ${className}`}
      style={{
        borderWidth: 'var(--data-panel-border-width, 2.5px)',
        borderStyle: 'solid',
        borderColor: 'var(--data-panel-border, var(--color-panel-border))',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '2px',
        boxShadow: 'none',
      }}
    >
      {/* Header strip with 1px bottom rule in hairline */}
      <header
        className={`px-4 sm:px-5 py-2.5 sm:py-3 border-b border-hairline flex flex-wrap items-center justify-between shrink-0 gap-2 sm:gap-3 bg-surface ${headerClassName}`}
        style={{
          borderBottom: '1px solid var(--color-hairline)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h3
            className="font-bold text-sm sm:text-base text-ink leading-tight"
            style={{
              fontFamily: 'var(--font-headline), "Source Serif 4", Georgia, serif',
              fontWeight: 600,
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <div className="font-sans text-xs text-text-secondary truncate">
              {subtitle}
            </div>
          )}
        </div>

        {rightSlot && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {rightSlot}
          </div>
        )}
      </header>

      {/* Panel Body with 20px inner padding unless noPadding is set */}
      <div
        className={`flex-1 flex flex-col min-h-0 ${noPadding ? '' : 'p-5'} ${bodyClassName}`}
      >
        {children}
      </div>

      {/* Optional Footer Strip */}
      {footer && (
        <footer className="shrink-0">
          {footer}
        </footer>
      )}
    </section>
  );
}

export default DataPanel;
