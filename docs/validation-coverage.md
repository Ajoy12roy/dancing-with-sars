# NASA OPERA DSWx-S1 Coverage Check

Query of NASA Common Metadata Repository (CMR) for `OPERA_L3_DSWX-S1_V1` across the 10 ready demo cases.

| Case | Post-Event Range (`afterRange`) | OPERA Granules Found | Note |
| :--- | :--- | :---: | :--- |
| `sylhet` | 2022-06-20 to 2022-06-21 | 0 | CMR returned 0 granules for this bounding box and date range |
| `jamuna` | 2024-02-01 to 2024-02-28 | 0 | CMR returned 0 granules for this bounding box and date range |
| `amazon` | 2023-01-01 to 2023-01-15 | 0 | CMR returned 0 granules for this bounding box and date range |
| `tanguar` | 2023-08-01 to 2023-08-31 | 0 | CMR returned 0 granules for this bounding box and date range |
| `cox-bazar-kutupalong-2017` | 2018-01-01 to 2018-03-15 | 0 | CMR returned 0 granules for this bounding box and date range |
| `feni-2024` | 2024-08-21 to 2024-08-27 | 2 | CMR returned 2 granules for this bounding box and date range |
| `hakaluki-haor` | 2023-08-01 to 2023-08-31 | 0 | CMR returned 0 granules for this bounding box and date range |
| `padma-naria` | 2024-01-15 to 2024-03-15 | 0 | CMR returned 0 granules for this bounding box and date range |
| `rio-grande-do-sul-2024` | 2024-05-08 to 2024-05-14 (also tested padded 2024-05-01 to 2024-05-20) | 0 | CMR returned 0 granules for case range, and 0 granules for padded range |
| `sindh-pakistan-2022` | 2022-08-30 to 2022-09-08 | 0 | CMR returned 0 granules for this bounding box and date range |

## Feni Granule Details (OPERA_L3_DSWX-S1_V1)

The following granules were returned by the NASA CMR API for `feni-2024`:

| Granule ID | Title | Acquisition Time (`time_start`) |
| :--- | :--- | :--- |
| `G3848949622-POCLOUD` | `OPERA_L3_DSWx-S1_T46QCL_20240821T120455Z_20251107T032635Z_S1A_30_v1.0` | 2024-08-21T12:04:38.000Z |
| `G3848484181-POCLOUD` | `OPERA_L3_DSWx-S1_T46QCL_20240823T235707Z_20251106T222052Z_S1A_30_v1.0` | 2024-08-23T23:56:29.000Z |
