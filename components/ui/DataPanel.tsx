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
      className={`border-[2.5px] border-[#2C5C61] dark:border-[#5FA3AB] bg-(--color-paper) text-(--color-ink) rounded-[2px] flex flex-col overflow-hidden shadow-none ${className}`}
      style={{
        borderWidth: '2.5px',
        borderStyle: 'solid',
        borderColor: 'var(--data-panel-border, #2C5C61)',
        backgroundColor: 'var(--color-paper)',
        borderRadius: '2px',
        boxShadow: 'none',
      }}
    >
      {/* Header strip with 1px bottom rule in hairline #C7C4BC */}
      <header
        className={`px-5 py-3 border-b border-hairline flex items-center justify-between shrink-0 gap-3 bg-(--color-paper) ${headerClassName}`}
        style={{
          borderBottom: '1px solid var(--color-hairline, #C7C4BC)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <h3
            className="font-bold text-base text-(--color-ink) leading-tight truncate"
            style={{
              fontFamily: 'var(--font-headline), "Source Serif 4", Georgia, serif',
              fontWeight: 600,
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <div className="font-sans text-xs text-(--color-text-secondary) truncate">
              {subtitle}
            </div>
          )}
        </div>

        {rightSlot && (
          <div className="flex items-center gap-3 shrink-0">
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
