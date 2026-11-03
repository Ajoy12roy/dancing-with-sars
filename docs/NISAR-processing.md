# NASA NISAR L-Band Processing & Validation Report (Day 7a.1 Corrections)

This report documents the revised data-quality processing, multi-temporal analysis, and validation diagnostics for NASA NISAR L-band L2 GCOV (Geocoded Polarimetric Covariance) products over Hakaluki Haor, Bangladesh.

---

## 1. Day 7a Corrections Summary

| Item | Day 7a Report (Erroneous / Unsubstantiated) | Day 7a.1 Correction (Evidence-Based & Deterministic) |
|---|---|---|
| **Otsu $\eta$ Ratio** | Reported $\eta = 1.2635$ (mathematically impossible; $\eta \in [0, 1]$). | Corrected to **$\eta = 0.7923$**. Root cause diagnosed: pixels outside the $[-30, +5]$ dB histogram range (especially ~1M outlier pixels on 2026-08-22) were dropped from bin counts but counted in total pixels, breaking the probability sum ($\sum p \ne 1$). Now $\sigma_B^2$ and $\sigma_T^2$ are derived from the exact same histogram. |
| **Bimodality Claim** | Claimed `is_bimodal: True` based on flawed $\eta$ and arbitrary peak counts. | Evaluated with pre-declared **Bimodality Rule**: $\eta \ge 0.50$ (PASS: $0.7923$), `spread <= 3 dB` (PASS: $1.25\text{ dB}$), `valley_ratio <= 0.60` (**FAIL**: $0.7027 > 0.60$). Verdict: **FAILED ("threshold NOT reliably determinable")**. |
| **Operational Threshold** | Imposed single threshold of $-10.62\text{ dB}$, marking ~80% of window as "water". | **No single threshold could be justified; results are shown as a threshold grid.** Single-threshold change detection outputs were removed per Step 4a. |
| **Quantity Terminology** | Labelled backscatter below threshold as "water area". | Quantity corrected to **"low-backscatter area (HH)"**. At L-band, backscatter below $-10$ to $-16\text{ dB}$ includes wet vegetation, flooded crops, and saturated soil; only backscatter $< -20\text{ dB}$ corresponds primarily to open water surfaces. |
| **Cycle 028 (2026-08-22)** | Labelled "provisional calibration anomaly" without proof, yet included in pooled statistics. | Formally excluded via pre-declared **radiometric outlier** ($|m_d - M| = 40.00\text{ dB} > 2.62\text{ dB}$) and **low correlation** ($\bar{r} = 0.279 < 0.362$) rules. Cause explicitly marked: **`Cause: NOT ESTABLISHED`**. |
| **Missing Cycle 026 (2026-07-29)** | 24-day gap between 2026-07-17 and 2026-08-10 was unreported. | Live CMR query verified zero granules exist. Investigated and linked to official ASF user guide: **Permanent instrument data gap** between `2026-07-27T22:03:25Z` and `2026-08-10T00:55:27Z`. |
| **Pair Selection** | Selected 2026-06-23 vs 2026-07-17 ($2.97\%$ change) arbitrarily. | Bimodality failed; per Step 4a, no change pair was produced or retained. |
| **Speculative Notes** | Added qualitative labels ("Initial monsoon peak", "Autumn low water", "Dry season base extent"). | **All speculative table notes removed.** |
| **Window Coverage** | Unstated that 1024 x 1024 window covered only a fraction of the AOI. | Window geometry and coverage explicitly quantified: **$104.86\text{ km}^2$ covers $32.40\%$** (the NW quadrant) of the Hakaluki case bounding box ($323.62\text{ km}^2$). Incomparable with full C-band case. |

---

## 2. Overview & Provenance
- **Mission**: NASA-ISRO Synthetic Aperture Radar (NISAR)
- **Product**: L2 Geocoded Polarimetric Covariance (`GCOV`)
- **Data Maturity**: `PROVISIONAL` (Preliminary product subject to reprocessing; not for final operational baseline)
- **Composite Release ID (CRID)**: `P05023`
- **Orbit Geometry**: Track 141, Frame 014, Direction Ascending (`A`)
- **Look Direction**: Left
- **Polarizations**: Dual-Pol `DHDH` (HH co-pol used for time series; HV cross-pol used for diagnostic comparisons)
- **Frequency**: Frequency A (L-band, center frequency ~1.25 GHz, wavelength ~24 cm)
- **Target AOI**: Hakaluki Haor, Sylhet Division, Bangladesh

