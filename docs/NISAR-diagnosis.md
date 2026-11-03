# NASA NISAR L-Band Time Series Diagnosis & Anomaly Investigation

This document provides the per-date radiometric diagnostics, spatial correlation matrix, HDF5 metadata/layer inspection, known issues check, missing cycle investigation, and formal exclusion rule evaluation for the 10-date NASA NISAR L-band GCOV time series over Hakaluki Haor, Bangladesh (Track 141, Frame 014, Direction Ascending, Dual-Pol DHDH).

---

## 1. Backscatter Distribution Diagnostics (Step 1a)

All statistics were computed from the 1024 x 1024 pixel windows in `data/samples/nisar/hakaluki-haor/` covering the NW quadrant of the Hakaluki Haor area of interest. Linear power backscatter ($\gamma^0$) was converted to decibels ($\text{dB} = 10 \cdot \log_{10}(\text{power})$).

### Table 1a-1: HH Backscatter Distribution (dB) across 10 Dates
| Date | Finite % | Mean (dB) | p1 | p5 | p25 | p50 (Median) | p75 | p95 | p99 | < -24 dB | < -22 dB | < -20 dB | < -18 dB | < -16 dB | < -14 dB | < -12 dB | < -10 dB |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 2026-06-23 | 100.0% | -15.39 | -22.99 | -21.42 | -19.17 | -17.42 | -13.97 | -2.76 | +0.72 | 0.30% | 2.88% | 15.27% | 41.74% | 65.41% | 74.93% | 78.51% | 81.26% |
| 2026-07-05 | 100.0% | -15.01 | -22.58 | -20.98 | -18.69 | -16.89 | -12.89 | -3.38 | +0.11 | 0.18% | 1.87% | 11.03% | 34.38% | 60.19% | 72.20% | 76.78% | 80.58% |
| 2026-07-17 | 100.0% | -14.90 | -22.34 | -20.72 | -18.41 | -16.67 | -13.61 | -3.24 | +0.28 | 0.13% | 1.45% | 9.04% | 30.65% | 58.74% | 73.70% | 78.08% | 81.03% |
| 2026-08-10 | 100.0% | -15.15 | -22.79 | -21.21 | -18.94 | -17.18 | -13.80 | -2.75 | +0.69 | 0.23% | 2.33% | 13.04% | 38.30% | 63.65% | 74.51% | 77.75% | 80.22% |
| 2026-08-22 | 100.0% | +23.10 | +11.26 | +14.89 | +20.27 | +23.31 | +26.14 | +30.48 | +33.61 | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% |
| 2026-09-03 | 100.0% | -14.72 | -22.39 | -20.79 | -18.51 | -16.70 | -12.27 | -3.07 | +0.36 | 0.14% | 1.54% | 9.65% | 31.89% | 58.24% | 71.15% | 75.46% | 78.88% |
| 2026-09-15 | 100.0% | -15.03 | -23.18 | -21.58 | -19.27 | -17.37 | -10.89 | -3.07 | +0.23 | 0.37% | 3.41% | 16.57% | 42.08% | 62.40% | 69.78% | 73.08% | 76.75% |
| 2026-09-27 | 100.0% | -14.10 | -22.72 | -21.10 | -18.68 | -16.46 | -9.21 | -2.78 | +0.36 | 0.21% | 2.16% | 11.74% | 33.29% | 53.61% | 62.74% | 67.55% | 72.71% |
| 2026-10-09 | 100.0% | -13.10 | -21.65 | -20.02 | -17.60 | -15.39 | -8.40 | -1.76 | +1.41 | 0.05% | 0.68% | 5.07% | 20.46% | 43.98% | 59.31% | 65.80% | 70.65% |
| 2026-10-21 | 100.0% | -12.66 | -21.79 | -20.08 | -17.35 | -14.26 | -7.98 | -2.36 | +0.65 | 0.06% | 0.80% | 5.31% | 18.88% | 37.77% | 51.38% | 59.71% | 67.05% |

