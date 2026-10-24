// ========================================================================
// Footer — solid text tokens, no opacity-based muted text.
// ========================================================================

import Link from 'next/link';
import { APP_CONFIG, NAV_LINKS } from '@/constants';

export function Footer() {
  return (
    <footer className="border-t border-footer-border bg-footer-bg text-footer-text mt-16 transition-colors duration-150">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          {/* Left: brand + tagline */}
          <div>
            <span className="text-base font-semibold font-headline text-footer-text">
              {APP_CONFIG.name}
            </span>
            <p className="mt-1 text-[13px] text-footer-text-secondary leading-normal">
              {APP_CONFIG.tagline}. {APP_CONFIG.challenge}.
            </p>
          </div>

          {/* Right: nav links + data sources */}
          <div className="flex gap-8 text-sm text-footer-text-secondary">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-navbar-link-hover transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/#about"
                className="hover:text-navbar-link-hover transition-colors"
              >
                About
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              <a
                href="https://search.asf.alaska.edu/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-navbar-link-hover transition-colors"
              >
                ASF DAAC
              </a>
              <a
                href="https://nisar.jpl.nasa.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-navbar-link-hover transition-colors"
              >
                NISAR
              </a>
              <a
                href="https://earthengine.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-navbar-link-hover transition-colors"
              >
                Earth Engine
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-4 border-t border-footer-border text-[13px] text-footer-text-secondary">
          © {new Date().getFullYear()} TerraPulse. Data: NASA, ESA Copernicus. Open source under Apache 2.0.
        </div>
      </div>
    </footer>
  );
}