---

## 3. Streaming Read Architecture & Bandwidth Consumption

### Streaming Mechanism
Streaming reads were executed over HTTPS to the Alaska Satellite Facility (`nisar.asf.earthdatacloud.nasa.gov`) using `fsspec` (`HTTPFileSystem`) configured with Bearer token authentication (`EARTHDATA_TOKEN`) and 4 MB block readahead caching. File handles were passed directly to `h5py.File`, leveraging HTTP Range requests (`GET` with `Range: bytes=start-end`) without downloading any full granule (~6.88 GB each).

### Bandwidth Tracking
- **Single-Window Streaming Benchmark**: 44.42 MB transferred (0.65% of the 6.88 GB granule).
- **Step 1c Metadata & Layer Inspection (3 granules: 2026-08-10, 2026-08-22, 2026-09-03)**:
  - Identification groups, metadata attributes, and Hakaluki window slices (`mask`, `inputDataExceptionMask`, `numberOfLooks`, `rtcGammaToSigmaFactor`, `HHHH`, `HVHV`).
  - Estimated bandwidth: ~25 MB per granule, total ~75 MB.
- **Cumulative New Streaming in Day 7a.1**: Estimated **~75 MB**, well below the 1.0 GB daily budget.

---

## 4. Multi-Temporal Diagnosis & Anomaly Investigation

### Table 4-1: HH Backscatter Distribution (dB) across All 10 Dates
| Date | Finite % | Mean (dB) | p1 | p5 | p25 | p50 (Median) | p75 | p95 | p99 | < -24 dB | < -22 dB | < -20 dB | < -18 dB | < -16 dB | < -14 dB | < -12 dB | < -10 dB |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 2026-06-23 | 100.0% | -15.39 | -22.99 | -21.42 | -19.17 | -17.42 | -13.97 | -2.76 | +0.72 | 0.30% | 2.88% | 15.27% | 41.74% | 65.41% | 74.93% | 78.51% | 81.26% |
| 2026-07-05 | 100.0% | -15.01 | -22.58 | -20.98 | -18.69 | -16.89 | -12.89 | -3.38 | +0.11 | 0.18% | 1.87% | 11.03% | 34.38% | 60.19% | 72.20% | 76.78% | 80.58% |
| 2026-07-17 | 100.0% | -14.90 | -22.34 | -20.72 | -18.41 | -16.67 | -13.61 | -3.24 | +0.28 | 0.13% | 1.45% | 9.04% | 30.65% | 58.74% | 73.70% | 78.08% | 81.03% |
| 2026-08-10 | 100.0% | -15.15 | -22.79 | -21.21 | -18.94 | -17.18 | -13.80 | -2.75 | +0.69 | 0.23% | 2.33% | 13.04% | 38.30% | 63.65% | 74.51% | 77.75% | 80.22% |
| **2026-08-22** | 100.0% | **+23.10** | +11.26 | +14.89 | +20.27 | **+23.31** | +26.14 | +30.48 | +33.61 | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% |
| 2026-09-03 | 100.0% | -14.72 | -22.39 | -20.79 | -18.51 | -16.70 | -12.27 | -3.07 | +0.36 | 0.14% | 1.54% | 9.65% | 31.89% | 58.24% | 71.15% | 75.46% | 78.88% |
| 2026-09-15 | 100.0% | -15.03 | -23.18 | -21.58 | -19.27 | -17.37 | -10.89 | -3.07 | +0.23 | 0.37% | 3.41% | 16.57% | 42.08% | 62.40% | 69.78% | 73.08% | 76.75% |
| 2026-09-27 | 100.0% | -14.10 | -22.72 | -21.10 | -18.68 | -16.46 | -9.21 | -2.78 | +0.36 | 0.21% | 2.16% | 11.74% | 33.29% | 53.61% | 62.74% | 67.55% | 72.71% |
| 2026-10-09 | 100.0% | -13.10 | -21.65 | -20.02 | -17.60 | -15.39 | -8.40 | -1.76 | +1.41 | 0.05% | 0.68% | 5.07% | 20.46% | 43.98% | 59.31% | 65.80% | 70.65% |
| 2026-10-21 | 100.0% | -12.66 | -21.79 | -20.08 | -17.35 | -14.26 | -7.98 | -2.36 | +0.65 | 0.06% | 0.80% | 5.31% | 18.88% | 37.77% | 51.38% | 59.71% | 67.05% |