### Table 1a-2: HV Backscatter Distribution (dB) across 10 Dates
| Date | Finite % | Mean (dB) | p1 | p5 | p25 | p50 (Median) | p75 | p95 | p99 | < -24 dB | < -22 dB | < -20 dB | < -18 dB | < -16 dB | < -14 dB | < -12 dB | < -10 dB |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 2026-06-23 | 100.0% | -21.09 | -27.91 | -26.38 | -24.22 | -22.61 | -20.19 | -10.00 | -7.13 | 28.11% | 58.77% | 75.85% | 80.79% | 83.47% | 86.50% | 90.52% | 94.99% |
| 2026-07-05 | 100.0% | -21.20 | -27.97 | -26.43 | -24.27 | -22.63 | -19.98 | -10.68 | -7.81 | 28.88% | 58.65% | 74.93% | 80.47% | 83.98% | 87.68% | 92.10% | 96.30% |
| 2026-07-17 | 100.0% | -21.32 | -27.99 | -26.47 | -24.32 | -22.72 | -20.29 | -10.81 | -7.93 | 29.67% | 60.23% | 76.32% | 81.18% | 84.42% | 88.07% | 92.43% | 96.51% |
| 2026-08-10 | 100.0% | -21.06 | -27.83 | -26.30 | -24.15 | -22.54 | -20.06 | -10.25 | -7.39 | 27.15% | 57.85% | 75.26% | 80.30% | 83.36% | 86.84% | 91.12% | 95.49% |
| 2026-08-22 | 100.0% | +13.28 | +2.16 | +5.64 | +10.73 | +13.51 | +16.08 | +19.98 | +22.78 | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% |
| 2026-09-03 | 100.0% | -20.93 | -27.70 | -26.16 | -23.98 | -22.34 | -19.71 | -10.49 | -7.62 | 24.78% | 54.85% | 73.62% | 79.94% | 83.46% | 87.17% | 91.61% | 95.95% |
| 2026-09-15 | 100.0% | -21.02 | -27.90 | -26.35 | -24.15 | -22.45 | -19.41 | -10.73 | -7.85 | 27.09% | 55.98% | 72.55% | 79.08% | 83.49% | 87.66% | 92.22% | 96.38% |
| 2026-09-27 | 100.0% | -20.54 | -27.64 | -26.07 | -23.79 | -21.91 | -18.17 | -10.79 | -7.92 | 22.40% | 48.92% | 66.72% | 75.66% | 82.18% | 87.41% | 92.29% | 96.50% |
| 2026-10-09 | 100.0% | -20.22 | -27.41 | -25.83 | -23.53 | -21.60 | -17.72 | -10.50 | -7.67 | 19.34% | 45.18% | 64.24% | 73.91% | 80.87% | 86.46% | 91.53% | 95.99% |
| 2026-10-21 | 100.0% | -19.85 | -27.25 | -25.62 | -23.19 | -21.03 | -17.08 | -10.76 | -7.87 | 16.27% | 39.40% | 58.69% | 70.53% | 79.71% | 86.69% | 92.17% | 96.46% |

---

## 2. Multi-Temporal Pixel-Wise Correlation Matrix (Step 1b)

The 10 x 10 pixel-wise Pearson correlation matrix was computed across all 1,048,576 pixels for the HH dB channel.

