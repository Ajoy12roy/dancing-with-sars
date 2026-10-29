import type { Metadata } from 'next';
import { getReadyCaseStudies, type CaseStudyModule } from '@/lib/case-studies';

export const metadata: Metadata = {
  title: 'Data Sources & Methodology — Dancing with the SARs',
  description:
    'Dataset citations, Sentinel-1 acquisition dates for demo AOIs, processing software stack, project license, and satellite attribution.',
};

const CASE_STUDY_MODULES: { id: CaseStudyModule; title: string }[] = [
  { id: 'flood', title: 'Flood Inundation' },
  { id: 'river-erosion', title: 'River Bank Erosion' },
  { id: 'deforestation', title: 'Forest Canopy Loss' },
  { id: 'surface-water', title: 'Surface Water Dynamics' },
];

export default function DataSourcesPage() {
  const demoAois = getReadyCaseStudies();

  const softwareStack = [
    {
      name: 'rasterio',
      role: 'Geospatial Raster I/O & Warping',
      details: 'Windowed block reading (block_windows), nodata masking, coordinate reference system (CRS) parsing, and EPSG:4326 reprojection powered by GDAL.',
    },
    {
      name: 'numpy',
      role: 'Vectorized Array Computing',
      details: 'Automatic decibel (dB) scale detection, 10·log₁₀ linear-to-dB conversion, non-finite masking, transition matrices, and geodesic pixel area computations.',
    },
    {
      name: 'scipy',
      role: 'Spatial Filtering & Morphological Analysis',
      details: 'scipy.ndimage.median_filter for 5×5 speckle noise suppression, scipy.ndimage.label for 20-pixel connected component filtering, and scipy.ndimage.binary_dilation for river corridor buffering.',
    },
    {
      name: 'Pillow (PIL)',
      role: 'Cartographic Raster Export',
      details: 'Categorical RGBA PNG generation for web overlays, color-coded per the survey design system palette.',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-data uppercase tracking-wider text-teal">
            Data Governance & Citations
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-headline font-semibold text-text-primary">
          Data Sources & Methodology
        </h1>
        <p className="mt-3 text-base text-text-secondary max-w-2xl leading-relaxed">
          Dataset provenance, exact acquisition dates for demo Areas of Interest (AOIs), processing software
          stack, project licensing, and third-party data attributions.
        </p>
      </div>

      {/* Primary Datasets */}
      <section className="border-t border-hairline pt-8 mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary">
            Satellite Datasets
          </h2>
          <span className="text-xs font-data px-2.5 py-1 bg-surface-2 border border-hairline text-teal">
            Verified Datasets
          </span>
        </div>

        <div className="bg-surface border border-hairline p-6 rounded-[2px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-hairline pb-4 mb-4">
            <div>
              <h3 className="font-headline font-semibold text-lg text-text-primary">
                Copernicus Sentinel-1 C-Band SAR (GRD)
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Synthetic Aperture Radar Ground Range Detected, Interferometric Wide (IW) swath mode
              </p>
            </div>
            <div className="text-xs font-data text-teal">
              Level-1 GRD / 10m Spatial Resolution
            </div>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            SAR data used across our demo analyses is captured by Copernicus Sentinel-1 C-band (ESA), obtained through{' '}
            <strong className="text-text-primary">Google Earth Engine (GEE)</strong>. Identical scenes are also archived and freely distributed by NASA&apos;s{' '}
            <strong className="text-text-primary">Alaska Satellite Facility (ASF) DAAC</strong>.
          </p>

          <div className="mt-4 p-3 bg-surface-2 border border-hairline rounded-[2px]">
            <p className="text-xs font-data text-teal leading-relaxed">
              <strong>Required Attribution:</strong> Contains modified Copernicus Sentinel data (2026), processed with Google Earth Engine.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-data border-t border-hairline pt-4">
            <div>
              <span className="text-text-secondary block">Sensor Frequency:</span>
              <span className="text-text-primary">C-Band (5.405 GHz)</span>
            </div>
            <div>
              <span className="text-text-secondary block">Available Polarizations:</span>
              <span className="text-text-primary">VV (Co-pol), VH (Cross-pol)</span>
            </div>
            <div>
              <span className="text-text-secondary block">Access Gateways:</span>
              <span className="text-text-primary">GEE & ASF Vertex DAAC</span>
            </div>
          </div>
        </div>
      </section>

      {/* How anyone can get this NASA-accessible SAR data */}
      <section className="border-t border-hairline pt-8 mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary">
            How anyone can get this NASA-accessible SAR data
          </h2>
          <span className="text-xs font-data px-2.5 py-1 bg-surface-2 border border-hairline text-teal">
            Open Access Guide
          </span>
        </div>

        <div className="bg-surface border border-hairline p-6 rounded-[2px] space-y-6">
          <p className="text-sm text-text-secondary leading-relaxed">
            Our demo cases were fetched through Google Earth Engine; the same Sentinel-1 scenes are also distributed by NASA&apos;s ASF DAAC. Any researcher, student, or disaster response team can independently access and download identical radar datasets for free using the steps below:
          </p>

          <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <li className="border border-hairline p-4 bg-surface-2 rounded-sm space-y-1.5">
              <span className="font-data text-teal font-semibold text-sm">Step 1: Open ASF Vertex</span>
              <p className="text-text-secondary leading-relaxed">
                Navigate to the <a href="https://search.asf.alaska.edu/" target="_blank" rel="noopener noreferrer" className="text-teal underline">ASF Data Search (Vertex)</a> portal, NASA&apos;s primary search and discovery interface for SAR imagery.
              </p>
            </li>
            <li className="border border-hairline p-4 bg-surface-2 rounded-sm space-y-1.5">
              <span className="font-data text-teal font-semibold text-sm">Step 2: Draw Your Area</span>
              <p className="text-text-secondary leading-relaxed">
                Use the interactive map drawing tools to define your Area of Interest (AOI) bounding box or polygon over any region worldwide.
              </p>
            </li>
            <li className="border border-hairline p-4 bg-surface-2 rounded-sm space-y-1.5">
              <span className="font-data text-teal font-semibold text-sm">Step 3: Choose Sentinel-1 GRD</span>
              <p className="text-text-secondary leading-relaxed">
                Under Dataset filters, select <strong>Sentinel-1</strong> and choose <strong>GRD (Ground Range Detected)</strong> imagery in IW (Interferometric Wide) mode with VV or VH polarization.
              </p>
            </li>
            <li className="border border-hairline p-4 bg-surface-2 rounded-sm space-y-1.5">
              <span className="font-data text-teal font-semibold text-sm">Step 4: Pick Dates &amp; Download</span>
              <p className="text-text-secondary leading-relaxed">
                Select your before and after acquisition dates to match your event window. Download the paired GeoTIFFs directly, or submit an on-demand Radiometric Terrain Correction (RTC) job using <a href="https://hyp3-docs.asf.alaska.edu/" target="_blank" rel="noopener noreferrer" className="text-teal underline">ASF HyP3</a>.
              </p>
            </li>
          </ol>

          <div className="border-t border-hairline pt-4">
            <span className="text-xs font-data uppercase tracking-wider text-text-primary block mb-3">
              Official NASA &amp; Open Data Portals:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-data">
              <a
                href="https://www.earthdata.nasa.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-hairline p-2.5 bg-surface-2 rounded-sm text-teal hover:underline flex items-center justify-between"
              >
                <span>NASA Earthdata</span>
                <span className="text-text-secondary" aria-hidden="true">↗</span>
              </a>
              <a
                href="https://asf.alaska.edu/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-hairline p-2.5 bg-surface-2 rounded-sm text-teal hover:underline flex items-center justify-between"
              >
                <span>ASF DAAC (SAR Data Center)</span>
                <span className="text-text-secondary" aria-hidden="true">↗</span>
              </a>
              <a
                href="https://search.asf.alaska.edu/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-hairline p-2.5 bg-surface-2 rounded-sm text-teal hover:underline flex items-center justify-between"
              >
                <span>ASF Data Search (Vertex)</span>
                <span className="text-text-secondary" aria-hidden="true">↗</span>
              </a>
              <a
                href="https://hyp3-docs.asf.alaska.edu/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-hairline p-2.5 bg-surface-2 rounded-sm text-teal hover:underline flex items-center justify-between"
              >
                <span>ASF HyP3 On-Demand Docs</span>
                <span className="text-text-secondary" aria-hidden="true">↗</span>
              </a>
              <a
                href="https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-hairline p-2.5 bg-surface-2 rounded-sm text-teal hover:underline flex items-center justify-between"
              >
                <span>GEE: COPERNICUS/S1_GRD</span>
                <span className="text-text-secondary" aria-hidden="true">↗</span>
              </a>
              <a
                href="https://nisar.jpl.nasa.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-hairline p-2.5 bg-surface-2 rounded-sm text-teal hover:underline flex items-center justify-between"
              >
                <span>NISAR Mission (Future Work)</span>
                <span className="text-text-secondary" aria-hidden="true">↗</span>
              </a>
              <a
                href="https://www.spaceappschallenge.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-hairline p-2.5 bg-surface-2 rounded-sm text-teal hover:underline flex items-center justify-between"
              >
                <span>NASA Space Apps Challenge</span>
                <span className="text-text-secondary" aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Demo AOI Acquisition Dates */}
      <section className="border-t border-hairline pt-8 mb-12">
        <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary mb-2">
          Demo AOI Acquisitions & Metadata
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Exact capture dates, temporal intervals, bounding limits, and computed metrics loaded directly from{' '}
          <code className="font-data text-xs text-teal">result.json</code> files generated by the Python pipeline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demoAois.map((aoi) => (
            <div
              key={aoi.id}
              className="border border-hairline bg-surface p-5 rounded-[2px] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-hairline pb-2 mb-3">
                  <h3 className="font-headline font-semibold text-base text-text-primary">
                    {aoi.name || aoi.title}
                  </h3>
                  <span className="text-xs font-data px-2 py-0.5 bg-surface-2 border border-hairline text-teal">
                    {aoi.modeLabel || aoi.module}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">
                  {aoi.description || aoi.summary}
                </p>

                <div className="space-y-2 text-xs font-data border-t border-hairline pt-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Baseline Date (A):</span>
                    <span className="text-text-primary">{aoi.dateA}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Comparison Date (B):</span>
                    <span className="text-text-primary">{aoi.dateB}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Interval Duration:</span>
                    <span className="text-teal">{aoi.interval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Monitored Footprint:</span>
                    <span className="text-text-primary">{aoi.monitoredArea}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5">
                    <span className="text-text-secondary">Geographic Bounds:</span>
                    <span className="text-text-secondary text-[11px] wrap-break-word">{aoi.boundsLabel || aoi.aoi?.note}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-hairline bg-surface-2 p-2.5 rounded-[2px]">
                <span className="text-[11px] text-text-secondary block">Pipeline Metric Result:</span>
                <span className="text-xs font-data text-teal font-medium">
                  {aoi.primaryResult}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Case Study Sources & Attributions by Module */}
      <section className="border-t border-hairline pt-8 mb-12">
        <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary mb-2">
          Case Study Sources & Citations
        </h2>
        <p className="text-sm text-text-secondary mb-6 font-sans">
          External reference citations, disaster mapping datasets, and satellite imagery attributions for every ready analysis case study.
        </p>

        <div className="space-y-8">
          {CASE_STUDY_MODULES.map((mod) => {
            const readyStudies = getReadyCaseStudies(mod.id);
            if (readyStudies.length === 0) return null;

            return (
              <div key={mod.id} className="border border-hairline bg-surface p-5 rounded-[2px] space-y-4">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <h3 className="font-headline font-semibold text-lg text-text-primary">
                    {mod.title}
                  </h3>
                  <span className="text-xs font-data px-2 py-0.5 bg-surface-2 border border-hairline text-teal">
                    {readyStudies.length} Ready Case {readyStudies.length === 1 ? 'Study' : 'Studies'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {readyStudies.map((cs) => (
                    <div
                      key={cs.id}
                      className="border border-hairline bg-surface-2 p-4 rounded-[2px] flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <h4 className="font-headline font-semibold text-sm text-text-primary mb-1">
                          {cs.title}
                        </h4>
                        {(cs.location || cs.country) && (
                          <p className="text-xs text-text-secondary font-sans mb-3">
                            {[cs.location, cs.country].filter(Boolean).join(', ')}
                          </p>
                        )}

                        {/* Source Links */}
                        {cs.sourceLinks && cs.sourceLinks.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            <span className="text-[11px] font-sans text-text-secondary block font-medium">
                              Reference Citations & Validation Links:
                            </span>
                            <ul className="space-y-1">
                              {cs.sourceLinks.map((link, idx) => (
                                <li key={idx}>
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-data text-teal hover:underline inline-flex items-center gap-1.5 transition-colors"
                                  >
                                    <span>{link.name}</span>
                                    <span className="text-[10px] text-text-secondary" aria-hidden="true">↗</span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Attribution Line */}
                      {cs.attribution && (
                        <div className="text-[11px] font-sans text-text-secondary pt-2 border-t border-hairline">
                          <span className="font-medium text-text-primary">Attribution: </span>
                          <span>{cs.attribution}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Processing Software Stack */}
      <section className="border-t border-hairline pt-8 mb-12">
        <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary mb-2">
          Processing Software & Libraries
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          The backend service is written in Python and uses battle-tested open-source geospatial and scientific libraries.
          All computations run deterministically on local hardware without cloud black-box services.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {softwareStack.map((tool) => (
            <div
              key={tool.name}
              className="border border-hairline bg-surface p-4 rounded-[2px]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-data font-semibold text-sm text-teal">
                  {tool.name}
                </span>
                <span className="text-[11px] font-data text-text-secondary">
                  Open Source
                </span>
              </div>
              <h3 className="font-headline font-semibold text-xs text-text-primary mb-2">
                {tool.role}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {tool.details}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Project License & Attributions */}
      <section className="border-t border-hairline pt-8">
        <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary mb-6">
          License & Third-Party Attributions
        </h2>

        <div className="space-y-6">
          <div className="border border-hairline bg-surface p-5 rounded-[2px]">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-3">
              <h3 className="font-headline font-semibold text-base text-text-primary">
                Project Software License
              </h3>
              <span className="text-xs font-data text-teal px-2 py-0.5 bg-surface-2 border border-hairline">
                MIT License
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              This application and its companion Python processing service (<code className="font-data text-xs">python-service/process_change.py</code>)
              are released under the <strong className="text-text-primary">MIT License</strong>. You are free to inspect,
              modify, distribute, and utilize the code for academic research, humanitarian disaster management, and commercial applications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-hairline bg-surface p-5 rounded-[2px]">
              <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                Copernicus Sentinel Data
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Contains modified Copernicus Sentinel data (2026), processed with Google Earth Engine.
                Sentinel data is made freely available under the European Commission&apos;s Copernicus Open Access Policy.
              </p>
              <div className="mt-3 text-[11px] font-data text-text-secondary">
                Attribution: Contains modified Copernicus Sentinel data (2026), processed with Google Earth Engine.
              </div>
            </div>

            <div className="border border-hairline bg-surface p-5 rounded-[2px]">
              <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                OpenStreetMap Contributors
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Interactive map baselayers, reference coastlines, and geographic context are provided by OpenStreetMap.
                Data is licensed under the Open Data Commons Open Database License (ODbL).
              </p>
              <div className="mt-3 text-[11px] font-data text-text-secondary">
                Attribution: © OpenStreetMap contributors
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
