import Link from 'next/link';

export function AttributionStrip() {
  return (
    <footer className="py-14 border-t border-hairline/60 text-center flex flex-col items-center mx-auto" aria-label="Attribution and Navigation Links">
      <div className="space-y-3 max-w-3xl mx-auto">
        <p className="text-xs text-text-secondary leading-relaxed text-center">
          All observation scenes are sourced from public, open-access Earth observation constellations. Synthetic Aperture Radar data is captured by the Copernicus Sentinel-1 C-band constellation (European Space Agency / European Commission) and NASA-ISRO NISAR L-band GCOV (NISAR_L2_GCOV_PROVISIONAL_V1), PROVISIONAL, from Alaska Satellite Facility (ASF) DAAC. Contains modified Copernicus Sentinel data (2026), processed with Google Earth Engine. Population exposure estimates incorporate WorldPop 2020 open demographic data (CC BY 4.0). Basemap overlays incorporate OpenStreetMap open data (&copy; OpenStreetMap contributors). Independent hackathon project, not endorsed by NASA.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 text-xs font-body font-medium">
          <Link
            href="/explore"
            className="text-teal hover:underline transition-colors"
          >
            Explore the analysis &rarr;
          </Link>
          <Link
            href="/how-it-works"
            className="text-teal hover:underline transition-colors"
          >
            How it works &rarr;
          </Link>
          <Link
            href="/data-sources"
            className="text-teal hover:underline transition-colors"
          >
            Data sources &rarr;
          </Link>
        </div>
      </div>
    </footer>
  );
}
