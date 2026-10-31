# NISAR L-Band Candidate Observation Pairs (Bangladesh AOIs)

This document evaluates and recommends candidate before/after acquisition pairs for all 6 Bangladeshi Areas of Interest (AOIs) in Terra Pulse using official **NISAR L2 GCOV PROVISIONAL** products.

### Methodological & Consistency Rules
- **Maturity Isolation**: Strict PROVISIONAL-to-PROVISIONAL pairs. BETA data are never paired with PROVISIONAL data.
- **Consistent Geometry**: Exact match on Track, Frame, Orbit Direction, and Bandwidth/Polarization mode.
- **Spatial Overlap**: The footprint polygon of both granules must completely envelop or have high overlap with the AOI bounding box.
- **Seasonal Contrast**: Evaluates multi-temporal acquisition dates across repeated orbital cycles.
- **Time-Series Candidacy**: Any geometry with $\ge 4$ consistent repeat cycles is flagged as an active time-series candidate.
- **C-Band Comparison**: Existing Sentinel-1 case studies in the repository represent the historical C-band baseline comparison windows.

---

## Sylhet Flash Floods (`sylhet`)

- **Analysis Mode**: `flood`
- **C-Band Sentinel-1 Baseline Window**: Before: 2022-05-01 to 2022-05-10 / After: 2022-06-20 to 2022-06-21 (C-band baseline)
- **AOI Bounds**: `[west: 91.7999, south: 24.8499, east: 91.9501, north: 24.9802]`
- **Total PROVISIONAL Granules Found**: 20

### Time-Series Monitoring Potential
- **Time-Series Flagged**: `Track 141, Frame 014, Dir A, Mode 4005, Pol DHDH` has **10 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-23 to 2026-10-21). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 076, Dir D, Mode 2005, Pol QPDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-20 to 2026-10-18). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 076, Dir D, Mode 4005, Pol DHDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-07-02 to 2026-10-06). Suitable for continuous deformation or multi-temporal water inundation monitoring.

### Recommended Observation Pairs

#### Primary Recommendation: Change between 2026-07-02 and 2026-08-19

- **Acquisition Geometry**: `Track 091, Frame 076, Dir D, Mode 4005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%` (fully contains AOI bounding box)
- **Combined Download Size**: `13576.2 MB` (13.26 GB)
- **Before Acquisition (Early/Baseline)**: `2026-07-02`
  - **Granule ID**: `NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001`
  - **Size**: `6880.4 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001/NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001.h5)
- **After Acquisition (Event/Post)**: `2026-08-19`
  - **Granule ID**: `NISAR_L2_PR_GCOV_028_091_D_076_4005_DHDH_A_20260819T123421_20260819T123455_P05023_N_F_J_001`
  - **Size**: `6695.8 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_028_091_D_076_4005_DHDH_A_20260819T123421_20260819T123455_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_028_091_D_076_4005_DHDH_A_20260819T123421_20260819T123455_P05023_N_F_J_001/NISAR_L2_PR_GCOV_028_091_D_076_4005_DHDH_A_20260819T123421_20260819T123455_P05023_N_F_J_001.h5)

#### Fallback Recommendation: Change between 2026-07-02 and 2026-10-06

- **Acquisition Geometry**: `Track 091, Frame 076, Dir D, Mode 4005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%`
- **Combined Download Size**: `13760.3 MB` (13.44 GB)
- **Before Acquisition**: `2026-07-02` (`NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001`)
- **After Acquisition**: `2026-10-06` (`NISAR_L2_PR_GCOV_032_091_D_076_4005_DHDH_A_20261006T123420_20261006T123455_P05023_N_F_J_001`)
- **Data Links**: [Before H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001/NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001.h5) | [After H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_032_091_D_076_4005_DHDH_A_20261006T123420_20261006T123455_P05023_N_F_J_001/NISAR_L2_PR_GCOV_032_091_D_076_4005_DHDH_A_20261006T123420_20261006T123455_P05023_N_F_J_001.h5)