### Table 1b: HH 10x10 Pearson Correlation Matrix
| Date | 06-23 | 07-05 | 07-17 | 08-10 | 08-22 | 09-03 | 09-15 | 09-27 | 10-09 | 10-21 | Mean Correlation (other 9) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **2026-06-23** | 1.000 | 0.857 | 0.837 | 0.847 | 0.220 | 0.828 | 0.810 | 0.747 | 0.710 | 0.652 | **0.723** |
| **2026-07-05** | 0.857 | 1.000 | 0.844 | 0.846 | 0.248 | 0.831 | 0.821 | 0.761 | 0.736 | 0.676 | **0.736** |
| **2026-07-17** | 0.837 | 0.844 | 1.000 | 0.857 | 0.205 | 0.809 | 0.773 | 0.696 | 0.666 | 0.607 | **0.699** |
| **2026-08-10** | 0.847 | 0.846 | 0.857 | 1.000 | 0.209 | 0.827 | 0.796 | 0.727 | 0.691 | 0.638 | **0.715** |
| **2026-08-22** | 0.220 | 0.248 | 0.205 | 0.209 | 1.000 | 0.263 | 0.295 | 0.358 | 0.354 | 0.354 | **0.279** |
| **2026-09-03** | 0.828 | 0.831 | 0.809 | 0.827 | 0.263 | 1.000 | 0.869 | 0.797 | 0.770 | 0.698 | **0.744** |
| **2026-09-15** | 0.810 | 0.821 | 0.773 | 0.796 | 0.295 | 0.869 | 1.000 | 0.861 | 0.841 | 0.769 | **0.759** |
| **2026-09-27** | 0.747 | 0.761 | 0.696 | 0.727 | 0.358 | 0.797 | 0.861 | 1.000 | 0.883 | 0.829 | **0.740** |
| **2026-10-09** | 0.710 | 0.736 | 0.666 | 0.691 | 0.354 | 0.770 | 0.841 | 0.883 | 1.000 | 0.852 | **0.723** |
| **2026-10-21** | 0.652 | 0.676 | 0.607 | 0.638 | 0.354 | 0.698 | 0.769 | 0.829 | 0.852 | 1.000 | **0.675** |

- **Observations**:
  - The 9 nominal dates exhibit strong inter-date correlations ranging from $r = 0.607$ to $0.883$, with per-date mean correlations between $0.675$ and $0.759$.
  - In stark contrast, `2026-08-22` exhibits weak correlations with all other dates ($r = 0.205$ to $0.358$), with a mean correlation of only **$0.279$**.

---

## 3. Metadata and Layer Inspection for 2026-08-10, 2026-08-22, 2026-09-03 (Step 1c)

Small metadata reads were streamed directly from the ASF DAAC archive via HTTPS range requests for the triplet:
- Pre-anomaly: `2026-08-10` (`NISAR_L2_PR_GCOV_027_141_A_014_4005_DHDH_A_20260810T231313_20260810T231348_P05023_N_F_J_001.h5`)
- Anomaly date: `2026-08-22` (`NISAR_L2_PR_GCOV_028_141_A_014_4005_DHDH_A_20260822T231312_20260822T231347_P05023_N_F_J_001.h5`)
- Post-anomaly: `2026-09-03` (`NISAR_L2_PR_GCOV_029_141_A_014_4005_DHDH_A_20260903T231312_20260903T231347_P05023_N_F_J_001.h5`)

### Identification Group (`/science/LSAR/identification`) Comparison
| Parameter | 2026-08-10 (Cycle 027) | 2026-08-22 (Cycle 028) | 2026-09-03 (Cycle 029) | Match / Status |
|---|---|---|---|---|
| `compositeReleaseId` (CRID) | `P05023` | `P05023` | `P05023` | Identical |
| `productVersion` | `1.0.11` | `1.0.11` | `1.0.11` | Identical |
| `productSpecificationVersion` | `1.5.0` | `1.5.0` | `1.5.0` | Identical |
| `processingType` | `Nominal` | `Nominal` | `Nominal` | Identical |
| `processingCenter` | `JPL` | `JPL` | `JPL` | Identical |
| `diagnosticModeFlag` | `0` | `0` | `0` | Identical (nominal mode) |
| `hasInputDataException` | `0` | `0` | `0` | Identical (no exception flagged) |
| `isJointObservation` | `True` | `True` | `True` | Identical |
| `trackNumber` / `frameNumber` | `141` / `14` | `141` / `14` | `141` / `14` | Identical |
| `orbitPassDirection` | `Ascending` | `Ascending` | `Ascending` | Identical |
| `lookDirection` | `Left` | `Left` | `Left` | Identical |
| `radarBand` | `L` | `L` | `L` | Identical |
| `absoluteOrbitNumber` | `5430` | `5603` (+173) | `5776` (+173) | Nominal 12-day repeat orbit |
| `zeroDopplerStartTime` | `2026-08-10T23:13:13` | `2026-08-22T23:13:12` | `2026-09-03T23:13:12` | Nominal orbital timing |