### Table 4-2: HV Backscatter Distribution (dB) across All 10 Dates
| Date | Finite % | Mean (dB) | p1 | p5 | p25 | p50 (Median) | p75 | p95 | p99 | < -24 dB | < -22 dB | < -20 dB | < -18 dB | < -16 dB | < -14 dB | < -12 dB | < -10 dB |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 2026-06-23 | 100.0% | -21.09 | -27.91 | -26.38 | -24.22 | -22.61 | -20.19 | -10.00 | -7.13 | 28.11% | 58.77% | 75.85% | 80.79% | 83.47% | 86.50% | 90.52% | 94.99% |
| 2026-07-05 | 100.0% | -21.20 | -27.97 | -26.43 | -24.27 | -22.63 | -19.98 | -10.68 | -7.81 | 28.88% | 58.65% | 74.93% | 80.47% | 83.98% | 87.68% | 92.10% | 96.30% |
| 2026-07-17 | 100.0% | -21.32 | -27.99 | -26.47 | -24.32 | -22.72 | -20.29 | -10.81 | -7.93 | 29.67% | 60.23% | 76.32% | 81.18% | 84.42% | 88.07% | 92.43% | 96.51% |
| 2026-08-10 | 100.0% | -21.06 | -27.83 | -26.30 | -24.15 | -22.54 | -20.06 | -10.25 | -7.39 | 27.15% | 57.85% | 75.26% | 80.30% | 83.36% | 86.84% | 91.12% | 95.49% |
| **2026-08-22** | 100.0% | **+13.28** | +2.16 | +5.64 | +10.73 | **+13.51** | +16.08 | +19.98 | +22.78 | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% |
| 2026-09-03 | 100.0% | -20.93 | -27.70 | -26.16 | -23.98 | -22.34 | -19.71 | -10.49 | -7.62 | 24.78% | 54.85% | 73.62% | 79.94% | 83.46% | 87.17% | 91.61% | 95.95% |
| 2026-09-15 | 100.0% | -21.02 | -27.90 | -26.35 | -24.15 | -22.45 | -19.41 | -10.73 | -7.85 | 27.09% | 55.98% | 72.55% | 79.08% | 83.49% | 87.66% | 92.22% | 96.38% |
| 2026-09-27 | 100.0% | -20.54 | -27.64 | -26.07 | -23.79 | -21.91 | -18.17 | -10.79 | -7.92 | 22.40% | 48.92% | 66.72% | 75.66% | 82.18% | 87.41% | 92.29% | 96.50% |
| 2026-10-09 | 100.0% | -20.22 | -27.41 | -25.83 | -23.53 | -21.60 | -17.72 | -10.50 | -7.67 | 19.34% | 45.18% | 64.24% | 73.91% | 80.87% | 86.46% | 91.53% | 95.99% |
| 2026-10-21 | 100.0% | -19.85 | -27.25 | -25.62 | -23.19 | -21.03 | -17.08 | -10.76 | -7.87 | 16.27% | 39.40% | 58.69% | 70.53% | 79.71% | 86.69% | 92.17% | 96.46% |

### Table 4-3: HH 10x10 Pearson Correlation Matrix
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