---

## Tanguar Haor Wetland (`tanguar`)

- **Analysis Mode**: `surface-water`
- **C-Band Sentinel-1 Baseline Window**: Before: 2023-02-01 to 2023-02-28 / After: 2023-08-01 to 2023-08-31 (C-band baseline)
- **AOI Bounds**: `[west: 90.9798, south: 25.0498, east: 91.2002, north: 25.2201]`
- **Total PROVISIONAL Granules Found**: 30

### Time-Series Monitoring Potential
- **Time-Series Flagged**: `Track 069, Frame 014, Dir A, Mode 4005, Pol DHDH` has **10 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-18 to 2026-10-16). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 141, Frame 014, Dir A, Mode 4005, Pol DHDH` has **10 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-23 to 2026-10-21). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 076, Dir D, Mode 2005, Pol QPDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-20 to 2026-10-18). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 076, Dir D, Mode 4005, Pol DHDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-07-02 to 2026-10-06). Suitable for continuous deformation or multi-temporal water inundation monitoring.

### Recommended Observation Pairs

#### Primary Recommendation: Change between 2026-06-18 and 2026-10-16

- **Acquisition Geometry**: `Track 069, Frame 014, Dir A, Mode 4005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%` (fully contains AOI bounding box)
- **Combined Download Size**: `12964.4 MB` (12.66 GB)
- **Before Acquisition (Early/Baseline)**: `2026-06-18`
  - **Granule ID**: `NISAR_L2_PR_GCOV_023_069_A_014_4005_DHDH_A_20260618T232135_20260618T232210_P05023_N_F_J_001`
  - **Size**: `6576.6 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_023_069_A_014_4005_DHDH_A_20260618T232135_20260618T232210_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_023_069_A_014_4005_DHDH_A_20260618T232135_20260618T232210_P05023_N_F_J_001/NISAR_L2_PR_GCOV_023_069_A_014_4005_DHDH_A_20260618T232135_20260618T232210_P05023_N_F_J_001.h5)
- **After Acquisition (Event/Post)**: `2026-10-16`
  - **Granule ID**: `NISAR_L2_PR_GCOV_033_069_A_014_4005_DHDH_A_20261016T232132_20261016T232206_P05023_N_F_J_001`
  - **Size**: `6387.8 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_033_069_A_014_4005_DHDH_A_20261016T232132_20261016T232206_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_033_069_A_014_4005_DHDH_A_20261016T232132_20261016T232206_P05023_N_F_J_001/NISAR_L2_PR_GCOV_033_069_A_014_4005_DHDH_A_20261016T232132_20261016T232206_P05023_N_F_J_001.h5)

#### Fallback Recommendation: Change between 2026-06-18 and 2026-08-29

- **Acquisition Geometry**: `Track 069, Frame 014, Dir A, Mode 4005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%`
- **Combined Download Size**: `12972.9 MB` (12.67 GB)
- **Before Acquisition**: `2026-06-18` (`NISAR_L2_PR_GCOV_023_069_A_014_4005_DHDH_A_20260618T232135_20260618T232210_P05023_N_F_J_001`)
- **After Acquisition**: `2026-08-29` (`NISAR_L2_PR_GCOV_029_069_A_014_4005_DHDH_A_20260829T232132_20260829T232206_P05023_N_F_J_001`)
- **Data Links**: [Before H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_023_069_A_014_4005_DHDH_A_20260618T232135_20260618T232210_P05023_N_F_J_001/NISAR_L2_PR_GCOV_023_069_A_014_4005_DHDH_A_20260618T232135_20260618T232210_P05023_N_F_J_001.h5) | [After H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_029_069_A_014_4005_DHDH_A_20260829T232132_20260829T232206_P05023_N_F_J_001/NISAR_L2_PR_GCOV_029_069_A_014_4005_DHDH_A_20260829T232132_20260829T232206_P05023_N_F_J_001.h5)

---

## Hakaluki Haor Wetland (`hakaluki-haor`)

- **Analysis Mode**: `surface-water`
- **C-Band Sentinel-1 Baseline Window**: Before: 2023-02-15 to 2023-03-15 / After: 2023-08-01 to 2023-08-31 (C-band baseline)
- **AOI Bounds**: `[west: 91.9816, south: 24.5790, east: 92.1587, north: 24.7410]`
- **Total PROVISIONAL Granules Found**: 31

### Time-Series Monitoring Potential
- **Time-Series Flagged**: `Track 141, Frame 014, Dir A, Mode 4005, Pol DHDH` has **10 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-23 to 2026-10-21). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 163, Frame 076, Dir D, Mode 4005, Pol DHDH` has **7 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-25 to 2026-10-23). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 076, Dir D, Mode 2005, Pol QPDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-20 to 2026-10-18). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 076, Dir D, Mode 4005, Pol DHDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-07-02 to 2026-10-06). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 163, Frame 076, Dir D, Mode 2005, Pol QPDH` has **4 repeat acquisitions** spaced at 12-day orbital intervals (2026-07-07 to 2026-10-11). Suitable for continuous deformation or multi-temporal water inundation monitoring.

### Recommended Observation Pairs

#### Primary Recommendation: Change between 2026-07-02 and 2026-08-19

- **Acquisition Geometry**: `Track 091, Frame 076, Dir D, Mode 4005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%` (fully contains AOI bounding box)
- **Combined Download Size**: `13576.2 MB` (13.26 GB)
- **Before Acquisition (Early/Baseline)**: `2026-07-02`
  - **Granule ID**: `NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001`
  - **Size**: `6880.4 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001/NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001.h5)
