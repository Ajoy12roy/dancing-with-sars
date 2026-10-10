import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Sources — Dancing with the SARs',
  description:
    'Dataset citations, licensing, and processing methodology for the SAR data used in this project.',
};

export default function DataSourcesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-headline font-semibold text-(--color-text-primary)">
        Data Sources & Methodology
      </h1>
      <p className="mt-3 text-(--color-text-secondary) max-w-lg">
        NASA and ESA dataset citations, licensing terms, and a transparent
        description of every processing step applied to the raw SAR data.
      </p>

      <section className="mt-12 border-t border-(--color-hairline) pt-8">
        <h2 className="text-2xl font-headline font-semibold text-(--color-text-primary)">
          Datasets
        </h2>
        
        <div className="mt-6 flex flex-col gap-6">
          <div className="bg-(--color-paper-warm) border border-(--color-hairline) p-5 rounded-[2px]">
            <h3 className="font-headline font-semibold text-lg text-(--color-text-primary) flex items-center gap-3">
              Primary SAR Imagery 
              <span className="text-xs px-2 py-0.5 bg-(--color-rust-faint) text-(--color-rust) font-data rounded-[2px]">
                TO BE FINALIZED
              </span>
            </h3>
            <p className="mt-3 text-(--color-text-secondary) text-sm">
              Dataset names used are placeholders pending the <span className="font-data text-(--color-teal)">28 Oct 2026</span> official statement.
            </p>
            <ul className="mt-5 flex flex-col gap-3 text-sm text-(--color-text-secondary)">
              <li><strong>Source:</strong> ASF DAAC / Google Earth Engine</li>
              <li><strong>License:</strong> Open Data / Public Domain</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-12 border-t border-(--color-hairline) pt-8">
        <h2 className="text-2xl font-headline font-semibold text-(--color-text-primary)">
          Processing Methodology
        </h2>
        <p className="mt-3 text-(--color-text-secondary) max-w-3xl">
          Our SAR change-detection pipeline is deterministic and transparent, avoiding black-box AI in favor of explainable statistical thresholds.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border-l-2 border-(--color-teal) pl-5">
            <h3 className="font-headline font-semibold text-(--color-text-primary)">
              1. Alignment & Calibration
            </h3>
            <p className="mt-2 text-sm text-(--color-text-secondary)">
              Input rasters are reprojected and resampled using bilinear interpolation to ensure exact grid alignment. Data is then converted to a logarithmic decibel (dB) scale if provided in linear power or amplitude format.
            </p>
          </div>
          <div className="border-l-2 border-(--color-teal) pl-5">
            <h3 className="font-headline font-semibold text-(--color-text-primary)">
              2. Speckle Reduction
            </h3>
            <p className="mt-2 text-sm text-(--color-text-secondary)">
              To mitigate inherent SAR speckle noise, a <span className="font-data text-(--color-teal)">5×5</span> median filter is applied to both the baseline and subsequent images before comparison.
            </p>
          </div>
          <div className="border-l-2 border-(--color-teal) pl-5">
            <h3 className="font-headline font-semibold text-(--color-text-primary)">
              3. Change Thresholding
            </h3>
            <p className="mt-2 text-sm text-(--color-text-secondary)">
              We compute the absolute pixel-wise difference in dB. A threshold (default <span className="font-data text-(--color-teal)">3.0 dB</span>) is applied to generate a binary change mask, representing areas where backscatter power has doubled or halved—a common heuristic for significant structural change.
            </p>
          </div>
          <div className="border-l-2 border-(--color-teal) pl-5">
            <h3 className="font-headline font-semibold text-(--color-text-primary)">
              4. Statistical Output
            </h3>
            <p className="mt-2 text-sm text-(--color-text-secondary)">
              Finally, we calculate the percentage of changed pixels, estimate the affected area in <span className="font-data text-(--color-teal)">km²</span>, and compute a confidence score bounded up to <span className="font-data text-(--color-teal)">100%</span> based on how far the mean change value exceeds our chosen threshold.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