### Internal Grid Layers in Hakaluki Window (`1024 x 1024` pixels)

1. **`mask`** (`/science/LSAR/GCOV/grids/frequencyA/mask`):
   - **Product Specification Meaning**: *"Mask indicating the subswath number associated with valid GCOV samples. A GCOV sample is only considered valid if it is generated from fully-focused radar samples. If at least one radar sample in the averaging set is partially focused or invalid, the corresponding mask pixel will contain the value 0. GCOV pixels outside of the radar acquisition extent are filled with the value 255."*
   - **Values**:
     - `2026-08-10`: 1,048,576 pixels (100.0%) = `1` (subswath 1, fully focused valid). `0` count = 0, `255` count = 0.
     - `2026-08-22`: 1,048,576 pixels (100.0%) = `1` (subswath 1, fully focused valid). `0` count = 0, `255` count = 0.
     - `2026-09-03`: 1,048,576 pixels (100.0%) = `1` (subswath 1, fully focused valid). `0` count = 0, `255` count = 0.

2. **`inputDataExceptionMask`** (`/science/LSAR/GCOV/grids/frequencyA/inputDataExceptionMask`):
   - **Product Specification Meaning**: *"Bitwise OR of input data exception codes for each image pixel (0: no anomaly, 2: NISAR LSAR qFSP-H1 sample slip)."*
   - **Values**:
     - `2026-08-10`: 1,048,576 pixels (100.0%) = `0` (no anomaly).
     - `2026-08-22`: 1,048,576 pixels (100.0%) = `0` (no anomaly).
     - `2026-09-03`: 1,048,576 pixels (100.0%) = `0` (no anomaly).

3. **`numberOfLooks`** (`/science/LSAR/GCOV/grids/frequencyA/numberOfLooks`):
   - **Product Specification Meaning**: *"Number of averaged radar-grid pixels for covariance estimation."*
   - **Statistics in Window**:
     - `2026-08-10`: min = 1.62, p25 = 4.88, median = 4.92, p75 = 4.97, max = 8.43, mean = 4.92.
     - `2026-08-22`: min = 1.62, p25 = 4.88, median = 4.92, p75 = 4.97, max = 8.43, mean = 4.92.
     - `2026-09-03`: min = 1.62, p25 = 4.87, median = 4.92, p75 = 4.97, max = 8.43, mean = 4.92.
     - *Conclusion*: Identical multi-looking geometry across all passes.

4. **`rtcGammaToSigmaFactor`** (`/science/LSAR/GCOV/grids/frequencyA/rtcGammaToSigmaFactor`):
   - **Product Specification Meaning**: *"Radiometric terrain correction (RTC) scaling factor to normalize backscatter coefficients from gamma0 to sigma0, accounting for local terrain."*
   - **Statistics in Window**:
     - `2026-08-10`: min = 0.222, p25 = 0.722, median = 0.728, p75 = 0.734, max = 0.972, mean = 0.726.
     - `2026-08-22`: min = 0.223, p25 = 0.722, median = 0.728, p75 = 0.734, max = 0.977, mean = 0.726.
     - `2026-09-03`: min = 0.223, p25 = 0.722, median = 0.728, p75 = 0.734, max = 0.972, mean = 0.726.
     - *Conclusion*: Identical DEM and terrain illumination geometry across all passes.