- **After Acquisition (Event/Post)**: `2026-08-19`
  - **Granule ID**: `NISAR_L2_PR_GCOV_028_091_D_076_4005_DHDH_A_20260819T123421_20260819T123455_P05023_N_F_J_001`
  - **Size**: `6695.8 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_028_091_D_076_4005_DHDH_A_20260819T123421_20260819T123455_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_028_091_D_076_4005_DHDH_A_20260819T123421_20260819T123455_P05023_N_F_J_001/NISAR_L2_PR_GCOV_028_091_D_076_4005_DHDH_A_20260819T123421_20260819T123455_P05023_N_F_J_001.h5)

#### Fallback Recommendation: Change between 2026-07-02 and 2026-10-06

- **Acquisition Geometry**: `Track 091, Frame 076, Dir D, Mode 4005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%`
- **Combined Download Size**: `13760.3 MB` (13.44 GB)
- **Before Acquisition**: `2026-07-02` (`NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001`)
- **After Acquisition**: `2026-10-06` (`NISAR_L2_PR_GCOV_032_091_D_076_4005_DHDH_A_20261006T123420_20261006T123455_P05023_N_F_J_001`)
- **Data Links**: [Before H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001/NISAR_L2_PR_GCOV_024_091_D_076_4005_DHDH_A_20260702T123423_20260702T123458_P05023_N_F_J_001.h5) | [After H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_032_091_D_076_4005_DHDH_A_20261006T123420_20261006T123455_P05023_N_F_J_001/NISAR_L2_PR_GCOV_032_091_D_076_4005_DHDH_A_20261006T123420_20261006T123455_P05023_N_F_J_001.h5)

---

## Feni River Floods 2024 (`feni-2024`)

- **Analysis Mode**: `flood`
- **C-Band Sentinel-1 Baseline Window**: Before: 2024-08-05 to 2024-08-12 / After: 2024-08-21 to 2024-08-27 (C-band baseline)
- **AOI Bounds**: `[west: 91.3127, south: 22.9390, east: 91.4877, north: 23.1011]`
- **Total PROVISIONAL Granules Found**: 32

### Time-Series Monitoring Potential
- **Time-Series Flagged**: `Track 069, Frame 013, Dir A, Mode 4005, Pol DHDH` has **10 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-18 to 2026-10-16). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 163, Frame 077, Dir D, Mode 4005, Pol DHDH` has **7 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-25 to 2026-10-23). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 077, Dir D, Mode 2005, Pol QPDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-20 to 2026-10-18). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 077, Dir D, Mode 4005, Pol DHDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-07-02 to 2026-10-06). Suitable for continuous deformation or multi-temporal water inundation monitoring.

