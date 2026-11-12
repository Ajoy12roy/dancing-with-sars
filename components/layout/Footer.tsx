import Link from 'next/link';
import TerraPulseLogo from '@/components/layout/TerraPulseLogo';

// External links verified on 2026-11-12 via DataCite, Crossref, and direct HTTP probe
interface VerifiedPaper {
  label: string;
  href: string;
  fullTitle: string;
}

const VERIFIED_PAPERS: readonly VerifiedPaper[] = [
  {
    label: "Science Users' Handbook [2025]",
    href: 'https://doi.org/10.48577/jpl.UD4HV3',
    fullTitle: "NASA-ISRO SAR (NISAR) Mission Science Users’ Handbook - second edition",
  },
  {
    label: 'Langtang Hazard Cascade [2026]',
    href: 'https://doi.org/10.3390/rs18213727',
    fullTitle: 'Differential Rock–Ice Deformation Before the 2026 Langtang Hazard Cascade, Nepal: NISAR Observations and Geological Interpretation',
  },
  {
    label: 'Atmospheric Characterization [2026]',
    href: 'https://doi.org/10.1029/2026JD047910',
    fullTitle: 'Assessing Co‐Located NISAR and Sentinel‐1 Observations for Atmospheric Characterization',
  },
  {
    label: 'Hayli Gubbi Eruption [2026]',
    href: 'https://doi.org/10.1016/j.geog.2026.06.002',
    fullTitle: 'NISAR observations of contracting dike-driven crustal deformation during the 2025 Hayli Gubbi Eruption, Afar',
  },
] as const;

function GithubIcon({ className = 'w-5 h-5' }: { className?: string }) {
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* 4 Columns */}
        <nav aria-label="Footer Navigation" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Column 1: Brand */}
          <div className="flex flex-col items-start">
            <TerraPulseLogo size={44} tone="auto" />
            <p className="mt-3 text-[14px] leading-relaxed text-footer-text max-w-xs">
              Radar change detection with Sentinel-1 and NASA NISAR data.
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
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  Flood
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?mode=river-erosion"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  River Erosion
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?mode=deforestation"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  Deforestation
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?mode=surface-water"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  Surface Water
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="font-body font-semibold text-[16px] text-footer-heading mb-3">
              Resources
            </h3>
            <ul className="flex flex-col space-y-1">
              <li>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/data-sources"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  Data sources
                </Link>
              </li>
              <li>
                <a
                  href="https://science.nasa.gov/mission/nisar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  NASA NISAR mission
                </a>
              </li>
              <li>
                <a
                  href="https://nisar-docs.asf.alaska.edu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  NISAR data guide
                </a>
              </li>
              <li className="pt-1">
                <details className="group">
                  <summary className="flex items-center gap-1.5 cursor-pointer select-none min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal list-none [&::-webkit-details-marker]:hidden">
                    <svg
                      className="w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-open:rotate-90"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    <span>Research papers</span>
                  </summary>
                  <ul className="pl-5 pt-1 space-y-1">
                    {VERIFIED_PAPERS.map((paper) => (
                      <li key={paper.href}>
                        <a
                          href={paper.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${paper.fullTitle}, opens in a new tab`}
                          className="inline-flex items-center min-h-8 text-[13px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                        >
                          {paper.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div>
            <h3 className="font-body font-semibold text-[16px] text-footer-heading mb-3">
              Connect
            </h3>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Ajoy12roy/dancing-with-sars"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-footer-border text-footer-text hover:text-footer-link-hover hover:border-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                <GithubIcon className="w-5 h-5 shrink-0" />
              </a>
            </div>
          </div>
        </nav>

        {/* Thin divider */}
        <div className="w-full border-t border-footer-rule mt-8 mb-4" />

        {/* Bottom row (copyright left, legal links right, stacks below sm) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-footer-text">
          <p>© 2026 TerraPulse. NASA Space Apps Challenge 2026 submission.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/privacy"
              className="inline-flex items-center min-h-9 text-[13px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center min-h-9 text-[13px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Condensed credit paragraph below */}
        <div className="mt-4 pt-3 border-t border-footer-rule/50 text-[12px] text-footer-text leading-relaxed">
          <p>
            Contains modified Copernicus Sentinel-1 data (2026), processed with Google Earth Engine. NISAR data: NASA/ISRO, distributed by ASF DAAC. Population data: WorldPop (2020), CC BY 4.0. Basemap overlays incorporate OpenStreetMap open data (&copy; OpenStreetMap contributors). Independent hackathon project, not endorsed by NASA.
          </p>
        </div>
      </div>
    </footer>
  );
}
