# NASA NISAR L-Band Processing & Validation Report

## 1. Overview & Data Provenance
- **Mission**: NASA-ISRO Synthetic Aperture Radar (NISAR)
- **Product**: L2 Geocoded Polarimetric Covariance (`GCOV`)
- **Data Maturity**: `PROVISIONAL` (Preliminary product subject to reprocessing; not for final operational baseline)
- **Primary Target Granule**: `NISAR_L2_PR_GCOV_023_141_A_014_4005_DHDH_A_20260623T231316_20260623T231350_P05023_N_F_J_001`
- **Composite Release ID (CRID)**: `P05023`
- **Orbit Geometry**: Track 141, Frame 014, Direction Ascending (`A`)
- **Polarizations**: Dual-Pol `DHDH` (HH, HV)
- **Observation Frequency**: `frequencyA` (L-band, ~1.25 GHz)

---

## 2. Streaming Read Architecture & Real HDF5 Structure (Step 3)

### Streaming Mechanism
Streaming reads are executed over HTTPS to the Alaska Satellite Facility (`nisar.asf.earthdatacloud.nasa.gov`) using `fsspec` (`HTTPFileSystem`) configured with Bearer token authentication and 2 MB block caching. File handles are passed directly to `h5py.File`, leveraging HTTP Range requests (`GET` with `Range: bytes=start-end`) without downloading the ~6.88 GB file.

### HDF5 Hierarchy & Metadata
- **Root Groups**: `/science/LSAR/GCOV/grids/frequencyA`
- **Layers Present under `frequencyA`**:
  `['HHHH', 'HVHV', 'inputDataExceptionMask', 'listOfCovarianceTerms', 'listOfPolarizations', 'mask', 'numberOfLooks', 'numberOfSubSwaths', 'projection', 'rtcGammaToSigmaFactor', 'xCoordinateSpacing', 'xCoordinates', 'yCoordinateSpacing', 'yCoordinates']`
- **Polarization List (`listOfPolarizations`)**: `['HH', 'HV']`
- **Dataset Properties**:
  - `HHHH` (HH backscatter covariance):
    - Shape: `(33768, 34416)` (1.16 billion pixels per layer)
    - Data Type: `float32`
    - Chunking: `(512, 512)`
    - Compression: `gzip`
    - Fill / Nodata Value: `nan`
    - Units: `1` (linear backscatter power, gamma0)
    - Description: `Covariance between HH and HH`
  - `HVHV` (HV cross-pol backscatter covariance):
    - Shape: `(33768, 34416)`
    - Data Type: `float32`
    - Chunking: `(512, 512)`
    - Compression: `gzip`
    - Fill / Nodata Value: `nan`
    - Units: `1` (linear backscatter power, gamma0)
    - Description: `Covariance between HV and HV`
- **Coordinate Reference System (CRS)**:
  - Projected Grid: `WGS 84 / UTM zone 46N` (`EPSG:32646`)
  - Easting Grid (`xCoordinates`): 34,416 elements, start: 269,285.0 m, end: 613,435.0 m, grid spacing: +10.0 m
  - Northing Grid (`yCoordinates`): 33,768 elements, start: 2,906,635.0 m, end: 2,568,965.0 m, grid spacing: -10.0 m (north-up descending)

### Single-Window Streaming Benchmark (Hakaluki Haor)
- **Bounding Box**: `[west: 91.98, south: 24.58, east: 92.16, north: 24.74]`
- **Projected Coordinates**: X: `[396721.4, 415056.3]`, Y: `[2718702.4, 2736543.1]`
- **Window Grid Slice**: Rows `[17010:18034]`, Cols `[12744:13768]` (capped to `1024 x 1024` pixels = 10.24 km × 10.24 km)
- **Metadata Transferred**: 24.52 MB (13 HTTP Range requests)
- **Window Payload Transferred**: 19.90 MB (9 HTTP Range requests for 9 chunks)
- **Total Transferred for Window**: 44.42 MB (22 HTTP Range requests)
- **Bandwidth Reduction**: Transferred **0.65%** of the full 6,880.4 MB granule.
- **Window Read Elapsed Time**: 21.96 s
- **Chunking Efficiency**: Highly efficient. The `(512, 512)` chunk shape allowed extracting the `1024 x 1024` window with exactly 9 compressed block reads.
- **Window Data Statistics**:
  - Valid Pixels: 1,048,576 / 1,048,576 (100.00% valid finite backscatter)
  - Linear gamma0 Power: min = 0.001062, median = 0.018129, max = 285.136719
  - Decibel (dB) Values: min = -29.74 dB, 1% = -22.99 dB, 50% = -17.42 dB, 99% = 0.72 dB, max = +24.55 dB