### Recommended Observation Pairs

#### Primary Recommendation: Change between 2026-07-14 and 2026-10-18

- **Acquisition Geometry**: `Track 091, Frame 077, Dir D, Mode 2000, Pol DVNA`
- **AOI Spatial Overlap Fraction**: `100.0%` (fully contains AOI bounding box)
- **Combined Download Size**: `3367.8 MB` (3.29 GB)
- **Before Acquisition (Early/Baseline)**: `2026-07-14`
  - **Granule ID**: `NISAR_L2_PR_GCOV_025_091_D_077_2000_DVNA_M_20260714T123456_20260714T123531_P05023_F_F_J_001`
  - **Size**: `1680.1 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_025_091_D_077_2000_DVNA_M_20260714T123456_20260714T123531_P05023_F_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_025_091_D_077_2000_DVNA_M_20260714T123456_20260714T123531_P05023_F_F_J_001/NISAR_L2_PR_GCOV_025_091_D_077_2000_DVNA_M_20260714T123456_20260714T123531_P05023_F_F_J_001.h5)
- **After Acquisition (Event/Post)**: `2026-10-18`
  - **Granule ID**: `NISAR_L2_PR_GCOV_033_091_D_077_2000_DVNA_M_20261018T123454_20261018T123529_P05023_N_F_J_001`
  - **Size**: `1687.8 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_033_091_D_077_2000_DVNA_M_20261018T123454_20261018T123529_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_033_091_D_077_2000_DVNA_M_20261018T123454_20261018T123529_P05023_N_F_J_001/NISAR_L2_PR_GCOV_033_091_D_077_2000_DVNA_M_20261018T123454_20261018T123529_P05023_N_F_J_001.h5)

#### Fallback Recommendation: Change between 2026-07-02 and 2026-10-06

- **Acquisition Geometry**: `Track 091, Frame 077, Dir D, Mode 2005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%`
- **Combined Download Size**: `3563.7 MB` (3.48 GB)
- **Before Acquisition**: `2026-07-02` (`NISAR_L2_PR_GCOV_024_091_D_077_2005_DHDH_M_20260702T123457_20260702T123531_P05023_N_F_J_001`)
- **After Acquisition**: `2026-10-06` (`NISAR_L2_PR_GCOV_032_091_D_077_2005_DHDH_M_20261006T123454_20261006T123529_P05023_N_F_J_001`)
- **Data Links**: [Before H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_024_091_D_077_2005_DHDH_M_20260702T123457_20260702T123531_P05023_N_F_J_001/NISAR_L2_PR_GCOV_024_091_D_077_2005_DHDH_M_20260702T123457_20260702T123531_P05023_N_F_J_001.h5) | [After H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_032_091_D_077_2005_DHDH_M_20261006T123454_20261006T123529_P05023_N_F_J_001/NISAR_L2_PR_GCOV_032_091_D_077_2005_DHDH_M_20261006T123454_20261006T123529_P05023_N_F_J_001.h5)

---

## Jamuna River Braiding & Erosion (`jamuna`)

- **Analysis Mode**: `river-erosion`
- **C-Band Sentinel-1 Baseline Window**: Before: 2019-02-01 to 2019-02-28 / After: 2024-02-01 to 2024-02-28 (C-band baseline)
- **AOI Bounds**: `[west: 89.6498, south: 24.2998, east: 89.9500, north: 24.5501]`
- **Total PROVISIONAL Granules Found**: 44

