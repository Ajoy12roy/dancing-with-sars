'use client';

import { useState, useRef, useEffect, useId } from 'react';
import {
  statusPresentation,
  ServiceState,
  REAL_SERVICE_COMMAND,
  REAL_SERVICE_ENV_VAR,
  REAL_SERVICE_CORS_VAR,
  REAL_SERVICE_DOC_PATH,
} from '@/lib/service-status';

interface ServiceStatusPillProps {
  serverStatus: ServiceState;
  serviceConfigured: boolean;
  onRetry?: () => void;
  className?: string;
}

export function ServiceStatusPill({
  serverStatus,
  serviceConfigured,
  onRetry,
  className = '',
}: ServiceStatusPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const presentation = statusPresentation(serverStatus, serviceConfigured);

  // Close popover on outside click or Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const dotClasses =
    presentation.tone === 'success'
      ? 'bg-teal'
      : presentation.tone === 'alert'
      ? 'bg-rust'
      : presentation.tone === 'neutral'
      ? 'bg-hairline animate-pulse'
      : 'bg-hairline';

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-xs font-sans text-ink transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent max-w-full"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClasses}`} aria-hidden="true" />
        <span className="truncate">{presentation.label}</span>
        <span className="text-[10px] text-text-secondary font-mono tracking-wider ml-0.5" aria-hidden="true">
          {isOpen ? '^' : 'v'}
        </span>
      </button>

      {isOpen && (
        <div
          id={popoverId}
          role="region"
          aria-label="Processing service details"
          className="absolute left-0 mt-2 z-50 w-[calc(100vw-32px)] max-w-md sm:w-96 p-4 bg-surface border border-hairline rounded-[2px] shadow-lg text-xs font-sans text-ink space-y-3"
          style={{ boxSizing: 'border-box' }}
        >
          <div className="flex items-start justify-between gap-2 border-b border-hairline pb-2">
            <div className="font-semibold text-sm font-headline">Processing service details</div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text-secondary hover:text-ink px-1.5 py-0.5 rounded-[2px] border border-transparent hover:border-hairline text-xs font-mono"
              aria-label="Close details"
            >
              x
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="font-medium text-text-secondary">What this service does</div>
            <p className="text-ink leading-relaxed">
              Analyses user-uploaded GeoTIFF pairs using the Python change-detection backend to compute calibrated radar backscatter changes.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="font-medium text-text-secondary">What works without it</div>
            <p className="text-ink leading-relaxed">
              Precomputed case studies, the area picker, the Earth Engine script generator, and the ASF baseline search all work in the browser without the processing service.
            </p>
          </div>

          <div className="space-y-1.5 border-t border-hairline pt-2">
            <div className="font-medium text-text-secondary">For the project owner</div>
            <p className="text-text-secondary leading-relaxed">
              To enable live analysis, run the companion Python service and configure the environment variables:
            </p>
            <div className="bg-surface-2 p-2 border border-hairline rounded-[2px] font-mono text-[11px] space-y-1 break-all">
              <div>
                <span className="text-text-secondary"># Start service in python-service/</span>
                <br />
                <span className="text-ink font-semibold">{REAL_SERVICE_COMMAND}</span>
              </div>
              <div className="pt-1 border-t border-hairline">
                <span className="text-text-secondary">Frontend env:</span> {REAL_SERVICE_ENV_VAR}
              </div>
              <div>
                <span className="text-text-secondary">CORS env:</span> {REAL_SERVICE_CORS_VAR}
              </div>
            </div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              See <span className="font-mono text-ink">{REAL_SERVICE_DOC_PATH}</span> for complete container deployment and CORS instructions.
            </p>
          </div>

          {serviceConfigured && onRetry && (
            <div className="pt-2 border-t border-hairline flex items-center justify-between gap-2">
              <span className="text-text-secondary">Connection state: {serverStatus}</span>
              <button
                type="button"
                onClick={() => {
                  onRetry();
                }}
                className="px-3 py-1 bg-surface-2 hover:bg-surface border border-hairline rounded-[2px] text-ink font-medium transition-colors cursor-pointer"
              >
                Check connection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
