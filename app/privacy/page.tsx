import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — TerraPulse',
  description:
    'Privacy architecture, zero telemetry collection, and local workstation processing guarantees of TerraPulse.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <span className="text-xs font-data uppercase tracking-wider text-teal">
          Data Governance & Privacy
        </span>
        <h1 className="mt-2 text-3xl md:text-4xl font-headline font-semibold text-text-primary">
          Privacy Policy
        </h1>
        <p className="mt-3 text-base text-text-secondary max-w-2xl leading-relaxed">
          How TerraPulse treats your uploaded geospatial data, environmental assets, and privacy.
        </p>
      </div>

      <div className="space-y-8">
        <section className="border-t border-hairline pt-6">
          <h2 className="text-xl font-headline font-semibold text-text-primary">
            1. Completely Offline & Local Execution
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            TerraPulse is engineered for field stations and humanitarian deployments where data sovereignty and connectivity are critical. Custom GeoTIFF rasters uploaded through the Explore interface are ingested and processed locally by your machine&apos;s Python service. Spatial rasters, boundaries, and metadata never leave your local environment.
          </p>
        </section>

        <section className="border-t border-hairline pt-6">
          <h2 className="text-xl font-headline font-semibold text-text-primary">
            2. Zero Telemetry & Tracking
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            We do not track user behavior, log search queries, or collect analytics. The platform uses zero tracking cookies, zero third-party advertising trackers, and zero external telemetry scripts.
          </p>
        </section>

        <section className="border-t border-hairline pt-6">
          <h2 className="text-xl font-headline font-semibold text-text-primary">
            3. AI Keys & Interpretation
          </h2>
          <div className="mt-3 p-5 bg-surface border border-hairline rounded-[2px]">
            <p className="text-xs font-data text-text-secondary leading-relaxed">
              When an optional <code className="text-teal">GEMINI_API_KEY</code> is configured, only high-level numerical metric summaries (such as inundated area in km² and percentage delta) are transmitted to generate plain-language environmental narratives. Full raw imagery rasters and pixel arrays are never sent over the wire.
            </p>
          </div>
        </section>

        <section className="border-t border-hairline pt-6">
          <h2 className="text-xl font-headline font-semibold text-text-primary">
            4. Local Storage Preferences
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            Client-side browser storage (<code className="font-data text-xs text-text-primary">localStorage</code>) is used exclusively to store your interface theme preference (<code className="font-data text-xs text-text-primary">light</code> or <code className="font-data text-xs text-text-primary">dark</code>) to ensure consistent rendering between visits.
          </p>
        </section>
      </div>
    </div>
  );
}
