# NISAR L-Band SAR Coverage & CMR Discovery

## Collections

The following official NISAR collections were queried and confirmed directly from the NASA Common Metadata Repository (CMR) API (`https://cmr.earthdata.nasa.gov/search/collections.json`):

| Product | Short Name | Version | Concept ID | Provider | Temporal Start | Temporal End |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: |
| **NISAR L2 GCOV PROVISIONAL** | `NISAR_L2_GCOV_PROVISIONAL_V1` | `1` | `C2854338529-ASF` | `ASF` | `2025-10-28T00:00:00.000Z` | Open-ended |
| **NISAR L2 GCOV BETA** | `NISAR_L2_GCOV_BETA_V1` | `1` | `C3622214170-ASF` | `ASF` | `2025-10-01T00:00:00.000Z` | Open-ended |
| **NISAR L3 SME2 PROVISIONAL** | `NISAR_L3_SME2_PROVISIONAL_V1` | `1` | `C2854344945-ASF` | `ASF` | `2025-10-28T00:00:00.000Z` | Open-ended |

- **Data Centers**: All three collections are cataloged and distributed through the Alaska Satellite Facility (ASF) DAAC on behalf of NASA / JPL-Caltech.
- **Data Maturity Levels**:
  - **BETA**: Early release validation products intended for format exploration and initial algorithm benchmarking.
  - **PROVISIONAL**: Science-grade calibrated products subject to planned future reprocessing once full on-orbit calibration matrices stabilize.

---

## Product Naming Convention Specification

