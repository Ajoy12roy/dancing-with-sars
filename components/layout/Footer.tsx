import Link from 'next/link';
import TerraPulseLogo from '@/components/layout/TerraPulseLogo';

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

          {/* Column 3: Documentation */}
          <div>
            <h3 className="font-body font-semibold text-[16px] text-footer-heading mb-3">
              Documentation
            </h3>
            <ul className="flex flex-col space-y-1">
              <li>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  How it works
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
                <Link
                  href="/how-it-works#ai-usage"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  AI usage
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Project */}
          <div>
            <h3 className="font-body font-semibold text-[16px] text-footer-heading mb-3">
              Project
            </h3>
            <ul className="flex flex-col space-y-1">
              <li>
                <Link
                  href="/about"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Ajoy12roy/dancing-with-sars"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center min-h-9 text-[14px] text-footer-text hover:text-footer-link-hover transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </nav>

        {/* Thin divider */}
        <div className="w-full border-t border-footer-rule mt-8 mb-4" />

        {/* Bottom row (copyright left, legal links right, stacks below sm) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-footer-text">
          <p>© 2026 TerraPulse. Built for the NASA International Space Apps Challenge 2026.</p>
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
            Contains modified Copernicus Sentinel data (2026), processed with Google Earth Engine. Synthetic Aperture Radar data captured by Copernicus Sentinel-1 GRD (ESA) via GEE and NASA-ISRO NISAR L-band (PROVISIONAL), distributed by ASF DAAC (NASA&apos;s SAR data center). Population data: WorldPop (2020), CC BY 4.0. Basemap overlays incorporate OpenStreetMap open data (&copy; OpenStreetMap contributors). Independent hackathon project, not endorsed by NASA.
          </p>
        </div>
      </div>
    </footer>
  );
}
