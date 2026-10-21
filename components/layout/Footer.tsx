// ========================================================================
// Footer — solid text tokens, no opacity-based muted text.
// ========================================================================

import Link from 'next/link';
import { APP_CONFIG, NAV_LINKS } from '@/constants';

export function Footer() {
  return (
    <footer className="border-t border-(--color-hairline) mt-16">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          {/* Left: brand + tagline */}
          <div>
            <span className="text-sm font-headline text-(--color-text-primary)">
              {APP_CONFIG.name}
            </span>
            <p className="mt-1 text-xs text-(--color-text-secondary)">
              {APP_CONFIG.tagline}. {APP_CONFIG.challenge}.
            </p>
          </div>

          {/* Right: nav links + data sources */}
          <div className="flex gap-8 text-xs text-(--color-text-secondary)">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-(--color-text-primary) transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <a
                href="https://search.asf.alaska.edu/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-(--color-text-primary) transition-colors"
              >
                ASF DAAC
              </a>
              <a
                href="https://nisar.jpl.nasa.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-(--color-text-primary) transition-colors"
              >
                NISAR
              </a>
              <a
                href="https://earthengine.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-(--color-text-primary) transition-colors"
              >
                Earth Engine
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-4 border-t border-(--color-hairline-light) text-xs text-(--color-text-secondary)">
          © {new Date().getFullYear()} {APP_CONFIG.team}. Data: NASA, ESA Copernicus. Open source under Apache 2.0.
        </div>
      </div>
    </footer>
  );
}