According to the official NISAR GCOV Product Specification ([Shiroma, 2026](https://cumulus.asf.earthdatacloud.nasa.gov/PUBLIC/DATA/NISAR/NISAR_D-102274_RevF_NASA_SDS_Product_Specification_L2_GCOV_w-esigs.pdf)) and the [ASF NISAR User Guide](https://nisar-docs.asf.alaska.edu/gcov/):

`NISAR_L2_<PT>_GCOV_<CYL>_<REL>_<DIR>_<FRM>_<MODE>_<POLE>_<S>_<StartUTC>_<EndUTC>_<CRID>_<ACC>_<COV>_<LOC>_<CTR>.h5`

| Token | Meaning | Documented Values / Definition |
| :--- | :--- | :--- |
| **Mission** | Mission identifier | `NISAR` |
| **Instrument & Level** | SAR instrument and processing tier | `L2` (L-band SAR Level 2 GCOV) |
| **PT** | Processing Type | `PR` (Production), `UR` (Urgent Response), `OD` (On-Demand) |
| **Product** | Product Identifier | `GCOV` (Geocoded Polarimetric Covariance) |
| **CYL** | Orbit Cycle number | 3 digits (12-day repeat cycle, starts at `001`) |
| **REL** | Relative Orbit Track | 3 digits (`001`-`173`) |
| **DIR** | Pass Direction | `A` (Ascending), `D` (Descending) |
| **FRM** | Track Frame number | 3 digits (`001`-`176` per track) |
| **MODE** | Bandwidth Mode Code | 4 digits: primary (first 2) + secondary (last 2) bandwidth (e.g. `2005`, `4005`, `2000`, `4000`) |
| **POLE** | Polarization Code | 4 characters: `SH` (HH), `SV` (VV), `DH` (HH/HV), `DV` (VV/VH), `QP` (Quad-pol), `CL` (LH/LV), `CR` (RH/RV) |
| **S** | Data Source | `A` (Acquired single mode), `M` (Mixed mode) |
| **Start / End UTC** | Acquisition timestamp | 15 characters: `YYYYMMDDTHHMMSS` (UTC, zero Doppler) |
| **CRID** | Composite Release ID | 6 characters (e.g., `P05023` for Provisional, `X05023` for Beta) |
| **ACC** | Orbit Ephemeris Accuracy | `P` (Precise), `M` (Medium), `N` (Near Real-Time), `F` (Forecast) |
| **COV** | Frame Spatial Coverage | `F` (Full), `P` (Partial) |
| **LOC** | Processing Facility | `J` (JPL SDS) |
| **CTR** | Product Version Counter | 3 digits (zero padded, e.g. `001`) |

---

## Coverage Inventory by Area of Interest (AOI)

All bounding boxes for the 10 ready cases were dynamically read directly from `data/precomputed/<caseId>/result.json`. An additional approximate bounding box for Bangladesh (`[88.0, 20.5, 92.7, 26.7]`) was evaluated.

### Summary Overview Table

| AOI | Bounds [W, S, E, N] | PROVISIONAL Granules | PROVISIONAL Date Range | BETA Granules | BETA Date Range |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **amazon** | `[-62.20, -10.35, -62.00, -10.15]` | 40 | 2026-06-18 to 2026-10-16 | 6 | 2025-11-02 to 2025-11-14 |
| **cox-bazar-kutupalong-2017** | `[92.08, 21.14, 92.24, 21.28]` | 35 | 2026-06-18 to 2026-10-23 | 0 | None |
| **feni-2024** | `[91.31, 22.94, 91.49, 23.10]` | 32 | 2026-06-18 to 2026-10-23 | 0 | None |
| **hakaluki-haor** | `[91.98, 24.58, 92.16, 24.74]` | 31 | 2026-06-20 to 2026-10-23 | 0 | None |
| **jamuna** | `[89.65, 24.30, 89.95, 24.55]` | 44 | 2026-06-18 to 2026-10-23 | 0 | None |
| **padma-naria** | `[90.23, 23.31, 90.43, 23.49]` | 25 | 2026-06-18 to 2026-10-18 | 0 | None |
| **rio-grande-do-sul-2024** | `[-51.36, -30.17, -51.05, -29.89]` | 54 | 2026-06-17 to 2026-10-20 | 0 | None |
| **sindh-pakistan-2022** | `[67.45, 26.22, 67.85, 26.58]` | 47 | 2026-06-17 to 2026-10-23 | 12 | 2025-11-20 to 2026-01-20 |
| **sylhet** | `[91.80, 24.85, 91.95, 24.98]` | 20 | 2026-06-20 to 2026-10-21 | 0 | None |
| **tanguar** | `[90.98, 25.05, 91.20, 25.22]` | 30 | 2026-06-18 to 2026-10-21 | 0 | None |
| **Bangladesh (approximate national bounding box)** | `[88.00, 20.50, 92.70, 26.70]` | 371 | 2026-03-04 to 2026-10-23 | 24 | 2025-11-28 to 2026-01-17 |

---

### Detailed Inventory per AOI

#### amazon

- **Bounding Box**: `[west: -62.200068924662965, south: -10.350029377511479, east: -61.99992427936114, north: -10.14988473220965]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 40 granules for this bounding box.

- **Granule Count**: 40
- **First Acquisition Date**: `2026-06-18`
- **Last Acquisition Date**: `2026-10-16`
- **Total Volume**: 70171.6 MB (68.53 GB)
- **Median Granule Size**: 1834.7 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 060, Frame 172, Dir A, Mode/Pol 2005/DHDH | 9 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-10-04`, `2026-10-16` |
| Track 060, Frame 172, Dir A, Mode/Pol 2005/SHSH | 1 | `2026-09-22` |
| Track 060, Frame 173, Dir A, Mode/Pol 2005/DHDH | 9 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-10-04`, `2026-10-16` |
| Track 060, Frame 173, Dir A, Mode/Pol 2005/SHSH | 1 | `2026-09-22` |
| Track 068, Frame 093, Dir D, Mode/Pol 2005/DHDH | 5 | `2026-06-18`, `2026-07-12`, `2026-08-29`, `2026-09-22`, `2026-10-16` |
| Track 068, Frame 093, Dir D, Mode/Pol 2005/SHSH | 5 | `2026-06-30`, `2026-07-24`, `2026-08-17`, `2026-09-10`, `2026-10-04` |
| Track 068, Frame 094, Dir D, Mode/Pol 2005/DHDH | 5 | `2026-06-18`, `2026-07-12`, `2026-08-29`, `2026-09-22`, `2026-10-16` |
| Track 068, Frame 094, Dir D, Mode/Pol 2005/SHSH | 5 | `2026-06-30`, `2026-07-24`, `2026-08-17`, `2026-09-10`, `2026-10-04` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-18 | 2026-06-30 | 2026-07-12 | 2026-07-24 |
| 2026-08-17 | 2026-08-29 | 2026-09-10 | 2026-09-22 |
| 2026-10-04 | 2026-10-16 |  |  |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 6 granules for this bounding box.

- **Granule Count**: 6
- **First Acquisition Date**: `2025-11-02`
- **Last Acquisition Date**: `2025-11-14`
- **Total Volume**: 10514.0 MB (10.27 GB)
- **Median Granule Size**: 1839.5 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 060, Frame 172, Dir A, Mode/Pol 2005/DHDH | 1 | `2025-11-02` |
| Track 060, Frame 173, Dir A, Mode/Pol 2005/DHDH | 1 | `2025-11-02` |
| Track 068, Frame 093, Dir D, Mode/Pol 2005/DHDH | 1 | `2025-11-14` |
| Track 068, Frame 093, Dir D, Mode/Pol 2005/SHSH | 1 | `2025-11-02` |
| Track 068, Frame 094, Dir D, Mode/Pol 2005/DHDH | 1 | `2025-11-14` |
| Track 068, Frame 094, Dir D, Mode/Pol 2005/SHSH | 1 | `2025-11-02` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2025-11-02 | 2025-11-14 |  |  |

---

#### cox-bazar-kutupalong-2017

- **Bounding Box**: `[west: 92.08324550312614, south: 21.137897624502813, east: 92.23685741671058, north: 21.28216705913241]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 35 granules for this bounding box.

- **Granule Count**: 35
- **First Acquisition Date**: `2026-06-18`
- **Last Acquisition Date**: `2026-10-23`
- **Total Volume**: 158873.3 MB (155.15 GB)
- **Median Granule Size**: 4457.0 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 069, Frame 012, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-09-22`, `2026-10-04`, `2026-10-16` |
| Track 141, Frame 012, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-23`, `2026-07-05`, `2026-07-17`, `2026-08-10`, `2026-08-22`, `2026-09-03`, `2026-09-15`, `2026-09-27`, `2026-10-09`, `2026-10-21` |
| Track 163, Frame 078, Dir D, Mode/Pol 2000/DVNA | 4 | `2026-07-07`, `2026-08-24`, `2026-09-17`, `2026-10-11` |
| Track 163, Frame 078, Dir D, Mode/Pol 2005/QPDH | 4 | `2026-07-07`, `2026-08-24`, `2026-09-17`, `2026-10-11` |
| Track 163, Frame 078, Dir D, Mode/Pol 4005/DHDH | 6 | `2026-06-25`, `2026-07-19`, `2026-08-12`, `2026-09-05`, `2026-09-29`, `2026-10-23` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-18 | 2026-06-23 | 2026-06-25 | 2026-06-30 |
| 2026-07-05 | 2026-07-07 | 2026-07-12 | 2026-07-17 |
| 2026-07-19 | 2026-07-24 | 2026-08-10 | 2026-08-12 |
| 2026-08-17 | 2026-08-22 | 2026-08-24 | 2026-08-29 |
| 2026-09-03 | 2026-09-05 | 2026-09-10 | 2026-09-15 |
| 2026-09-17 | 2026-09-22 | 2026-09-27 | 2026-09-29 |
| 2026-10-04 | 2026-10-09 | 2026-10-11 | 2026-10-16 |
| 2026-10-21 | 2026-10-23 |  |  |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 0 granules for this bounding box.

---

#### feni-2024

- **Bounding Box**: `[west: 91.31267065240841, south: 22.939019769162453, east: 91.4876624697549, north: 23.101075846417615]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 32 granules for this bounding box.

- **Granule Count**: 32
- **First Acquisition Date**: `2026-06-18`
- **Last Acquisition Date**: `2026-10-23`
- **Total Volume**: 165202.6 MB (161.33 GB)
- **Median Granule Size**: 5981.3 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 069, Frame 013, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-09-22`, `2026-10-04`, `2026-10-16` |
| Track 091, Frame 077, Dir D, Mode/Pol 2000/DVNA | 2 | `2026-07-14`, `2026-10-18` |
| Track 091, Frame 077, Dir D, Mode/Pol 2005/DHDH | 3 | `2026-07-02`, `2026-09-12`, `2026-10-06` |
| Track 091, Frame 077, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-20`, `2026-07-14`, `2026-08-31`, `2026-09-24`, `2026-10-18` |
| Track 091, Frame 077, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |
| Track 163, Frame 077, Dir D, Mode/Pol 4005/DHDH | 6 | `2026-06-25`, `2026-07-19`, `2026-08-12`, `2026-09-05`, `2026-09-29`, `2026-10-23` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-18 | 2026-06-20 | 2026-06-25 | 2026-06-30 |
| 2026-07-02 | 2026-07-12 | 2026-07-14 | 2026-07-19 |
| 2026-07-24 | 2026-07-26 | 2026-08-12 | 2026-08-17 |
| 2026-08-19 | 2026-08-29 | 2026-08-31 | 2026-09-05 |
| 2026-09-10 | 2026-09-12 | 2026-09-22 | 2026-09-24 |
| 2026-09-29 | 2026-10-04 | 2026-10-06 | 2026-10-16 |
| 2026-10-18 | 2026-10-23 |  |  |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 0 granules for this bounding box.

---

#### hakaluki-haor

- **Bounding Box**: `[west: 91.98155621296381, south: 24.57898415185105, east: 92.15870398699218, north: 24.74104022910621]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 31 granules for this bounding box.

- **Granule Count**: 31
- **First Acquisition Date**: `2026-06-20`
- **Last Acquisition Date**: `2026-10-23`
- **Total Volume**: 225979.5 MB (220.68 GB)
- **Median Granule Size**: 7015.7 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 091, Frame 076, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-20`, `2026-07-14`, `2026-08-31`, `2026-09-24`, `2026-10-18` |
| Track 091, Frame 076, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |
| Track 141, Frame 014, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-23`, `2026-07-05`, `2026-07-17`, `2026-08-10`, `2026-08-22`, `2026-09-03`, `2026-09-15`, `2026-09-27`, `2026-10-09`, `2026-10-21` |
| Track 163, Frame 076, Dir D, Mode/Pol 2005/QPDH | 4 | `2026-07-07`, `2026-08-24`, `2026-09-17`, `2026-10-11` |
| Track 163, Frame 076, Dir D, Mode/Pol 4005/DHDH | 6 | `2026-06-25`, `2026-07-19`, `2026-08-12`, `2026-09-05`, `2026-09-29`, `2026-10-23` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-20 | 2026-06-23 | 2026-06-25 | 2026-07-02 |
| 2026-07-05 | 2026-07-07 | 2026-07-14 | 2026-07-17 |
| 2026-07-19 | 2026-07-26 | 2026-08-10 | 2026-08-12 |
| 2026-08-19 | 2026-08-22 | 2026-08-24 | 2026-08-31 |
| 2026-09-03 | 2026-09-05 | 2026-09-12 | 2026-09-15 |
| 2026-09-17 | 2026-09-24 | 2026-09-27 | 2026-09-29 |
| 2026-10-06 | 2026-10-09 | 2026-10-11 | 2026-10-18 |
| 2026-10-21 | 2026-10-23 |  |  |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 0 granules for this bounding box.

---

#### jamuna

- **Bounding Box**: `[west: 89.64979922997478, south: 24.299787761546707, east: 89.95001619792752, north: 24.550148231230818]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 44 granules for this bounding box.

- **Granule Count**: 44
- **First Acquisition Date**: `2026-06-18`
- **Last Acquisition Date**: `2026-10-23`
- **Total Volume**: 271824.4 MB (265.45 GB)
- **Median Granule Size**: 6570.7 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 019, Frame 076, Dir D, Mode/Pol 2005/DHDH | 5 | `2026-06-27`, `2026-07-09`, `2026-09-07`, `2026-10-01`, `2026-10-13` |
| Track 019, Frame 076, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-27`, `2026-08-26`, `2026-09-07`, `2026-09-19`, `2026-10-01` |
| Track 019, Frame 076, Dir D, Mode/Pol 4005/DHDH | 4 | `2026-07-09`, `2026-07-21`, `2026-08-14`, `2026-10-13` |
| Track 069, Frame 014, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-09-22`, `2026-10-04`, `2026-10-16` |
| Track 091, Frame 076, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-20`, `2026-07-14`, `2026-08-31`, `2026-09-24`, `2026-10-18` |
| Track 091, Frame 076, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |
| Track 170, Frame 014, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-25`, `2026-07-07`, `2026-07-19`, `2026-08-12`, `2026-08-24`, `2026-09-05`, `2026-09-17`, `2026-09-29`, `2026-10-11`, `2026-10-23` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-18 | 2026-06-20 | 2026-06-25 | 2026-06-27 |
| 2026-06-30 | 2026-07-02 | 2026-07-07 | 2026-07-09 |
| 2026-07-12 | 2026-07-14 | 2026-07-19 | 2026-07-21 |
| 2026-07-24 | 2026-07-26 | 2026-08-12 | 2026-08-14 |
| 2026-08-17 | 2026-08-19 | 2026-08-24 | 2026-08-26 |
| 2026-08-29 | 2026-08-31 | 2026-09-05 | 2026-09-07 |
| 2026-09-10 | 2026-09-12 | 2026-09-17 | 2026-09-19 |
| 2026-09-22 | 2026-09-24 | 2026-09-29 | 2026-10-01 |
| 2026-10-04 | 2026-10-06 | 2026-10-11 | 2026-10-13 |
| 2026-10-16 | 2026-10-18 | 2026-10-23 |  |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 0 granules for this bounding box.

---

#### padma-naria

- **Bounding Box**: `[west: 90.23271601783992, south: 23.310023981503814, east: 90.42765043449386, north: 23.490046364441366]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 25 granules for this bounding box.

- **Granule Count**: 25
- **First Acquisition Date**: `2026-06-18`
- **Last Acquisition Date**: `2026-10-18`
- **Total Volume**: 117185.1 MB (114.44 GB)
- **Median Granule Size**: 5818.9 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 069, Frame 013, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-09-22`, `2026-10-04`, `2026-10-16` |
| Track 091, Frame 077, Dir D, Mode/Pol 2000/DVNA | 2 | `2026-07-14`, `2026-10-18` |
| Track 091, Frame 077, Dir D, Mode/Pol 2005/DHDH | 3 | `2026-07-02`, `2026-09-12`, `2026-10-06` |
| Track 091, Frame 077, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-20`, `2026-07-14`, `2026-08-31`, `2026-09-24`, `2026-10-18` |
| Track 091, Frame 077, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-18 | 2026-06-20 | 2026-06-30 | 2026-07-02 |
| 2026-07-12 | 2026-07-14 | 2026-07-24 | 2026-07-26 |
| 2026-08-17 | 2026-08-19 | 2026-08-29 | 2026-08-31 |
| 2026-09-10 | 2026-09-12 | 2026-09-22 | 2026-09-24 |
| 2026-10-04 | 2026-10-06 | 2026-10-16 | 2026-10-18 |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 0 granules for this bounding box.

---

#### rio-grande-do-sul-2024

- **Bounding Box**: `[west: -51.364949293726944, south: -30.165067914619886, east: -51.05485085764889, north: -29.894854677156733]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 54 granules for this bounding box.

- **Granule Count**: 54
- **First Acquisition Date**: `2026-06-17`
- **Last Acquisition Date**: `2026-10-20`
- **Total Volume**: 261183.9 MB (255.06 GB)
- **Median Granule Size**: 6402.8 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 053, Frame 103, Dir D, Mode/Pol 4005/DHDH | 10 | `2026-06-17`, `2026-06-29`, `2026-07-11`, `2026-07-23`, `2026-08-16`, `2026-08-28`, `2026-09-09`, `2026-09-21`, `2026-10-03`, `2026-10-15` |
| Track 053, Frame 104, Dir D, Mode/Pol 4005/DHDH | 10 | `2026-06-17`, `2026-06-29`, `2026-07-11`, `2026-07-23`, `2026-08-16`, `2026-08-28`, `2026-09-09`, `2026-09-21`, `2026-10-03`, `2026-10-15` |
| Track 103, Frame 162, Dir A, Mode/Pol 4005/DHDH | 9 | `2026-06-21`, `2026-07-03`, `2026-07-15`, `2026-07-27`, `2026-08-20`, `2026-09-01`, `2026-09-25`, `2026-10-07`, `2026-10-19` |
| Track 103, Frame 163, Dir A, Mode/Pol 4005/DHDH | 9 | `2026-06-21`, `2026-07-03`, `2026-07-15`, `2026-07-27`, `2026-08-20`, `2026-09-01`, `2026-09-25`, `2026-10-07`, `2026-10-19` |
| Track 125, Frame 103, Dir D, Mode/Pol 2005/DHDH | 8 | `2026-06-22`, `2026-07-04`, `2026-07-16`, `2026-08-21`, `2026-09-02`, `2026-09-26`, `2026-10-08`, `2026-10-20` |
| Track 125, Frame 104, Dir D, Mode/Pol 2005/DHDH | 8 | `2026-06-22`, `2026-07-04`, `2026-07-16`, `2026-08-21`, `2026-09-02`, `2026-09-26`, `2026-10-08`, `2026-10-20` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-17 | 2026-06-21 | 2026-06-22 | 2026-06-29 |
| 2026-07-03 | 2026-07-04 | 2026-07-11 | 2026-07-15 |
| 2026-07-16 | 2026-07-23 | 2026-07-27 | 2026-08-16 |
| 2026-08-20 | 2026-08-21 | 2026-08-28 | 2026-09-01 |
| 2026-09-02 | 2026-09-09 | 2026-09-21 | 2026-09-25 |
| 2026-09-26 | 2026-10-03 | 2026-10-07 | 2026-10-08 |
| 2026-10-15 | 2026-10-19 | 2026-10-20 |  |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 0 granules for this bounding box.

---

#### sindh-pakistan-2022

- **Bounding Box**: `[west: 67.45072176034158, south: 26.21993668135218, east: 67.85011273566111, north: 26.579981447227286]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 47 granules for this bounding box.

- **Granule Count**: 47
- **First Acquisition Date**: `2026-06-17`
- **Last Acquisition Date**: `2026-10-23`
- **Total Volume**: 287485.0 MB (280.75 GB)
- **Median Granule Size**: 6562.3 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 041, Frame 015, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-17`, `2026-06-29`, `2026-07-11`, `2026-07-23`, `2026-08-16`, `2026-08-28`, `2026-09-09`, `2026-09-21`, `2026-10-03`, `2026-10-15` |
| Track 092, Frame 075, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-20`, `2026-07-14`, `2026-08-31`, `2026-09-24`, `2026-10-18` |
| Track 092, Frame 075, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |
| Track 142, Frame 015, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-24`, `2026-07-06`, `2026-07-18`, `2026-08-11`, `2026-08-23`, `2026-09-04`, `2026-09-16`, `2026-09-28`, `2026-10-10`, `2026-10-22` |
| Track 164, Frame 075, Dir D, Mode/Pol 2005/DHDH | 2 | `2026-09-05`, `2026-09-29` |
| Track 164, Frame 075, Dir D, Mode/Pol 2005/QPDH | 6 | `2026-07-07`, `2026-08-24`, `2026-09-05`, `2026-09-17`, `2026-09-29`, `2026-10-11` |
| Track 164, Frame 075, Dir D, Mode/Pol 4005/DHDH | 6 | `2026-06-25`, `2026-07-19`, `2026-08-12`, `2026-09-05`, `2026-09-29`, `2026-10-23` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-17 | 2026-06-20 | 2026-06-24 | 2026-06-25 |
| 2026-06-29 | 2026-07-02 | 2026-07-06 | 2026-07-07 |
| 2026-07-11 | 2026-07-14 | 2026-07-18 | 2026-07-19 |
| 2026-07-23 | 2026-07-26 | 2026-08-11 | 2026-08-12 |
| 2026-08-16 | 2026-08-19 | 2026-08-23 | 2026-08-24 |
| 2026-08-28 | 2026-08-31 | 2026-09-04 | 2026-09-05 |
| 2026-09-09 | 2026-09-12 | 2026-09-16 | 2026-09-17 |
| 2026-09-21 | 2026-09-24 | 2026-09-28 | 2026-09-29 |
| 2026-10-03 | 2026-10-06 | 2026-10-10 | 2026-10-11 |
| 2026-10-15 | 2026-10-18 | 2026-10-22 | 2026-10-23 |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 12 granules for this bounding box.

- **Granule Count**: 12
- **First Acquisition Date**: `2025-11-20`
- **Last Acquisition Date**: `2026-01-20`
- **Total Volume**: 75821.8 MB (74.04 GB)
- **Median Granule Size**: 6554.0 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 041, Frame 015, Dir A, Mode/Pol 4005/DHDH | 5 | `2025-11-25`, `2025-12-07`, `2025-12-19`, `2025-12-31`, `2026-01-12` |
| Track 142, Frame 015, Dir A, Mode/Pol 4005/DHDH | 4 | `2025-11-20`, `2025-12-14`, `2025-12-26`, `2026-01-07` |
| Track 164, Frame 075, Dir D, Mode/Pol 2005/QPDH | 3 | `2025-11-21`, `2025-12-15`, `2026-01-20` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2025-11-20 | 2025-11-21 | 2025-11-25 | 2025-12-07 |
| 2025-12-14 | 2025-12-15 | 2025-12-19 | 2025-12-26 |
| 2025-12-31 | 2026-01-07 | 2026-01-12 | 2026-01-20 |

---

#### sylhet

- **Bounding Box**: `[west: 91.79991686251485, south: 24.8499160415415, east: 91.95011517801963, north: 24.98017175773883]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 20 granules for this bounding box.

- **Granule Count**: 20
- **First Acquisition Date**: `2026-06-20`
- **Last Acquisition Date**: `2026-10-21`
- **Total Volume**: 144754.3 MB (141.36 GB)
- **Median Granule Size**: 7011.8 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 091, Frame 076, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-20`, `2026-07-14`, `2026-08-31`, `2026-09-24`, `2026-10-18` |
| Track 091, Frame 076, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |
| Track 141, Frame 014, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-23`, `2026-07-05`, `2026-07-17`, `2026-08-10`, `2026-08-22`, `2026-09-03`, `2026-09-15`, `2026-09-27`, `2026-10-09`, `2026-10-21` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-20 | 2026-06-23 | 2026-07-02 | 2026-07-05 |
| 2026-07-14 | 2026-07-17 | 2026-07-26 | 2026-08-10 |
| 2026-08-19 | 2026-08-22 | 2026-08-31 | 2026-09-03 |
| 2026-09-12 | 2026-09-15 | 2026-09-24 | 2026-09-27 |
| 2026-10-06 | 2026-10-09 | 2026-10-18 | 2026-10-21 |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 0 granules for this bounding box.

---

#### tanguar

- **Bounding Box**: `[west: 90.97975500811373, south: 25.0497911922581, east: 91.20020157883665, north: 25.220111770127158]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 30 granules for this bounding box.

- **Granule Count**: 30
- **First Acquisition Date**: `2026-06-18`
- **Last Acquisition Date**: `2026-10-21`
- **Total Volume**: 209187.6 MB (204.28 GB)
- **Median Granule Size**: 6880.3 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 069, Frame 014, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-09-22`, `2026-10-04`, `2026-10-16` |
| Track 091, Frame 076, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-20`, `2026-07-14`, `2026-08-31`, `2026-09-24`, `2026-10-18` |
| Track 091, Frame 076, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |
| Track 141, Frame 014, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-23`, `2026-07-05`, `2026-07-17`, `2026-08-10`, `2026-08-22`, `2026-09-03`, `2026-09-15`, `2026-09-27`, `2026-10-09`, `2026-10-21` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-06-18 | 2026-06-20 | 2026-06-23 | 2026-06-30 |
| 2026-07-02 | 2026-07-05 | 2026-07-12 | 2026-07-14 |
| 2026-07-17 | 2026-07-24 | 2026-07-26 | 2026-08-10 |
| 2026-08-17 | 2026-08-19 | 2026-08-22 | 2026-08-29 |
| 2026-08-31 | 2026-09-03 | 2026-09-10 | 2026-09-12 |
| 2026-09-15 | 2026-09-22 | 2026-09-24 | 2026-09-27 |
| 2026-10-04 | 2026-10-06 | 2026-10-09 | 2026-10-16 |
| 2026-10-18 | 2026-10-21 |  |  |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 0 granules for this bounding box.

---

#### Bangladesh (approximate national bounding box)

- **Bounding Box**: `[west: 88.0, south: 20.5, east: 92.7, north: 26.7]`

##### PROVISIONAL Data (`NISAR_L2_GCOV_PROVISIONAL_V1`)

CMR returned 371 granules for this bounding box.

- **Granule Count**: 371
- **First Acquisition Date**: `2026-03-04`
- **Last Acquisition Date**: `2026-10-23`
- **Total Volume**: 1919922.3 MB (1874.92 GB)
- **Median Granule Size**: 6457.7 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 019, Frame 075, Dir D, Mode/Pol 2005/QPDH | 4 | `2026-07-09`, `2026-08-26`, `2026-09-19`, `2026-10-13` |
| Track 019, Frame 075, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-06-27`, `2026-07-21`, `2026-08-14`, `2026-09-07`, `2026-10-01` |
| Track 019, Frame 076, Dir D, Mode/Pol 2005/DHDH | 5 | `2026-06-27`, `2026-07-09`, `2026-09-07`, `2026-10-01`, `2026-10-13` |
| Track 019, Frame 076, Dir D, Mode/Pol 2005/QPDH | 7 | `2026-06-27`, `2026-07-09`, `2026-08-26`, `2026-09-07`, `2026-09-19`, `2026-10-01`, `2026-10-13` |
| Track 019, Frame 076, Dir D, Mode/Pol 4005/DHDH | 6 | `2026-06-27`, `2026-07-09`, `2026-07-21`, `2026-08-14`, `2026-10-01`, `2026-10-13` |
| Track 019, Frame 077, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-27`, `2026-08-26`, `2026-09-07`, `2026-09-19`, `2026-10-01` |
| Track 019, Frame 077, Dir D, Mode/Pol 4005/DHDH | 4 | `2026-07-09`, `2026-07-21`, `2026-08-14`, `2026-10-13` |
| Track 019, Frame 078, Dir D, Mode/Pol 2000/DVNA | 5 | `2026-06-27`, `2026-08-26`, `2026-09-07`, `2026-09-19`, `2026-10-01` |
| Track 019, Frame 078, Dir D, Mode/Pol 2005/DVDV | 4 | `2026-07-09`, `2026-07-21`, `2026-08-14`, `2026-10-13` |
| Track 019, Frame 078, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-27`, `2026-08-26`, `2026-09-07`, `2026-09-19`, `2026-10-01` |
| Track 040, Frame 015, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-16`, `2026-06-28`, `2026-07-10`, `2026-07-22`, `2026-08-15`, `2026-08-27`, `2026-09-08`, `2026-09-20`, `2026-10-02`, `2026-10-14` |
| Track 069, Frame 012, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-09-22`, `2026-10-04`, `2026-10-16` |
| Track 069, Frame 013, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-09-22`, `2026-10-04`, `2026-10-16` |
| Track 069, Frame 014, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-09-22`, `2026-10-04`, `2026-10-16` |
| Track 069, Frame 015, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-18`, `2026-06-30`, `2026-07-12`, `2026-07-24`, `2026-08-17`, `2026-08-29`, `2026-09-10`, `2026-09-22`, `2026-10-04`, `2026-10-16` |
| Track 091, Frame 075, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-20`, `2026-07-14`, `2026-08-31`, `2026-09-24`, `2026-10-18` |
| Track 091, Frame 075, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |
| Track 091, Frame 076, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-20`, `2026-07-14`, `2026-08-31`, `2026-09-24`, `2026-10-18` |
| Track 091, Frame 076, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |
| Track 091, Frame 077, Dir D, Mode/Pol 2000/DVNA | 2 | `2026-07-14`, `2026-10-18` |
| Track 091, Frame 077, Dir D, Mode/Pol 2005/DHDH | 3 | `2026-07-02`, `2026-09-12`, `2026-10-06` |
| Track 091, Frame 077, Dir D, Mode/Pol 2005/DVDV | 2 | `2026-07-26`, `2026-08-19` |
| Track 091, Frame 077, Dir D, Mode/Pol 2005/QPDH | 8 | `2026-06-20`, `2026-07-02`, `2026-07-14`, `2026-08-31`, `2026-09-12`, `2026-09-24`, `2026-10-06`, `2026-10-18` |
| Track 091, Frame 077, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-07-02`, `2026-07-26`, `2026-08-19`, `2026-09-12`, `2026-10-06` |
| Track 091, Frame 078, Dir D, Mode/Pol 2000/DVNA | 6 | `2026-06-20`, `2026-07-02`, `2026-08-31`, `2026-09-12`, `2026-09-24`, `2026-10-06` |
| Track 091, Frame 078, Dir D, Mode/Pol 2005/DVDV | 4 | `2026-07-14`, `2026-07-26`, `2026-08-19`, `2026-10-18` |
| Track 091, Frame 078, Dir D, Mode/Pol 2005/QPDH | 6 | `2026-06-20`, `2026-07-02`, `2026-08-31`, `2026-09-12`, `2026-09-24`, `2026-10-06` |
| Track 098, Frame 012, Dir A, Mode/Pol 2005/DVDV | 8 | `2026-05-03`, `2026-06-20`, `2026-07-26`, `2026-08-19`, `2026-08-31`, `2026-09-12`, `2026-09-24`, `2026-10-06` |
| Track 098, Frame 012, Dir A, Mode/Pol 4005/DHDH | 17 | `2026-03-04`, `2026-03-16`, `2026-04-09`, `2026-04-21`, `2026-05-03`, `2026-05-15`, `2026-05-27`, `2026-06-20`, `2026-07-02`, `2026-07-14`, `2026-07-26`, `2026-08-19`, `2026-08-31`, `2026-09-12`, `2026-09-24`, `2026-10-06`, `2026-10-18` |
| Track 098, Frame 013, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-20`, `2026-07-02`, `2026-07-14`, `2026-07-26`, `2026-08-19`, `2026-08-31`, `2026-09-12`, `2026-09-24`, `2026-10-06`, `2026-10-18` |
| Track 120, Frame 075, Dir D, Mode/Pol 2005/DHDH | 4 | `2026-06-22`, `2026-07-04`, `2026-09-26`, `2026-10-08` |
| Track 120, Frame 075, Dir D, Mode/Pol 2005/QPDH | 7 | `2026-06-22`, `2026-07-04`, `2026-08-21`, `2026-09-02`, `2026-09-14`, `2026-09-26`, `2026-10-08` |
| Track 120, Frame 075, Dir D, Mode/Pol 4005/DHDH | 5 | `2026-06-22`, `2026-07-04`, `2026-07-16`, `2026-09-26`, `2026-10-20` |
| Track 120, Frame 076, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-22`, `2026-08-21`, `2026-09-02`, `2026-09-14`, `2026-09-26` |
| Track 120, Frame 076, Dir D, Mode/Pol 4005/DHDH | 4 | `2026-07-04`, `2026-07-16`, `2026-10-08`, `2026-10-20` |
| Track 120, Frame 077, Dir D, Mode/Pol 2005/DHDH | 1 | `2026-06-22` |
| Track 120, Frame 077, Dir D, Mode/Pol 2005/QPDH | 5 | `2026-06-22`, `2026-08-21`, `2026-09-02`, `2026-09-14`, `2026-09-26` |
| Track 120, Frame 077, Dir D, Mode/Pol 4005/DHDH | 4 | `2026-07-04`, `2026-07-16`, `2026-10-08`, `2026-10-20` |
| Track 141, Frame 012, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-23`, `2026-07-05`, `2026-07-17`, `2026-08-10`, `2026-08-22`, `2026-09-03`, `2026-09-15`, `2026-09-27`, `2026-10-09`, `2026-10-21` |
| Track 141, Frame 013, Dir A, Mode/Pol 4005/DHDH | 9 | `2026-06-23`, `2026-07-05`, `2026-07-17`, `2026-08-10`, `2026-09-03`, `2026-09-15`, `2026-09-27`, `2026-10-09`, `2026-10-21` |
| Track 141, Frame 014, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-23`, `2026-07-05`, `2026-07-17`, `2026-08-10`, `2026-08-22`, `2026-09-03`, `2026-09-15`, `2026-09-27`, `2026-10-09`, `2026-10-21` |
| Track 141, Frame 015, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-23`, `2026-07-05`, `2026-07-17`, `2026-08-10`, `2026-08-22`, `2026-09-03`, `2026-09-15`, `2026-09-27`, `2026-10-09`, `2026-10-21` |
| Track 163, Frame 075, Dir D, Mode/Pol 2005/QPDH | 4 | `2026-07-07`, `2026-08-24`, `2026-09-17`, `2026-10-11` |
| Track 163, Frame 075, Dir D, Mode/Pol 4005/DHDH | 6 | `2026-06-25`, `2026-07-19`, `2026-08-12`, `2026-09-05`, `2026-09-29`, `2026-10-23` |
| Track 163, Frame 076, Dir D, Mode/Pol 2005/QPDH | 4 | `2026-07-07`, `2026-08-24`, `2026-09-17`, `2026-10-11` |
| Track 163, Frame 076, Dir D, Mode/Pol 4005/DHDH | 6 | `2026-06-25`, `2026-07-19`, `2026-08-12`, `2026-09-05`, `2026-09-29`, `2026-10-23` |
| Track 163, Frame 077, Dir D, Mode/Pol 2005/QPDH | 4 | `2026-07-07`, `2026-08-24`, `2026-09-17`, `2026-10-11` |
| Track 163, Frame 077, Dir D, Mode/Pol 4005/DHDH | 6 | `2026-06-25`, `2026-07-19`, `2026-08-12`, `2026-09-05`, `2026-09-29`, `2026-10-23` |
| Track 163, Frame 078, Dir D, Mode/Pol 2000/DVNA | 4 | `2026-07-07`, `2026-08-24`, `2026-09-17`, `2026-10-11` |
| Track 163, Frame 078, Dir D, Mode/Pol 2005/QPDH | 4 | `2026-07-07`, `2026-08-24`, `2026-09-17`, `2026-10-11` |
| Track 163, Frame 078, Dir D, Mode/Pol 4005/DHDH | 6 | `2026-06-25`, `2026-07-19`, `2026-08-12`, `2026-09-05`, `2026-09-29`, `2026-10-23` |
| Track 170, Frame 012, Dir A, Mode/Pol 2005/DVDV | 10 | `2026-06-25`, `2026-07-07`, `2026-07-19`, `2026-08-12`, `2026-08-24`, `2026-09-05`, `2026-09-17`, `2026-09-29`, `2026-10-11`, `2026-10-23` |
| Track 170, Frame 012, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-25`, `2026-07-07`, `2026-07-19`, `2026-08-12`, `2026-08-24`, `2026-09-05`, `2026-09-17`, `2026-09-29`, `2026-10-11`, `2026-10-23` |
| Track 170, Frame 013, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-25`, `2026-07-07`, `2026-07-19`, `2026-08-12`, `2026-08-24`, `2026-09-05`, `2026-09-17`, `2026-09-29`, `2026-10-11`, `2026-10-23` |
| Track 170, Frame 014, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-25`, `2026-07-07`, `2026-07-19`, `2026-08-12`, `2026-08-24`, `2026-09-05`, `2026-09-17`, `2026-09-29`, `2026-10-11`, `2026-10-23` |
| Track 170, Frame 015, Dir A, Mode/Pol 4005/DHDH | 10 | `2026-06-25`, `2026-07-07`, `2026-07-19`, `2026-08-12`, `2026-08-24`, `2026-09-05`, `2026-09-17`, `2026-09-29`, `2026-10-11`, `2026-10-23` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2026-03-04 | 2026-03-16 | 2026-04-09 | 2026-04-21 |
| 2026-05-03 | 2026-05-15 | 2026-05-27 | 2026-06-16 |
| 2026-06-18 | 2026-06-20 | 2026-06-22 | 2026-06-23 |
| 2026-06-25 | 2026-06-27 | 2026-06-28 | 2026-06-30 |
| 2026-07-02 | 2026-07-04 | 2026-07-05 | 2026-07-07 |
| 2026-07-09 | 2026-07-10 | 2026-07-12 | 2026-07-14 |
| 2026-07-16 | 2026-07-17 | 2026-07-19 | 2026-07-21 |
| 2026-07-22 | 2026-07-24 | 2026-07-26 | 2026-08-10 |
| 2026-08-12 | 2026-08-14 | 2026-08-15 | 2026-08-17 |
| 2026-08-19 | 2026-08-21 | 2026-08-22 | 2026-08-24 |
| 2026-08-26 | 2026-08-27 | 2026-08-29 | 2026-08-31 |
| 2026-09-02 | 2026-09-03 | 2026-09-05 | 2026-09-07 |
| 2026-09-08 | 2026-09-10 | 2026-09-12 | 2026-09-14 |
| 2026-09-15 | 2026-09-17 | 2026-09-19 | 2026-09-20 |
| 2026-09-22 | 2026-09-24 | 2026-09-26 | 2026-09-27 |
| 2026-09-29 | 2026-10-01 | 2026-10-02 | 2026-10-04 |
| 2026-10-06 | 2026-10-08 | 2026-10-09 | 2026-10-11 |
| 2026-10-13 | 2026-10-14 | 2026-10-16 | 2026-10-18 |
| 2026-10-20 | 2026-10-21 | 2026-10-23 |  |


##### BETA Data (`NISAR_L2_GCOV_BETA_V1`)

CMR returned 24 granules for this bounding box.

- **Granule Count**: 24
- **First Acquisition Date**: `2025-11-28`
- **Last Acquisition Date**: `2026-01-17`
- **Total Volume**: 154689.7 MB (151.06 GB)
- **Median Granule Size**: 6708.3 MB

**Distinct Acquisition Geometries & Modes**:
| Acquisition Geometry & Mode | Dates Count | Acquisition Dates |
| :--- | :---: | :--- |
| Track 098, Frame 012, Dir A, Mode/Pol 4005/DHDH | 5 | `2025-11-28`, `2025-12-10`, `2025-12-22`, `2026-01-03`, `2026-01-15` |
| Track 098, Frame 013, Dir A, Mode/Pol 4005/DHDH | 5 | `2025-11-28`, `2025-12-10`, `2025-12-22`, `2026-01-03`, `2026-01-15` |
| Track 120, Frame 075, Dir D, Mode/Pol 2005/QPDH | 5 | `2025-11-30`, `2025-12-12`, `2025-12-24`, `2026-01-05`, `2026-01-17` |
| Track 120, Frame 075, Dir D, Mode/Pol 4005/DHDH | 1 | `2025-11-30` |
| Track 120, Frame 076, Dir D, Mode/Pol 2005/QPDH | 4 | `2025-11-30`, `2025-12-24`, `2026-01-05`, `2026-01-17` |
| Track 120, Frame 077, Dir D, Mode/Pol 2005/QPDH | 4 | `2025-11-30`, `2025-12-24`, `2026-01-05`, `2026-01-17` |

**All Acquisition Dates**:

| Acquisition Dates | | | |
| :--- | :--- | :--- | :--- |
| 2025-11-28 | 2025-11-30 | 2025-12-10 | 2025-12-12 |
| 2025-12-22 | 2025-12-24 | 2026-01-03 | 2026-01-05 |
| 2026-01-15 | 2026-01-17 |  |  |

---