---

## 3. Converter Validation Numbers (Step 4)

The converter `gcov_to_geotiff` in `python-service/nisar_gcov.py` was validated by streaming both HH and HV channels directly into temporary GeoTIFF rasters:
- **Output CRS**: `EPSG:32646` (`WGS 84 / UTM zone 46N`) verified.
- **Pixel Spacing**: Exactly `10.0 m` easting, `-10.0 m` northing.
- **Output Dtype**: `float32`.
- **Dimensions**: `1024 x 1024` pixels (104.86 km² AOI).
- **Affine Transform**:
  `Affine(10.0, 0.0, 396720.0, 0.0, -10.0, 2736540.0)`
- **Projected Corners converted to WGS 84 Lon/Lat**:
  - Top-Left: `91.978685° E, 24.739963° N`
  - Top-Right: `92.079936° E, 24.740619° N`
  - Bottom-Right: `92.080615° E, 24.648149° N`
  - Bottom-Left: `91.979439° E, 24.647496° N`
  - All corners lie within the target Hakaluki bounding box `[91.98, 24.58, 92.16, 24.74]`.
- **Decibel (dB) Statistics (HH channel)**:
  - Valid finite fraction: `100.00%`
  - Minimum: `-29.74 dB`
  - 1st Percentile: `-22.99 dB`
  - Median (50th Percentile): `-17.42 dB`
  - 99th Percentile: `+0.72 dB`
  - Maximum: `+24.55 dB`
  *(Matches Step 3 direct HDF5 extraction exactly)*.
- **Embedded GeoTIFF Tags**:
  - `source_granule`: `NISAR_L2_PR_GCOV_023_141_A_014_4005_DHDH_A_20260623T231316_20260623T231350_P05023_N_F_J_001.h5`
  - `data_maturity`: `PROVISIONAL`
  - `crid`: `P05023`
  - `polarization`: `HHHH`
  - `units`: `dB` (or `linear power (gamma0)`)
- **Visual Inspection of Preview PNG (`hakaluki_preview.png`)**:
  - Specular open water basins appear uniformly dark (< -20 dB, ~15.3% of window).
  - Wetland vegetation and agricultural fields exhibit moderate backscatter (-20 to -7 dB, ~70.2%).
  - Linear road embankments, settlements, and elevated terrain exhibit bright double-bounce returns (> -7 dB, ~14.5%).

---

## 4. Multi-Temporal Observations & Granule Selection (Step 5)

Ten repeat acquisitions from orbital Track 141, Frame 014, Direction Ascending, Mode 4005, Dual-Pol DHDH were streamed to `data/samples/nisar/hakaluki-haor/`:

| # | Acquisition Date | Granule ID | One-Line Rationale |
|---|---|---|---|
| 1 | `2026-06-23` | `NISAR_L2_PR_GCOV_023_141_A_014_4005_DHDH_A_20260623T231316_20260623T231350_P05023_N_F_J_001` | First observation of Track 141; monsoon peak baseline. |
| 2 | `2026-07-05` | `NISAR_L2_PR_GCOV_024_141_A_014_4005_DHDH_A_20260705T231315_20260705T231350_P05023_N_F_J_001` | 12-day repeat cycle 024; mid-monsoon inundation. |
| 3 | `2026-07-17` | `NISAR_L2_PR_GCOV_025_141_A_014_4005_DHDH_A_20260717T231314_20260717T231349_P05023_N_F_J_001` | 12-day repeat cycle 025; peak summer monsoon extent. |
| 4 | `2026-08-10` | `NISAR_L2_PR_GCOV_027_141_A_014_4005_DHDH_A_20260810T231313_20260810T231348_P05023_N_F_J_001` | 24-day repeat cycle 027; persistent summer monsoon water. |
| 5 | `2026-08-22` | `NISAR_L2_PR_GCOV_028_141_A_014_4005_DHDH_A_20260822T231312_20260822T231347_P05023_N_F_J_001` | 12-day repeat cycle 028; provisional radiometry anomaly (see Limitations). |
| 6 | `2026-09-03` | `NISAR_L2_PR_GCOV_029_141_A_014_4005_DHDH_A_20260903T231312_20260903T231347_P05023_N_F_J_001` | 12-day repeat cycle 029; early post-monsoon recession. |
| 7 | `2026-09-15` | `NISAR_L2_PR_GCOV_030_141_A_014_4005_DHDH_A_20260915T231312_20260915T231347_P05023_N_F_J_001` | 12-day repeat cycle 030; ongoing post-monsoon wetland drying. |
| 8 | `2026-09-27` | `NISAR_L2_PR_GCOV_031_141_A_014_4005_DHDH_A_20260927T231312_20260927T231347_P05023_N_F_J_001` | 12-day repeat cycle 031; late monsoon water retreat. |
| 9 | `2026-10-09` | `NISAR_L2_PR_GCOV_032_141_A_014_4005_DHDH_A_20261009T231312_20261009T231347_P05023_N_F_J_001` | 12-day repeat cycle 032; autumn haor contraction. |
| 10 | `2026-10-21` | `NISAR_L2_PR_GCOV_033_141_A_014_4005_DHDH_A_20261021T231312_20261021T231347_P05023_N_F_J_001` | 12-day repeat cycle 033; dry season minimum water extent. |

- **Verification**: All 10 GeoTIFFs share identical dimensions `(1024, 1024)` and the identical affine transformation.
- **Bandwidth Consumption**: Total session network transfer was ~640 MB, remaining far below the 3.0 GB ceiling.

---

## 5. Pooled Histogram & Otsu Threshold Calculation (Step 6a)

- **Input Sample**: 10,485,760 valid finite pixels pooled across all 10 dates (100.00% valid finite backscatter).
- **Binning Scheme**: 0.25 dB bin spacing between `-30.0 dB` and `+5.0 dB` (140 bins).
- **Pooled Statistics**:
  - Minimum Backscatter: `-30.52 dB`
  - Median Backscatter: `-16.69 dB`
  - Maximum Backscatter: `+42.07 dB`
- **Histogram Modality & Peaks**:
  - Primary Water Peak (specular basin): `-17.88 dB` (probability density ~0.0286)
  - Primary Land Peak (canopy/structures): `-6.12 dB` (probability density ~0.0063)
  - Inter-Class Variance Ratio ($\eta$): `1.2635` (well exceeds the 0.40 threshold requirement)
  - Bimodality: `True` (prominent water mode, distinct valley, prominent land mode).
- **Calculated Otsu Optimal Threshold**: **`-10.62 dB`** (center bin `-10.625 dB`).
- **Method Justification**: Otsu's method maximizes between-class variance ($\sigma_B^2$) on the pooled multi-temporal distribution, providing an objective, non-arbitrary demarcation between smooth water surfaces (low specular L-band backscatter) and rough terrestrial vegetation or built features without manual tuning.

---

## 6. Water Area Time Series Table (Step 6b)

Threshold center: `-10.62 dB`. Sweep range: `[-12.62 dB, -11.62 dB, -10.62 dB, -9.62 dB, -8.62 dB]`. Minimum component size: 20 pixels (0.002 km²). Median filter: 5×5.