5. **Backscatter Covariance Terms (`HHHH` and `HVHV`)**:
   - `HHHH` linear power in Hakaluki window:
     - `2026-08-10`: median = **0.0191** (-17.18 dB), mean = **0.1109** (-9.55 dB)
     - `2026-08-22`: median = **214.266** (+23.31 dB), mean = **350.344** (+25.45 dB) — **~11,200x (~+40.5 dB) higher!**
     - `2026-09-03`: median = **0.0214** (-16.70 dB), mean = **0.1085** (-9.65 dB)
   - `HVHV` linear power in Hakaluki window:
     - `2026-08-10`: median = **0.00557** (-22.54 dB), mean = **0.0188**
     - `2026-08-22`: median = **22.420** (+13.51 dB), mean = **33.277** — **~4,000x (~+36.0 dB) higher!**
     - `2026-09-03`: median = **0.00584** (-22.34 dB), mean = **0.0184**

---

## 4. Known-Issues and Documentation Check (Step 1d)

The following official documentation pages from the NASA NISAR Science Data System and ASF DAAC were fetched and inspected:
1. `https://nisar-docs.asf.alaska.edu/availability-overview/`
2. `https://nisar-docs.asf.alaska.edu/provisional-known-issues`
3. `https://nisar-docs.asf.alaska.edu/product-known-issues`
4. `https://nisar-docs.asf.alaska.edu/gcov/`
5. `https://nisar-docs.asf.alaska.edu/`

### Findings
- **General PROVISIONAL Product Status**:
  The user guide confirms that datasets released in July 2026 carry Composite Release ID (CRID) `P05023` and maturity `PROVISIONAL`. These products are calibrated and validated only at a limited set of global sites, are subject to known issues (such as ionospheric residuals, RFI filter residuals, and incomplete L0B downlink recovery in 1-2% of frames), and will be systematically reprocessed by the SDS upon operational baseline release.
- **Specific Finding on Acquisition 2026-08-22 (Cycle 028)**:
  **No known issue found in the pages checked.** There is no data notice, errata, or documented anomaly referencing cycle 028 or acquisition date 2026-08-22.

---

## 5. Investigation of Missing Acquisition 2026-07-29 (Step 1e)

The 12-day nominal orbital repeat cycle predicts an acquisition on **2026-07-29** (cycle 026) between cycle 025 (2026-07-17) and cycle 027 (2026-08-10), creating a 24-day observation gap.

### CMR Query Results
A live query of the NASA Common Metadata Repository (CMR) Granule Search API for collections `NISAR_L2_GCOV_PROVISIONAL_V1` (Concept ID `C2854338529-ASF`) and `NISAR_L2_GCOV_BETA_V1` (Concept ID `C3622214170-ASF`) for Track 141, Frame 014, Direction Ascending over the temporal window `2026-07-28` to `2026-07-30` returned:
- **`CMR-Hits`: 0**.
- Exactly 10 granules exist in CMR for Track 141 Frame 014 Dir A across the entire mission archive (cycles 023, 024, 025, 027, 028, 029, 030, 031, 032, 033).
- No granule exists for cycle 026 in either the PROVISIONAL or BETA collection.

### Cause from Official Documentation
On `https://nisar-docs.asf.alaska.edu/availability-overview/` under section **"NISAR Data Gap"**, the documentation explicitly records:
> *"A permanent NISAR instrument data gap exists between `2026-07-27T22:03:25Z` and `2026-08-10T00:55:27Z`."*

- **Conclusion**: The missing 2026-07-29 acquisition fell squarely within this officially documented permanent instrument data gap. The granule was never downlinked or produced by the instrument and SDS; it was not omitted due to pipeline error or download filtering.

---

## 6. Exclusion Rule Outcomes and Cause Statement (Step 1f & 1g)

The pre-declared decision rules were evaluated mechanically across all 10 dates:

1. **Radiometric Outlier Rule**:
   - Per-date HH median backscatter $m_d$: `[-17.42, -16.89, -16.67, -17.18, +23.31, -16.70, -17.37, -16.46, -15.39, -14.26]` dB.
   - Median of medians $M = -16.685\text{ dB}$.
   - Median Absolute Deviation $\text{MAD} = \text{median}(|m_d - M|) = 0.590\text{ dB}$.
   - Outlier threshold: $3 \times 1.4826 \times \text{MAD} = 2.624\text{ dB}$.
   - A date is excluded if $|m_d - M| > 2.624\text{ dB}$.
   - For `2026-08-22`: $|+23.31 - (-16.685)| = 40.00\text{ dB} \gg 2.624\text{ dB}$.
   - **Outcome**: `2026-08-22` is **EXCLUDED: radiometric outlier**.
   - All other 9 dates have $|m_d - M| \le 2.43\text{ dB}$ (within the $2.624\text{ dB}$ threshold) and are NOT radiometric outliers.

2. **Low Correlation Rule**:
   - Per-date mean correlation with the other 9 dates:
     `[0.723, 0.736, 0.699, 0.715, 0.279, 0.744, 0.759, 0.740, 0.723, 0.675]`.
   - Median of mean correlations $= 0.723$.
   - Low correlation threshold $= 0.5 \times 0.723 = 0.3615$.
   - A date is excluded if mean correlation $< 0.3615$.
   - For `2026-08-22`: mean correlation $= 0.279 < 0.3615$.
   - **Outcome**: `2026-08-22` is **EXCLUDED: low correlation**.
   - All other 9 dates have mean correlations between $0.675$ and $0.759$ and are NOT low correlation.

### Summary of Date Status
| Date | Cycle | Median HH (dB) | $|m_d - M|$ (dB) | Mean Correlation | Status |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 2026-06-23 | 023 | -17.42 | 0.73 | 0.723 | **VALID (Included)** |
| 2026-07-05 | 024 | -16.89 | 0.20 | 0.736 | **VALID (Included)** |
| 2026-07-17 | 025 | -16.67 | 0.02 | 0.699 | **VALID (Included)** |
| 2026-08-10 | 027 | -17.18 | 0.49 | 0.715 | **VALID (Included)** |
| **2026-08-22** | **028** | **+23.31** | **40.00** | **0.279** | **EXCLUDED** (`radiometric outlier` & `low correlation`) |
| 2026-09-03 | 029 | -16.70 | 0.01 | 0.744 | **VALID (Included)** |
| 2026-09-15 | 030 | -17.37 | 0.68 | 0.759 | **VALID (Included)** |
| 2026-09-27 | 031 | -16.46 | 0.23 | 0.740 | **VALID (Included)** |
| 2026-10-09 | 032 | -15.39 | 1.30 | 0.723 | **VALID (Included)** |
| 2026-10-21 | 033 | -14.26 | 2.43 | 0.675 | **VALID (Included)** |

### Cause Statement for 2026-08-22 Anomaly
**Cause: NOT ESTABLISHED**

- **Evidence**:
  1. The HDF5 metadata shows identical `processingCenter: JPL`, `productVersion: 1.0.11`, `productSpecificationVersion: 1.5.0`, `CRID: P05023`, `diagnosticModeFlag: 0`, and `processingType: Nominal` to the adjacent passes.
  2. Internal quality layers show `inputDataExceptionMask: 0` (no telemetry or sample slip exceptions) and `mask: 1` (100% fully-focused valid samples).
  3. No error or anomaly notice was published in the NISAR Data User Guide or ASF DAAC notices for cycle 028.
  4. While the data values are objectively ~+38 dB higher than expected for terrestrial radar backscatter, the exact failure mechanism inside the SDS or payload telemetry cannot be proven from publicly accessible data alone.
- *Hypothesis (not tested)*: A gain scaling or radiometry normalization error (e.g. unapplied receiver attenuation table or faulty absolute calibration constant) occurred during L0B/L2 processing at JPL for this specific granule.
