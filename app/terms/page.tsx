import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use — TerraPulse',
  description:
    'Terms of use, open-access remote sensing data policy, and liability limitations for the TerraPulse platform.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <span className="text-xs font-data uppercase tracking-wider text-teal">
          Legal & Operational Framework
        </span>
        <h1 className="mt-2 text-3xl md:text-4xl font-headline font-semibold text-text-primary">
          Terms of Use
        </h1>
        <p className="mt-3 text-base text-text-secondary max-w-2xl leading-relaxed">
          Operational terms, data licensing conditions, and usage policies for the TerraPulse platform.
        </p>
      </div>

      <div className="space-y-8">
        <section className="border-t border-hairline pt-6">
          <h2 className="text-xl font-headline font-semibold text-text-primary">
            1. Scientific & Screening Use
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            TerraPulse is an open-source geospatial platform developed for rapid environmental monitoring, scientific screening, and disaster situational awareness. Classification masks, segmented contours, and calculated metric extents (km²) are automated approximations derived from satellite radar backscatter and do not replace legal, cadastral, or on-the-ground engineering surveys.
          </p>
        </section>

        <section className="border-t border-hairline pt-6">
          <h2 className="text-xl font-headline font-semibold text-text-primary">
            2. Satellite Data & Attribution
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            Earth observation data accessed through this platform is provided under public open-access licenses. The demo cases use Copernicus Sentinel-1 C-band GRD data (ESA), obtained through Google Earth Engine. NISAR L-band support is planned future work; not used in any current case. Users agree to maintain appropriate attribution as detailed in our Data Sources page when reproducing imagery or findings.
          </p>
        </section>

        <section className="border-t border-hairline pt-6">
          <h2 className="text-xl font-headline font-semibold text-text-primary">
            3. Open Source License
          </h2>
          <div className="mt-3 p-5 bg-surface border border-hairline rounded-[2px]">
            <p className="text-xs font-data text-text-secondary leading-relaxed">
              TerraPulse is distributed under the <span className="text-text-primary font-medium">MIT License</span>. You are free to inspect, modify, and distribute the software in accordance with the terms of the MIT License.
            </p>
          </div>
        </section>

        <section className="border-t border-hairline pt-6">
          <h2 className="text-xl font-headline font-semibold text-text-primary">
            4. Limitation of Liability
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            The software and data outputs are provided &quot;as is&quot;, without warranty of any kind, express or implied. In no event shall the authors, contributors, or affiliated institutions be held liable for any damages, emergency response delays, or operational decisions arising from the use of this software.
          </p>
        </section>
      </div>
    </div>
  );
}
