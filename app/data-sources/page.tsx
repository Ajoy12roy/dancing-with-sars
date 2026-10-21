import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Sources & Methodology — Dancing with the SARs',
  description:
    'Dataset citations, Sentinel-1 acquisition dates for demo AOIs, processing software stack, project license, and satellite attribution.',
};

export default function DataSourcesPage() {
  const demoAois = [
    {
      id: 'sylhet',
      name: 'Sylhet Flood 2022',
      mode: 'Flood Inundation',
      dateA: '2022-05-01',
      dateB: '2022-06-21',
      interval: '51 days',
      bounds: '24.8499°N – 24.9802°N, 91.7999°E – 91.9501°E',
      monitoredArea: '218.10 km²',
      primaryResult: 'Flooded Area: 37.19 km²',
      description: 'Pre-monsoon wetland baseline to peak monsoon inundation across the Surma river basin in northeastern Bangladesh.',
    },
    {
      id: 'jamuna',
      name: 'Jamuna River Erosion 2019 to 2024',
      mode: 'River Erosion & Accretion',
      dateA: '2019-02-15',
      dateB: '2024-02-15',
      interval: '1,826 days (5.0 years)',
      bounds: '24.2998°N – 24.5501°N, 89.6498°E – 89.9500°E',
      monitoredArea: '842.38 km²',
      primaryResult: 'Erosion: 47.59 km² (9.52 km²/yr), Accretion: 42.38 km²',
      description: 'Five-year braided channel migration along the Brahmaputra-Jamuna river corridor, compared at identical low-water dry season epochs.',
    },
    {
      id: 'amazon',
      name: 'Amazon Deforestation',
      mode: 'Forest Canopy Loss',
      dateA: '2021-01-01',
      dateB: '2023-01-01',
      interval: '730 days (2.0 years)',
      bounds: '10.3500°S – 10.1499°S, 62.2001°W – 61.9999°W',
      monitoredArea: '485.21 km²',
      primaryResult: 'Forest Canopy Loss: 0.62 km²',
      description: 'Two-year multi-temporal canopy backscatter loss detection in the Rondônia region of the southern Amazon basin.',
    },
    {
      id: 'tanguar',
      name: 'Tanguar Haor Seasonal Water',
      mode: 'Surface Water Dynamics',
      dateA: '2023-02-15',
      dateB: '2023-08-15',
      interval: '181 days',
      bounds: '25.0498°N – 25.2201°N, 90.9798°E – 91.2002°E',
      monitoredArea: '418.40 km²',
      primaryResult: 'Initial: 35.99 km² → Final: 298.31 km² (+262.32 km²)',
      description: 'Cyclic pre-monsoon dry season baseline to peak monsoon wetland expansion across a Ramsar-designated freshwater haor.',
    },
  ];

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
          <span className="text-xs font-data uppercase tracking-wider text-(--color-teal)">
            Data Governance & Citations
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-headline font-semibold text-(--color-text-primary)">
          Data Sources & Methodology
        </h1>
        <p className="mt-3 text-base text-(--color-text-secondary) max-w-2xl leading-relaxed">
          Dataset provenance, exact acquisition dates for demo Areas of Interest (AOIs), processing software
          stack, project licensing, and third-party data attributions.
        </p>
      </div>

      {/* Primary Datasets */}
      <section className="border-t border-(--color-hairline) pt-8 mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-headline font-semibold text-(--color-text-primary)">
            Satellite Datasets
          </h2>
          <span className="text-xs font-data px-2.5 py-1 bg-(--color-paper-warm) border border-(--color-hairline) text-(--color-rust)">
            Pending Statement
          </span>
        </div>

        <div className="bg-(--color-paper-warm) border border-(--color-hairline) p-6 rounded-[2px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-(--color-hairline) pb-4 mb-4">
            <div>
              <h3 className="font-headline font-semibold text-lg text-(--color-text-primary)">
                Copernicus Sentinel-1 C-Band SAR (GRD)
              </h3>
              <p className="text-xs text-(--color-text-secondary) mt-0.5">
                Synthetic Aperture Radar Ground Range Detected, Interferometric Wide (IW) swath mode
              </p>
            </div>
            <div className="text-xs font-data text-(--color-teal)">
              Level-1 GRD / 10m Spatial Resolution
            </div>
          </div>

          <p className="text-sm text-(--color-text-secondary) leading-relaxed">
            SAR data used across our demo analyses is sourced from Copernicus Sentinel-1 via{' '}
            <strong className="text-(--color-text-primary)">Google Earth Engine (GEE)</strong> and the{' '}
            <strong className="text-(--color-text-primary)">Alaska Satellite Facility (ASF) DAAC</strong>.
          </p>

          <div className="mt-4 p-3 bg-(--color-paper) border border-(--color-hairline) rounded-[2px]">
            <p className="text-xs font-data text-(--color-rust) leading-relaxed">
              <strong>Official Challenge Status:</strong> Dataset selections and finalized asset catalogs are to be finalized after the 28 October 2026 official challenge statement.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-data border-t border-(--color-hairline) pt-4">
            <div>
              <span className="text-(--color-text-secondary) block">Sensor Frequency:</span>
              <span className="text-(--color-text-primary)">C-Band (5.405 GHz)</span>
            </div>
            <div>
              <span className="text-(--color-text-secondary) block">Available Polarizations:</span>
              <span className="text-(--color-text-primary)">VV (Co-pol), VH (Cross-pol)</span>
            </div>
            <div>
              <span className="text-(--color-text-secondary) block">Access Gateways:</span>
              <span className="text-(--color-text-primary)">GEE & ASF Vertex DAAC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Demo AOI Acquisition Dates */}
      <section className="border-t border-(--color-hairline) pt-8 mb-12">
        <h2 className="text-xl md:text-2xl font-headline font-semibold text-(--color-text-primary) mb-2">
          Demo AOI Acquisitions & Metadata
        </h2>
        <p className="text-sm text-(--color-text-secondary) mb-6">
          Exact capture dates, temporal intervals, bounding limits, and computed metrics loaded directly from{' '}
          <code className="font-data text-xs text-(--color-teal)">result.json</code> files generated by the Python pipeline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demoAois.map((aoi) => (
            <div
              key={aoi.id}
              className="border border-(--color-hairline) bg-(--color-paper-warm) p-5 rounded-[2px] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-(--color-hairline) pb-2 mb-3">
                  <h3 className="font-headline font-semibold text-base text-(--color-text-primary)">
                    {aoi.name}
                  </h3>
                  <span className="text-xs font-data px-2 py-0.5 bg-(--color-paper) border border-(--color-hairline) text-(--color-teal)">
                    {aoi.mode}
                  </span>
                </div>
                <p className="text-xs text-(--color-text-secondary) leading-relaxed mb-4">
                  {aoi.description}
                </p>

                <div className="space-y-2 text-xs font-data border-t border-(--color-hairline) pt-3">
                  <div className="flex justify-between">
                    <span className="text-(--color-text-secondary)">Baseline Date (A):</span>
                    <span className="text-(--color-text-primary)">{aoi.dateA}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--color-text-secondary)">Comparison Date (B):</span>
                    <span className="text-(--color-text-primary)">{aoi.dateB}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--color-text-secondary)">Interval Duration:</span>
                    <span className="text-(--color-teal)">{aoi.interval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--color-text-secondary)">Monitored Footprint:</span>
                    <span className="text-(--color-text-primary)">{aoi.monitoredArea}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--color-text-secondary)">Geographic Bounds:</span>
                    <span className="text-(--color-text-secondary) text-[11px]">{aoi.bounds}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-(--color-hairline) bg-(--color-paper) p-2.5 rounded-[2px]">
                <span className="text-[11px] text-(--color-text-secondary) block">Pipeline Metric Result:</span>
                <span className="text-xs font-data text-(--color-teal) font-medium">
                  {aoi.primaryResult}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Processing Software Stack */}
      <section className="border-t border-(--color-hairline) pt-8 mb-12">
        <h2 className="text-xl md:text-2xl font-headline font-semibold text-(--color-text-primary) mb-2">
          Processing Software & Libraries
        </h2>
        <p className="text-sm text-(--color-text-secondary) mb-6">
          The backend service is written in Python and uses battle-tested open-source geospatial and scientific libraries.
          All computations run deterministically on local hardware without cloud black-box services.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {softwareStack.map((tool) => (
            <div
              key={tool.name}
              className="border border-(--color-hairline) bg-(--color-paper-warm) p-4 rounded-[2px]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-data font-semibold text-sm text-(--color-teal)">
                  {tool.name}
                </span>
                <span className="text-[11px] font-data text-(--color-text-secondary)">
                  Open Source
                </span>
              </div>
              <h3 className="font-headline font-semibold text-xs text-(--color-text-primary) mb-2">
                {tool.role}
              </h3>
              <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                {tool.details}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Project License & Attributions */}
      <section className="border-t border-(--color-hairline) pt-8">
        <h2 className="text-xl md:text-2xl font-headline font-semibold text-(--color-text-primary) mb-6">
          License & Third-Party Attributions
        </h2>

        <div className="space-y-6">
          <div className="border border-(--color-hairline) bg-(--color-paper-warm) p-5 rounded-[2px]">
            <div className="flex items-center justify-between border-b border-(--color-hairline) pb-3 mb-3">
              <h3 className="font-headline font-semibold text-base text-(--color-text-primary)">
                Project Software License
              </h3>
              <span className="text-xs font-data text-(--color-teal) px-2 py-0.5 bg-(--color-paper) border border-(--color-hairline)">
                MIT License
              </span>
            </div>
            <p className="text-xs text-(--color-text-secondary) leading-relaxed">
              This application and its companion Python processing service (<code className="font-data text-xs">python-service/process_change.py</code>)
              are released under the <strong className="text-(--color-text-primary)">MIT License</strong>. You are free to inspect,
              modify, distribute, and utilize the code for academic research, humanitarian disaster management, and commercial applications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-(--color-hairline) bg-(--color-paper-warm) p-5 rounded-[2px]">
              <h3 className="font-headline font-semibold text-base text-(--color-text-primary) mb-2">
                Copernicus Sentinel Data
              </h3>
              <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                Contains modified Copernicus Sentinel data [2019–2024], processed by the European Space Agency (ESA).
                Sentinel data is made freely available under the European Commission&apos;s Copernicus Open Access Policy.
              </p>
              <div className="mt-3 text-[11px] font-data text-(--color-text-secondary)">
                Attribution: © European Space Agency (ESA) / Copernicus Sentinel
              </div>
            </div>

            <div className="border border-(--color-hairline) bg-(--color-paper-warm) p-5 rounded-[2px]">
              <h3 className="font-headline font-semibold text-base text-(--color-text-primary) mb-2">
                OpenStreetMap Contributors
              </h3>
              <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                Interactive map baselayers, reference coastlines, and geographic context are provided by OpenStreetMap.
                Data is licensed under the Open Data Commons Open Database License (ODbL).
              </p>
              <div className="mt-3 text-[11px] font-data text-(--color-text-secondary)">
                Attribution: © OpenStreetMap contributors
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
