import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import TerraPulseLogo from '@/components/layout/TerraPulseLogo';

function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-footer-border bg-footer-bg text-footer-text transition-colors duration-150">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* 4 Columns (desktop 4 cols, 2 cols below 1024px, 1 col below 640px) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.1fr_0.8fr] gap-8 lg:gap-12">
          {/* Column 1: Brand */}
          <div className="flex flex-col items-start">
            <TerraPulseLogo size={44} tone="auto" />
            <p className="mt-4 text-[14px] leading-relaxed text-footer-text max-w-sm">
              A scientific geospatial platform that compares before/after Synthetic Aperture Radar (SAR) satellite imagery to detect, quantify, and explain surface changes — including floods, riverbank erosion, deforestation, and water body dynamics.
            </p>
          </div>

          {/* Column 2: Explore */}
          <div>
            <h3 className="font-body font-semibold text-[16px] text-footer-heading mb-3">
              Explore
            </h3>
            <ul className="flex flex-col space-y-1">
              <li>
                <Link
                  href="/explore?mode=flood"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  Flood
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?mode=erosion"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  River Erosion
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?mode=deforestation"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  Deforestation
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?mode=water"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  Surface Water
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Project */}
          <div>
            <h3 className="font-body font-semibold text-[16px] text-footer-heading mb-3">
              Project
            </h3>
            <ul className="flex flex-col space-y-1">
              <li>
                <Link
                  href="/#about"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/data-sources"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  Data Source
                </Link>
              </li>
              <li>
                <a
                  href="https://www.spaceappschallenge.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  <span>NASA Space Apps Challenge</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.earthdata.nasa.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  <span>NASA Earthdata</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="https://search.asf.alaska.edu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
                >
                  <span>ASF Data Search</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div>
            <h3 className="font-body font-semibold text-[16px] text-footer-heading mb-3">
              Connect
            </h3>
            <div className="flex flex-col space-y-1">
              <a
                href="https://github.com/Ajoy12roy/dancing-with-sars"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TerraPulse on GitHub"
                className="inline-flex items-center gap-2 min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors"
              >
                <GithubIcon className="w-5 h-5 shrink-0" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>

        {/* Full-width rule */}
        <div className="w-full border-t border-footer-rule mt-10 mb-6" />

        {/* Bottom bar (copyright left, legal links right, stacks below sm) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-footer-text">
          <div className="flex flex-col">
            <p>© 2026 TerraPulse. Built for the NASA International Space Apps Challenge 2026.</p>
            <p className="mt-1 text-[12px]">Independent hackathon project, not endorsed by NASA.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/privacy"
              className="inline-flex items-center min-h-9 text-[13px] text-footer-text hover:text-footer-link-hover transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center min-h-9 text-[13px] text-footer-text hover:text-footer-link-hover transition-colors"
            >
              Terms and Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
