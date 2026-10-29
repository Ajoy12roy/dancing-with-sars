'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { GraticuleFrame } from '@/components/layout/GraticuleFrame';

export function HowItWorksClient() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' as const },
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <motion.div
        initial={shouldReduceMotion ? 'visible' : 'hidden'}
        animate="visible"
        variants={containerVariants}
        className="mb-14"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-2">
          <span className="text-xs font-data uppercase tracking-wider text-teal">
            Deterministic SAR Pipeline
          </span>
          <span className="text-xs text-hairline">/</span>
          <span className="text-xs font-data text-text-secondary">
            python-service/process_change.py
          </span>
        </motion.div>
        <motion.h1
          variants={itemVariants}
          className="text-3xl md:text-4xl font-headline font-semibold text-text-primary"
        >
          How It Works
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="mt-3 text-base md:text-lg text-text-secondary max-w-3xl leading-relaxed"
        >
          The physical principles, algorithmic steps, calibrated thresholds, and mathematical formulas
          implemented in our Python SAR processing pipeline.
        </motion.p>
      </motion.div>

      <div className="space-y-12">
        {/* Core Processing Foundation */}
        <GraticuleFrame>
          <div className="p-6 md:p-8 bg-surface rounded-[2px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-2 h-2 rounded-none bg-teal" />
              <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary">
                Pipeline Foundation & Preprocessing
              </h2>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">
              All modes execute a shared sequence of deterministic preprocessing steps before specialized
              analysis. Every calculation operates on physical units without black-box approximations.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-hairline p-4 rounded-[2px] bg-surface-2">
                <h3 className="font-headline font-semibold text-base text-text-primary">
                  1. Automatic dB Scale Detection (<code className="font-data text-xs text-teal">to_db</code>)
                </h3>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                  The pipeline inspects input raster values to detect data scale automatically. If values span roughly{' '}
                  <span className="font-data text-text-primary">-60 to +25 dB</span> with at least 50% negative values,
                  the data is identified as calibrated decibels (dB) and retained directly. If values are strictly non-negative (linear power),
                  they are converted via <span className="font-data text-teal">10 · log₁₀(P)</span>.
                  Nodata and non-finite values (<span className="font-data">NaN, ±Inf</span>) are masked to{' '}
                  <span className="font-data">np.nan</span> and excluded from all statistics.
                </p>
              </div>

              <div className="border border-hairline p-4 rounded-[2px] bg-surface-2">
                <h3 className="font-headline font-semibold text-base text-text-primary">
                  2. Band & Polarization Mapping
                </h3>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                  Sentinel-1 rasters typically provide dual-polarization channels. If the file has 2 bands,{' '}
                  <span className="font-data text-text-primary">Band 1</span> is mapped to co-polarization (VV) and{' '}
                  <span className="font-data text-text-primary">Band 2</span> to cross-polarization (VH).
                  Single-band inputs default to Band 1 (VV). Water mapping relies on VV backscatter; deforestation analysis logs
                  an advisory when only VV is available, as VH offers superior sensitivity to forest canopy volume scattering.
                </p>
              </div>

              <div className="border border-hairline p-4 rounded-[2px] bg-surface-2">
                <h3 className="font-headline font-semibold text-base text-text-primary">
                  3. Windowed Reading & Decimation
                </h3>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                  Using <span className="font-data text-text-primary">rasterio.block_windows</span>, rasters are read in
                  windowed chunks. If total raster pixels exceed{' '}
                  <span className="font-data text-teal">100,000,000</span> (<code className="font-data text-xs">MAX_PIXELS_DECIMATE</code>),
                  a decimated version is read via bilinear resampling to maintain bounded memory consumption.
                </p>
              </div>

              <div className="border border-hairline p-4 rounded-[2px] bg-surface-2">
                <h3 className="font-headline font-semibold text-base text-text-primary">
                  4. Geodesic Pixel Area Calculation
                </h3>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                  For geographic coordinates (<span className="font-data">EPSG:4326</span> in degrees), pixel area is computed
                  using the scene center latitude (<span className="font-data">lat</span>):<br />
                  <span className="font-data text-teal">
                    width = |Δx°| · 111320 · cos(lat)
                  </span><br />
                  <span className="font-data text-teal">
                    height = |Δy°| · 110574
                  </span><br />
                  <span className="font-data text-teal">
                    area_km² = (width · height) / 1,000,000
                  </span><br />
                  Degree units are never treated as meters. For projected CRS, linear unit factors are applied.
                </p>
              </div>
            </div>
          </div>
        </GraticuleFrame>

        {/* Mode 1: Flood Inundation */}
        <GraticuleFrame>
          <div className="p-6 md:p-8 bg-surface rounded-[2px]">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-5">
              <div>
                <span className="text-xs font-data uppercase tracking-wider text-teal">Mode: flood</span>
                <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary">
                  Flood Inundation Analysis
                </h2>
              </div>
              <span className="text-xs font-data px-2.5 py-1 bg-surface-2 border border-hairline text-rust">
                Hazard Mapping
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                  The Physical Idea
                </h3>
                <p className="text-text-secondary leading-relaxed text-xs">
                  Calm, open surface water acts as a specular reflector for radar waves. The transmitted microwave pulse reflects
                  away from the satellite antenna rather than scattering back toward it. Consequently, standing water bodies
                  exhibit extremely low backscatter, appearing as distinctly dark regions (typically below -16 dB in VV)
                  in radar imagery.
                </p>

                <h3 className="font-headline font-semibold text-base text-text-primary mt-4 mb-2">
                  Exact Algorithmic Steps
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-text-secondary">
                  <li>Apply a <span className="font-data text-teal">5×5</span> spatial median filter to baseline (A) and post-event (B) images to suppress speckle noise.</li>
                  <li>Generate binary water masks: pixels where backscatter &lt; <span className="font-data text-teal">water_threshold</span>.</li>
                  <li>Filter out isolated noise clusters smaller than <span className="font-data text-teal">20 pixels</span> using 8-connectivity component labeling (<code className="font-data text-xs">scipy.ndimage.label</code>).</li>
                  <li>Compute pixel-wise water transition: Class 1 = Persistent water (1→1), Class 2 = Flooded area (0→1), Class 3 = Receded water (1→0).</li>
                </ol>
              </div>

              <div>
                <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                  Default Thresholds (from code)
                </h3>
                <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-1.5 text-xs font-data">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">DEFAULT_WATER_THRESHOLD_VV:</span>
                    <span className="text-teal">-16.0 dB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">DEFAULT_WATER_THRESHOLD_VH:</span>
                    <span className="text-teal">-22.0 dB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">DEFAULT_MIN_PIXELS:</span>
                    <span className="text-teal">20 pixels</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Spatial Median Filter:</span>
                    <span className="text-teal">5×5 window</span>
                  </div>
                </div>

                <h3 className="font-headline font-semibold text-base text-text-primary mt-4 mb-2">
                  How Numbers Are Computed
                </h3>
                <ul className="space-y-1.5 text-xs text-text-secondary">
                  <li>
                    <strong className="text-text-primary">Flooded Area:</strong> Count of Class 2 pixels × pixel area in km².
                  </li>
                  <li>
                    <strong className="text-text-primary">Persistent Water:</strong> Count of Class 1 pixels × pixel area in km².
                  </li>
                  <li>
                    <strong className="text-text-primary">Percent Changed:</strong> (Flooded pixels ÷ Total valid pixels) × 100%.
                  </li>
                  <li>
                    <strong className="text-text-primary">Signal strength:</strong> Mean absolute dB change across changed pixels, clipped at 10 dB and scaled to 0–100%. This measures the magnitude of radar backscatter difference; it is not a statistical probability or classification accuracy score.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </GraticuleFrame>

        {/* Mode 2: River Erosion */}
        <GraticuleFrame>
          <div className="p-6 md:p-8 bg-surface rounded-[2px]">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-5">
              <div>
                <span className="text-xs font-data uppercase tracking-wider text-teal">Mode: river-erosion</span>
                <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary">
                  River Erosion & Accretion Analysis
                </h2>
              </div>
              <span className="text-xs font-data px-2.5 py-1 bg-surface-2 border border-hairline text-teal">
                Channel Dynamics
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                  The Physical Idea
                </h3>
                <p className="text-text-secondary leading-relaxed text-xs">
                  Active braided and meandering rivers are continuous channels of low-backscatter water. When riverbanks collapse
                  or wash away (erosion), land turns into water immediately adjacent to the existing channel. Conversely, when sandbars
                  (chars) emerge or sediment deposits (accretion), water turns into land along channel margins. Distinguishing bank
                  erosion from distant inland agricultural ponding requires spatial adjacency to the active river corridor.
                </p>

                <h3 className="font-headline font-semibold text-base text-text-primary mt-4 mb-2">
                  Exact Algorithmic Steps
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-text-secondary">
                  <li>Extract water masks for Scene A and Scene B at -16.0 dB (VV) with 20-pixel component cleanup.</li>
                  <li>Identify persistent water (Class 1) defining the permanent river channel.</li>
                  <li>Dilate the persistent channel by <span className="font-data text-teal">river_buffer</span> (5 pixels) using morphological binary dilation (<code className="font-data text-xs">scipy.ndimage.binary_dilation</code>).</li>
                  <li>Label new-water connected components: components intersecting the dilated river are classified as <span className="font-data text-rust">River Bank Erosion</span>; non-intersecting components are classified as Other New Water.</li>
                  <li>Label lost-water connected components: components intersecting the dilated river are classified as <span className="font-data text-teal">River Accretion</span>; non-intersecting components are classified as Other Lost Water.</li>
                </ol>
              </div>

              <div>
                <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                  Default Thresholds (from code)
                </h3>
                <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-1.5 text-xs font-data">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Water Threshold:</span>
                    <span className="text-teal">-16.0 dB (VV) / -22.0 dB (VH)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">DEFAULT_RIVER_BUFFER:</span>
                    <span className="text-teal">5 pixels (dilation)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">DEFAULT_MIN_PIXELS:</span>
                    <span className="text-teal">20 pixels</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Structuring Element:</span>
                    <span className="text-teal">3×3 8-neighborhood</span>
                  </div>
                </div>

                <h3 className="font-headline font-semibold text-base text-text-primary mt-4 mb-2">
                  How Numbers Are Computed
                </h3>
                <ul className="space-y-1.5 text-xs text-text-secondary">
                  <li>
                    <strong className="text-text-primary">Erosion Area:</strong> Count of channel-intersecting new water pixels × pixel area in km².
                  </li>
                  <li>
                    <strong className="text-text-primary">Accretion Area:</strong> Count of channel-intersecting lost water pixels × pixel area in km².
                  </li>
                  <li>
                    <strong className="text-text-primary">Net Land Change:</strong> Accretion Area − Erosion Area (negative indicates net land loss).
                  </li>
                  <li>
                    <strong className="text-text-primary">Annualized Erosion Rate:</strong> Erosion Area ÷ (observation days ÷ 365.25), reported in km²/year when capture dates are supplied.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </GraticuleFrame>

        {/* Mode 3: Deforestation */}
        <GraticuleFrame>
          <div className="p-6 md:p-8 bg-surface rounded-[2px]">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-5">
              <div>
                <span className="text-xs font-data uppercase tracking-wider text-teal">Mode: deforestation</span>
                <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary">
                  Forest Canopy Loss Analysis
                </h2>
              </div>
              <span className="text-xs font-data px-2.5 py-1 bg-surface-2 border border-hairline text-rust">
                Canopy Depletion
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                  The Physical Idea
                </h3>
                <p className="text-text-secondary leading-relaxed text-xs">
                  Intact tropical forest canopies create high radar backscatter through multiple volume scattering among
                  leaves, branches, and tree trunks—particularly prominent in cross-polarization (VH). When forest canopy is cleared,
                  logged, or burned, volume scattering is replaced by smooth bare earth or pasture scattering, resulting in a marked
                  reduction in backscatter power (negative ΔdB).
                </p>

                <h3 className="font-headline font-semibold text-base text-text-primary mt-4 mb-2">
                  Exact Algorithmic Steps
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-text-secondary">
                  <li>Apply 5×5 spatial median filtering to baseline and post-clearing rasters.</li>
                  <li>Compute signed difference image: <span className="font-data text-teal">ΔdB = Scene B(dB) − Scene A(dB)</span>.</li>
                  <li>Apply threshold test: flag pixels where <span className="font-data text-teal">ΔdB ≤ -3.0 dB</span> (power halved or more).</li>
                  <li>Remove isolated speckle components smaller than 20 pixels using 8-connectivity component labeling.</li>
                </ol>
              </div>

              <div>
                <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                  Default Thresholds (from code)
                </h3>
                <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-1.5 text-xs font-data">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">DEFAULT_LOSS_THRESHOLD_DB:</span>
                    <span className="text-rust">-3.0 dB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">DEFAULT_MIN_PIXELS:</span>
                    <span className="text-teal">20 pixels</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Recommended Polarization:</span>
                    <span className="text-teal">VH (Cross-polarization)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Median Filter Window:</span>
                    <span className="text-teal">5×5</span>
                  </div>
                </div>

                <h3 className="font-headline font-semibold text-base text-text-primary mt-4 mb-2">
                  How Numbers Are Computed
                </h3>
                <ul className="space-y-1.5 text-xs text-text-secondary">
                  <li>
                    <strong className="text-text-primary">Forest Canopy Loss:</strong> Count of filtered loss pixels × pixel area in km².
                  </li>
                  <li>
                    <strong className="text-text-primary">Affected Area:</strong> Equals the detected canopy loss area.
                  </li>
                  <li>
                    <strong className="text-text-primary">Single-band Advisory:</strong> When run on single-band VV rasters, the pipeline issues a warning indicating that VH cross-polarization is significantly more sensitive to volume scattering.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </GraticuleFrame>

        {/* Mode 4: Surface Water */}
        <GraticuleFrame>
          <div className="p-6 md:p-8 bg-surface rounded-[2px]">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-5">
              <div>
                <span className="text-xs font-data uppercase tracking-wider text-teal">Mode: surface-water</span>
                <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary">
                  Surface Water Dynamics Analysis
                </h2>
              </div>
              <span className="text-xs font-data px-2.5 py-1 bg-surface-2 border border-hairline text-teal">
                Wetland Hydrology
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                  The Physical Idea
                </h3>
                <p className="text-text-secondary leading-relaxed text-xs">
                  Wetland ecosystems, haor basins, and seasonal reservoirs undergo cyclic expansion and contraction between dry and
                  monsoon seasons. Water surfaces reflect microwave energy away, contrasting sharply with surrounding saturated soil
                  or emergent vegetation.
                </p>

                <h3 className="font-headline font-semibold text-base text-text-primary mt-4 mb-2">
                  Exact Algorithmic Steps
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-text-secondary">
                  <li>Generate water masks for initial scene (A) and final scene (B) at threshold -16.0 dB (VV) with 20-pixel cleanup.</li>
                  <li>Compute pixel transition classes: Persistent Water (1→1), New Surface Water (0→1), and Lost Surface Water (1→0).</li>
                  <li>Compute net hydrologic balance and total dynamic area.</li>
                </ol>
              </div>

              <div>
                <h3 className="font-headline font-semibold text-base text-text-primary mb-2">
                  Default Thresholds (from code)
                </h3>
                <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-1.5 text-xs font-data">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Water Threshold:</span>
                    <span className="text-teal">-16.0 dB (VV) / -22.0 dB (VH)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">DEFAULT_MIN_PIXELS:</span>
                    <span className="text-teal">20 pixels</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Affected Definition:</span>
                    <span className="text-teal">New Water + Lost Water</span>
                  </div>
                </div>

                <h3 className="font-headline font-semibold text-base text-text-primary mt-4 mb-2">
                  How Numbers Are Computed
                </h3>
                <ul className="space-y-1.5 text-xs text-text-secondary">
                  <li>
                    <strong className="text-text-primary">Initial Water (A):</strong> Total water area in scene A (km²).
                  </li>
                  <li>
                    <strong className="text-text-primary">Final Water (B):</strong> Total water area in scene B (km²).
                  </li>
                  <li>
                    <strong className="text-text-primary">Net Delta:</strong> Final Water (B) − Initial Water (A) in km².
                  </li>
                  <li>
                    <strong className="text-text-primary">Delta Percent:</strong> ((Final Water − Initial Water) ÷ Initial Water) × 100%.
                  </li>
                  <li>
                    <strong className="text-text-primary">Affected Area:</strong> Area of new water + area of lost water (total transitional surface).
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </GraticuleFrame>

        {/* Limitations Section */}
        <div className="border border-hairline rounded-[2px] bg-surface p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4 border-b border-hairline pb-3">
            <span className="inline-block w-2.5 h-2.5 bg-rust" />
            <h2 className="text-xl md:text-2xl font-headline font-semibold text-text-primary">
              Physical & Methodological Limitations
            </h2>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            Synthetic Aperture Radar provides reliable all-weather imaging, but remote sensing users must account for the
            fundamental physical constraints of C-band radar and automated thresholding:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-secondary">
            <div className="space-y-2">
              <h3 className="font-headline font-semibold text-sm text-text-primary">
                1. No Groundwater Penetration
              </h3>
              <p className="leading-relaxed">
                Sentinel-1 operates in C-band (center frequency <span className="font-data text-text-primary">5.405 GHz</span>,
                wavelength ~<span className="font-data text-text-primary">5.6 cm</span>). C-band microwaves cannot penetrate
                beneath the ground surface. The sensor detects only standing surface water and surface soil moisture within the uppermost
                few millimeters to centimeters of soil. It cannot measure subterranean aquifers, groundwater tables, or subsurface hydrologic flow.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-headline font-semibold text-sm text-text-primary">
                2. Wind-Roughened Water Artifacts
              </h3>
              <p className="leading-relaxed">
                The specular reflection assumption requires relatively calm water. Strong winds or surface currents create capillary waves
                and chop that induce Bragg resonance scattering back toward the satellite. A wind-roughened open water surface can exhibit
                backscatter values above <span className="font-data text-rust">-16 dB</span>, causing it to resemble bare land
                and evade detection under fixed-threshold classification.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-headline font-semibold text-sm text-text-primary">
                3. Seasonal Timing for River Erosion
              </h3>
              <p className="leading-relaxed">
                To evaluate genuine riverbank erosion, analysts must compare scenes acquired during the same hydrological season
                (e.g., comparing low-water dry season images from successive years). Comparing a peak-monsoon flood image against a dry-season
                baseline conflates seasonal stage height fluctuations with permanent morphological bank retreat.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-headline font-semibold text-sm text-text-primary">
                4. Regional Threshold Calibration Required
              </h3>
              <p className="leading-relaxed">
                Default thresholds (<span className="font-data">-16 dB</span> for VV water, <span className="font-data">-22 dB</span> for VH water,
                and <span className="font-data">-3 dB</span> for canopy loss) are empirical global baselines. Backscatter distributions vary with
                soil moisture, incidence angle, surface roughness, and vegetation density. Thresholds should be locally validated and calibrated
                for each target geographic region.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2 border-t border-hairline pt-4">
              <h3 className="font-headline font-semibold text-sm text-text-primary">
                5. Indicative, Not Survey-Grade
              </h3>
              <p className="leading-relaxed">
                All classifications, segmented polygons, and computed metric areas (km²) generated by this pipeline are automated satellite
                estimates designed for rapid situational screening, disaster monitoring, and regional trend analysis. They do not constitute
                cadastral, legal, or engineering survey-grade measurements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