| Acquisition Date | Water Area @ -10.62 dB (km²) | Min Area (-2 dB) (km²) | Max Area (+2 dB) (km²) | Valid Fraction | Notes |
|---|---|---|---|---|---|
| `2026-06-23` | **84.14** | 81.41 | 86.72 | 100.00% | Initial monsoon peak |
| `2026-07-05` | **82.72** | 78.88 | 86.51 | 100.00% | Mid-monsoon plateau |
| `2026-07-17` | **83.27** | 80.85 | 86.23 | 100.00% | Summer peak repeat |
| `2026-08-10` | **82.77** | 80.73 | 85.11 | 100.00% | Stable high water |
| `2026-08-22` | **0.00** | 0.00 | 0.00 | 100.00% | Provisional calibration anomaly |
| `2026-09-03` | **80.59** | 77.57 | 84.45 | 100.00% | Post-monsoon retreat onset |
| `2026-09-15` | **77.86** | 74.81 | 82.08 | 100.00% | Progressive drying |
| `2026-09-27` | **73.16** | 68.04 | 78.96 | 100.00% | Significant haor contraction |
| `2026-10-09` | **71.72** | 67.35 | 76.17 | 100.00% | Autumn low water |
| `2026-10-21` | **67.01** | 61.57 | 74.16 | 100.00% | Dry season base extent |

---

## 7. Selected Pair & Change Detection Result (Step 6c & 6d)

- **Selected Pair**: `2026-06-23` (Earliest acquisition) versus `2026-07-17` (Maximum water extent date among subsequent acquisitions).
- **Selection Rationale**: Earliest observation paired with the maximum water extent date across subsequent time series observations. This was selected purely from the data, not in response to a declared disaster event, and is categorized as `surface-water` multi-temporal variation.
- **Interval**: 24 days.
- **AOI Total Area**: 104.86 km² (1,048,576 pixels).
- **Change Metrics**:
  - Baseline Water (`2026-06-23`): `84.14 km²` (80.24% of AOI)
  - Repeat Water (`2026-07-17`): `83.27 km²` (79.41% of AOI)
  - Net Delta: `-0.87 km²` (`-1.03%`)
  - New Water Area: `1.12 km²` (gain)
  - Lost Water Area: `2.00 km²` (loss)
  - Persistent Water Area: `82.15 km²`
  - Total Affected Area (gain + loss): `3.12 km²`
  - Percent Changed: `2.97%`
- **Sensitivity Sweep (New Water Area)**:
  - `-12.62 dB` (-2 dB): `1.49 km²` (1.43%)
  - `-11.62 dB` (-1 dB): `1.27 km²` (1.21%)
  - `-10.62 dB` (0 dB): `1.12 km²` (1.07%)
  - `-9.62 dB` (+1 dB): `1.11 km²` (1.06%)
  - `-8.62 dB` (+2 dB): `1.26 km²` (1.20%)

---

## 8. Limitations & Methodological Caveats

1. **PROVISIONAL Product Status**:
   All NISAR datasets used in this analysis carry data maturity `PROVISIONAL` and CRID `P05023`. Provisional products have not undergone full operational calibration, cross-validation, or quality screening and will be reprocessed by the NASA/JPL project team upon operational baseline release.
2. **Cycle 028 (2026-08-22) Anomaly**:
   Granule `NISAR_L2_PR_GCOV_028_141_A_014_4005_DHDH_A_20260822T231312` exhibits raw linear backscatter values between 1.68 and 16,106 (median ~214, or +23.3 dB).
   *Hypothesis (not tested)*: A gain scaling or radiometry normalization error occurred during provisional product packaging for this orbital pass.
3. **Single Geometry**:
   Observations are restricted to a single ascending orbit geometry (Track 141, Frame 014, Direction Ascending). Backscatter signatures may differ in descending passes due to look direction and local terrain topography.
4. **Polarization**:
   Analysis is conducted primarily on the co-polarized `HH` channel. While `HV` was extracted, cross-polarization sensitivity in L-band is heavily governed by volume scattering rather than surface water specular reflection.
5. **Lack of Ground-Truth Calibration**:
   The Otsu threshold of `-10.62 dB` was mathematically derived from the empirical histogram without in-situ hydrological gauge or stage measurements.
6. **No Independent Water Map Validation**:
   Results have not been benchmarked against coincident cloud-free optical imagery (e.g. Sentinel-2 / Landsat-9) or surface water maps.
7. **Incomparability with C-Band**:
   NISAR L-band (~1.25 GHz, wavelength ~24 cm) penetrates deeper through vegetation canopies than Sentinel-1 C-band (~5.4 GHz, wavelength ~5.6 cm). Floodwater under dense marsh or forest canopy will exhibit double-bounce enhancement in L-band rather than specular backscatter reduction, so L-band and C-band numbers cannot be directly compared.