### Time-Series Monitoring Potential
- **Time-Series Flagged**: `Track 069, Frame 014, Dir A, Mode 4005, Pol DHDH` has **10 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-18 to 2026-10-16). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 170, Frame 014, Dir A, Mode 4005, Pol DHDH` has **10 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-25 to 2026-10-23). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 076, Dir D, Mode 2005, Pol QPDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-20 to 2026-10-18). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 019, Frame 076, Dir D, Mode 2005, Pol DHDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-27 to 2026-10-13). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 019, Frame 076, Dir D, Mode 2005, Pol QPDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-27 to 2026-10-01). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 076, Dir D, Mode 4005, Pol DHDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-07-02 to 2026-10-06). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 019, Frame 076, Dir D, Mode 4005, Pol DHDH` has **4 repeat acquisitions** spaced at 12-day orbital intervals (2026-07-09 to 2026-10-13). Suitable for continuous deformation or multi-temporal water inundation monitoring.

### Recommended Observation Pairs

#### Primary Recommendation: Change between 2026-06-27 and 2026-09-07

- **Acquisition Geometry**: `Track 019, Frame 076, Dir D, Mode 2005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%` (fully contains AOI bounding box)
- **Combined Download Size**: `3608.5 MB` (3.52 GB)
- **Before Acquisition (Early/Baseline)**: `2026-06-27`
  - **Granule ID**: `NISAR_L2_PR_GCOV_024_019_D_076_2005_DHDH_M_20260627T124243_20260627T124317_P05023_N_F_J_001`
  - **Size**: `1842.8 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_024_019_D_076_2005_DHDH_M_20260627T124243_20260627T124317_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_024_019_D_076_2005_DHDH_M_20260627T124243_20260627T124317_P05023_N_F_J_001/NISAR_L2_PR_GCOV_024_019_D_076_2005_DHDH_M_20260627T124243_20260627T124317_P05023_N_F_J_001.h5)
- **After Acquisition (Event/Post)**: `2026-09-07`
  - **Granule ID**: `NISAR_L2_PR_GCOV_030_019_D_076_2005_DHDH_M_20260907T124240_20260907T124314_P05023_N_F_J_001`
  - **Size**: `1765.7 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_030_019_D_076_2005_DHDH_M_20260907T124240_20260907T124314_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_030_019_D_076_2005_DHDH_M_20260907T124240_20260907T124314_P05023_N_F_J_001/NISAR_L2_PR_GCOV_030_019_D_076_2005_DHDH_M_20260907T124240_20260907T124314_P05023_N_F_J_001.h5)

#### Fallback Recommendation: Change between 2026-06-27 and 2026-10-13

- **Acquisition Geometry**: `Track 019, Frame 076, Dir D, Mode 2005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%`
- **Combined Download Size**: `3721.9 MB` (3.63 GB)
- **Before Acquisition**: `2026-06-27` (`NISAR_L2_PR_GCOV_024_019_D_076_2005_DHDH_M_20260627T124243_20260627T124317_P05023_N_F_J_001`)
- **After Acquisition**: `2026-10-13` (`NISAR_L2_PR_GCOV_033_019_D_076_2005_DHDH_M_20261013T124240_20261013T124315_P05023_N_F_J_001`)
- **Data Links**: [Before H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_024_019_D_076_2005_DHDH_M_20260627T124243_20260627T124317_P05023_N_F_J_001/NISAR_L2_PR_GCOV_024_019_D_076_2005_DHDH_M_20260627T124243_20260627T124317_P05023_N_F_J_001.h5) | [After H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_033_019_D_076_2005_DHDH_M_20261013T124240_20261013T124315_P05023_N_F_J_001/NISAR_L2_PR_GCOV_033_019_D_076_2005_DHDH_M_20261013T124240_20261013T124315_P05023_N_F_J_001.h5)

---

## Padma River Naria Erosion (`padma-naria`)

- **Analysis Mode**: `river-erosion`
- **C-Band Sentinel-1 Baseline Window**: Before: 2017-01-15 to 2017-03-15 / After: 2024-01-15 to 2024-03-15 (C-band baseline)
- **AOI Bounds**: `[west: 90.2327, south: 23.3100, east: 90.4277, north: 23.4900]`
- **Total PROVISIONAL Granules Found**: 25

