# NASA NISAR L-Band Processing & Validation Report

## 1. Overview & Data Provenance
- **Mission**: NASA-ISRO Synthetic Aperture Radar (NISAR)
- **Product**: L2 Geocoded Polarimetric Covariance (`GCOV`)
- **Data Maturity**: `PROVISIONAL` (Preliminary product subject to reprocessing; not for final operational baseline)
- **Primary Test Granule**: `NISAR_L2_PR_GCOV_023_141_A_014_4005_DHDH_A_20260623T231316_20260623T231350_P05023_N_F_J_001`
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