### Metadata & Internal QA Mask Inspection (2026-08-10, 2026-08-22, 2026-09-03)
- `processingCenter`: `JPL` (all 3 dates)
- `productVersion`: `1.0.11`, `productSpecificationVersion`: `1.5.0`, `CRID`: `P05023` (all 3 dates)
- `processingType`: `Nominal`, `diagnosticModeFlag`: `0`, `hasInputDataException`: `0` (all 3 dates)
- `mask`: 100.0% pixels have value `1` (subswath 1, fully focused valid GCOV samples). No partially focused samples (`0`) or invalid nodata pixels (`255`).
- `inputDataExceptionMask`: 100.0% pixels have value `0` ("no anomaly"). Zero sample slips or telemetry errors flagged.
- `numberOfLooks`: identical across dates (mean $4.92$ looks, median $4.92$ looks).
- `rtcGammaToSigmaFactor`: identical across dates (mean $0.726$, median $0.728$).

### Exclusion Rule Outcome
1. **Radiometric Outlier**: $|m_d - M| = |+23.31 - (-16.685)| = 40.00\text{ dB} \gg 2.624\text{ dB}$ ($3 \times 1.4826 \times \text{MAD}$). **EXCLUDED: radiometric outlier**.
2. **Low Correlation**: $\bar{r} = 0.279 < 0.3615$ ($0.5 \times \text{median}(\bar{r})$). **EXCLUDED: low correlation**.
3. **Cause Statement**: **`Cause: NOT ESTABLISHED`**. No telemetry error flags or documented SDS anomalies account for this +38 dB offset. *Hypothesis (not tested)*: Unapplied receiver attenuation LUT or absolute calibration constant mismatch during L0B/L2 processing at JPL.

---

## 5. Threshold Statistics & Bimodality Rule Outcome

Using the 0.25 dB histogram of HH dB pooled over the 9 non-excluded dates (9,427,499 pixels):

- **Otsu Optimal Threshold**: **`-11.875 dB`**
- **Between-Class Variance ($\sigma_B^2$)**: `26.7442`
- **Total Variance ($\sigma_T^2$)**: `33.7541`
- **Inter-Class Variance Ratio ($\eta$)**: **`0.7923`** (satisfies $\eta \in [0, 1]$)
- **Moving Average Smoothing**: Window width = 5 bins ($1.25\text{ dB}$)
- **Top 2 Local Maxima**:
  - Left Peak (Water / Low Backscatter): **`-17.88 dB`** (density = `0.03220`)
  - Right Peak (Land / Rough Surfaces): **`-5.88 dB`** (density = `0.00703`)
- **Valley Position**: **`-11.62 dB`** (density = `0.00494`)
- **Valley Ratio**: `0.00494 / 0.00703 =` **`0.7027`**
- **Per-Date Otsu Thresholds**:
  - `2026-06-23`: -11.88 dB
  - `2026-07-05`: -12.12 dB
  - `2026-07-17`: -11.62 dB
  - `2026-08-10`: -11.88 dB
  - `2026-09-03`: -11.88 dB
  - `2026-09-15`: -12.38 dB
  - `2026-09-27`: -12.38 dB
  - `2026-10-09`: -11.12 dB
  - `2026-10-21`: -11.62 dB
  - Min: `-12.38 dB`, Median: `-11.88 dB`, Max: `-11.12 dB`, Spread: **`1.25 dB`**

### Pre-Declared Bimodality Rule Evaluation
1. $\eta \ge 0.50$: **TRUE** ($0.7923 \ge 0.50$)
2. $\text{valley\_ratio} \le 0.60$: **FALSE** ($0.7027 > 0.60$)
3. Per-date Otsu spread $\le 3.0\text{ dB}$: **TRUE** ($1.25\text{ dB} \le 3.0\text{ dB}$)

- **Rule Verdict**: **`threshold NOT reliably determinable`**
- **Step 4a Outcome**: **No single threshold could be justified; results are shown as a threshold grid.** All provisional change detection rasters and sensitivity exports from Day 7a were removed.

---

## 6. Threshold-Free Reference Grid Time Series (Step 3)

The time series is published in `data/nisar/hakaluki-haor/timeseries.json` (schema v2). The reported metric is **low-backscatter area (HH)** across a fixed 8-level reference grid.