### Time-Series Monitoring Potential
- **Time-Series Flagged**: `Track 069, Frame 013, Dir A, Mode 4005, Pol DHDH` has **10 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-18 to 2026-10-16). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 077, Dir D, Mode 2005, Pol QPDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-06-20 to 2026-10-18). Suitable for continuous deformation or multi-temporal water inundation monitoring.
- **Time-Series Flagged**: `Track 091, Frame 077, Dir D, Mode 4005, Pol DHDH` has **5 repeat acquisitions** spaced at 12-day orbital intervals (2026-07-02 to 2026-10-06). Suitable for continuous deformation or multi-temporal water inundation monitoring.

### Recommended Observation Pairs

#### Primary Recommendation: Change between 2026-07-14 and 2026-10-18

- **Acquisition Geometry**: `Track 091, Frame 077, Dir D, Mode 2000, Pol DVNA`
- **AOI Spatial Overlap Fraction**: `100.0%` (fully contains AOI bounding box)
- **Combined Download Size**: `3367.8 MB` (3.29 GB)
- **Before Acquisition (Early/Baseline)**: `2026-07-14`
  - **Granule ID**: `NISAR_L2_PR_GCOV_025_091_D_077_2000_DVNA_M_20260714T123456_20260714T123531_P05023_F_F_J_001`
  - **Size**: `1680.1 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_025_091_D_077_2000_DVNA_M_20260714T123456_20260714T123531_P05023_F_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_025_091_D_077_2000_DVNA_M_20260714T123456_20260714T123531_P05023_F_F_J_001/NISAR_L2_PR_GCOV_025_091_D_077_2000_DVNA_M_20260714T123456_20260714T123531_P05023_F_F_J_001.h5)
- **After Acquisition (Event/Post)**: `2026-10-18`
  - **Granule ID**: `NISAR_L2_PR_GCOV_033_091_D_077_2000_DVNA_M_20261018T123454_20261018T123529_P05023_N_F_J_001`
  - **Size**: `1687.8 MB`
  - **Data Link**: [NISAR_L2_PR_GCOV_033_091_D_077_2000_DVNA_M_20261018T123454_20261018T123529_P05023_N_F_J_001.h5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_033_091_D_077_2000_DVNA_M_20261018T123454_20261018T123529_P05023_N_F_J_001/NISAR_L2_PR_GCOV_033_091_D_077_2000_DVNA_M_20261018T123454_20261018T123529_P05023_N_F_J_001.h5)

#### Fallback Recommendation: Change between 2026-07-02 and 2026-10-06

- **Acquisition Geometry**: `Track 091, Frame 077, Dir D, Mode 2005, Pol DHDH`
- **AOI Spatial Overlap Fraction**: `100.0%`
- **Combined Download Size**: `3563.7 MB` (3.48 GB)
- **Before Acquisition**: `2026-07-02` (`NISAR_L2_PR_GCOV_024_091_D_077_2005_DHDH_M_20260702T123457_20260702T123531_P05023_N_F_J_001`)
- **After Acquisition**: `2026-10-06` (`NISAR_L2_PR_GCOV_032_091_D_077_2005_DHDH_M_20261006T123454_20261006T123529_P05023_N_F_J_001`)
- **Data Links**: [Before H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_024_091_D_077_2005_DHDH_M_20260702T123457_20260702T123531_P05023_N_F_J_001/NISAR_L2_PR_GCOV_024_091_D_077_2005_DHDH_M_20260702T123457_20260702T123531_P05023_N_F_J_001.h5) | [After H5](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_032_091_D_077_2005_DHDH_M_20261006T123454_20261006T123529_P05023_N_F_J_001/NISAR_L2_PR_GCOV_032_091_D_077_2005_DHDH_M_20261006T123454_20261006T123529_P05023_N_F_J_001.h5)

---