| Date | Cycle | Status | Median HH | < -24 dB | < -22 dB | < -20 dB | < -18 dB | < -16 dB | < -14 dB | < -12 dB | < -10 dB |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `2026-06-23` | 023 | VALID | -17.42 dB | 0.32 km² (0.3%) | 3.02 km² (2.9%) | 16.02 km² (15.3%) | 43.77 km² (41.7%) | 68.59 km² (65.4%) | 78.57 km² (74.9%) | 82.33 km² (78.5%) | 85.21 km² (81.3%) |
| `2026-07-05` | 024 | VALID | -16.89 dB | 0.19 km² (0.2%) | 1.96 km² (1.9%) | 11.56 km² (11.0%) | 36.05 km² (34.4%) | 63.12 km² (60.2%) | 75.71 km² (72.2%) | 80.51 km² (76.8%) | 84.49 km² (80.6%) |
| `2026-07-17` | 025 | VALID | -16.67 dB | 0.14 km² (0.1%) | 1.52 km² (1.5%) | 9.48 km² (9.0%) | 32.14 km² (30.6%) | 61.59 km² (58.7%) | 77.28 km² (73.7%) | 81.87 km² (78.1%) | 84.97 km² (81.0%) |
| `2026-08-10` | 027 | VALID | -17.18 dB | 0.24 km² (0.2%) | 2.45 km² (2.3%) | 13.67 km² (13.0%) | 40.16 km² (38.3%) | 66.74 km² (63.7%) | 78.13 km² (74.5%) | 81.53 km² (77.7%) | 84.12 km² (80.2%) |
| `2026-08-22` | 028 | **EXCLUDED** | +23.31 dB | 0.00 km² (0.0%) | 0.00 km² (0.0%) | 0.00 km² (0.0%) | 0.00 km² (0.0%) | 0.00 km² (0.0%) | 0.00 km² (0.0%) | 0.00 km² (0.0%) | 0.00 km² (0.0%) |
| `2026-09-03` | 029 | VALID | -16.70 dB | 0.14 km² (0.1%) | 1.62 km² (1.5%) | 10.12 km² (9.7%) | 33.44 km² (31.9%) | 61.07 km² (58.2%) | 74.61 km² (71.2%) | 79.12 km² (75.5%) | 82.71 km² (78.9%) |
| `2026-09-15` | 030 | VALID | -17.37 dB | 0.38 km² (0.4%) | 3.57 km² (3.4%) | 17.37 km² (16.6%) | 44.13 km² (42.1%) | 65.43 km² (62.4%) | 73.17 km² (69.8%) | 76.63 km² (73.1%) | 80.48 km² (76.8%) |
| `2026-09-27` | 031 | VALID | -16.46 dB | 0.22 km² (0.2%) | 2.27 km² (2.2%) | 12.31 km² (11.7%) | 34.90 km² (33.3%) | 56.22 km² (53.6%) | 65.79 km² (62.7%) | 70.83 km² (67.5%) | 76.24 km² (72.7%) |
| `2026-10-09` | 032 | VALID | -15.39 dB | 0.06 km² (0.1%) | 0.71 km² (0.7%) | 5.32 km² (5.1%) | 21.45 km² (20.5%) | 46.12 km² (44.0%) | 62.20 km² (59.3%) | 69.00 km² (65.8%) | 74.08 km² (70.6%) |
| `2026-10-21` | 033 | VALID | -14.26 dB | 0.07 km² (0.1%) | 0.84 km² (0.8%) | 5.57 km² (5.3%) | 19.80 km² (18.9%) | 39.61 km² (37.8%) | 53.88 km² (51.4%) | 62.61 km² (59.7%) | 70.30 km² (67.1%) |

---

## 7. Window Geometry & Case Coverage

- **Window Dimensions**: 1024 x 1024 pixels at 10.0 m pixel spacing in `EPSG:32646` (WGS 84 / UTM zone 46N).
- **Window Area**: **$104.86\text{ km}^2$** ($10.24\text{ km} \times 10.24\text{ km}$).
- **Corner Coordinates (Lon/Lat)**:
  - Top-Left: `91.978685° E, 24.739963° N`
  - Top-Right: `92.079936° E, 24.740619° N`
  - Bottom-Right: `92.080615° E, 24.648149° N`
  - Bottom-Left: `91.979439° E, 24.647496° N`
- **Hakaluki Case Bounding Box**: `[west: 91.98, south: 24.58, east: 92.16, north: 24.74]`.
- **Case Bounding Box Area**: **$323.62\text{ km}^2$** (computed via WGS 84 authalic spherical integration with $R = 6371.0088\text{ km}$).
- **Window Coverage Fraction**: **`32.40%`** of the Hakaluki case bounding box ($104.86\text{ km}^2 / 323.62\text{ km}^2$).
- **Comparability Statement**: The NISAR window covers approximately one-third of the case area, focused entirely on the northwestern sector. It is **not directly comparable** with the full C-band Sentinel-1 Hakaluki case ($321.14\text{ km}^2$).

---

## 8. Limitations & Methodological Caveats

1. **PROVISIONAL Product Maturity**:
   All NISAR granules used carry data maturity `PROVISIONAL` and CRID `P05023`. Provisional products have not undergone complete global calibration or cross-validation and are subject to planned reprocessing by the NASA/JPL SDS upon operational baseline release.
2. **Single Orbital Geometry**:
   Observations are restricted to a single ascending orbit pass (Track 141, Frame 014, Direction Ascending, Look Direction Left). Scattering behavior may differ in descending passes.
3. **Polarization Scope**:
   Analysis is conducted primarily on the co-polarized `HH` channel. Cross-pol `HV` was extracted for diagnostic verification only.
4. **Window Extent vs Full Case**:
   The 1024 x 1024 window covers only 32.40% of the Hakaluki bounding box and cannot be benchmarked directly against whole-basin C-band statistics.
5. **No In-Situ Ground Truth Calibration**:
   No water level gauge, hydrological stage, or bathymetric measurements were available to calibrate backscatter thresholds to physical water depths.
6. **No Independent Water Map Validation**:
   Results have not been benchmarked against cloud-free high-resolution optical imagery (e.g. Sentinel-2 / Landsat-9) acquired coincidentally with the radar passes.
7. **Physical Backscatter Quantity**:
   The measured quantity is radar backscatter below a threshold. At L-band (wavelength ~24 cm), backscatter between $-16\text{ dB}$ and $-10\text{ dB}$ includes wet vegetation, saturated paddy fields, and mudflats in addition to open water surfaces.
8. **Pixel Spacing**:
   Pixel areas are computed from the 10.0 m projected UTM grid ($100\text{ m}^2$ per pixel = $0.0001\text{ km}^2$).
9. **Estimated Streaming Transfer**:
   Cumulative HTTP range streaming was tracked and estimated at ~75 MB for metadata and slice reads, well below the 1.0 GB limit.
10. **Unverified Hypotheses**:
   Any potential hardware or software explanation for the 2026-08-22 anomaly remains an unverified *Hypothesis (not tested)*.

---

## 9. Official Documentation Sources and Hypotheses Citations

1. **ASF NISAR User Guide (GCOV)**:
   URL: `https://nisar-docs.asf.alaska.edu/gcov/`
   Documentation of physical radar backscatter sensitivities at L-band (~24 cm wavelength):
   - Surface roughness: specular forward-scattering over smooth terrain vs diffuse backscatter over rough surfaces.
   - Dielectric constant & soil moisture: electrical permittivity changes driven by moisture saturation.
   - Canopy penetration & vegetation structure: long-wavelength penetration through foliage to interact with branches and tree trunks.
   - Polarimetric response: co-pol (HH) sensitivity to horizontal structures vs cross-pol (HV) volume scattering.

2. **NASA Space Apps Challenge Reference ("Dancing with the SARs")**:
   Potential application domains for L-band SAR observations:
   - Wetlands and floodplains monitoring.
   - Forest change and biomass disturbance tracking.
   - Agriculture and soil moisture monitoring.
   - Ground deformation and surface displacement interferometry.

3. **Data Availability and Archive**:
   - Availability overview & data gap: `https://nisar-docs.asf.alaska.edu/availability-overview/`
   - Common Metadata Repository: `https://cmr.earthdata.nasa.gov/search/collections.json`

