# External Facts: Area Picker, ASF Search, Earth Engine, Nominatim & Vercel

**Date:** 2026-11-08  
**Branch:** `feature/area-picker`  
**Status:** All external facts verified via real HTTP requests and official documentation fetches.

---

## 1. ASF Search API Real Queries & Parameters

### Official Documentation
- **API URL Endpoint:** `https://api.daac.asf.alaska.edu/services/search/param`
- **Documentation Page:** `https://docs.asf.alaska.edu/api/keywords/`
- **Key Parameters Supported:**
  - `platform`: Satellite platform (e.g., `SENTINEL-1`, `ALOS`). Dataset is also accepted.
  - `dataset`: Preferred alternative keyword (e.g., `SENTINEL-1`, `NISAR`).
  - `processingLevel`: Target processing level (`GRD_HD`, `SLC`, `RAW` for S1; `GCOV`, `GSLC` for NISAR).
  - `beamMode`: Instrument acquisition beam mode (`IW`, `EW`, `SM`).
  - `bbox`: Bounding box formatted as `west,south,east,north` in WGS84 decimal degrees.
  - `intersectsWith`: WKT geometry string (`POLYGON((...))`, `POINT(...)`).
  - `start` / `end`: Temporal range in ISO 8601 date format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`).
  - `output`: Result format (`geojson`, `json`, `csv`, `metalink`).
  - `maxResults`: Maximum number of records to return.

### Real Request 1: Sentinel-1 over Sylhet Flood Box
- **Request Parameters Used:**
  ```text
  platform: SENTINEL-1
  processingLevel: GRD_HD
  beamMode: IW
  bbox: 91.7999,24.8499,91.9501,24.9802
  start: 2022-05-01
  end: 2022-06-21
  output: geojson
  ```
- **Output Format:** GeoJSON FeatureCollection (`application/geo+json`)
- **HTTP Status:** `200 OK`
- **Result Count:** `9` features
- **CORS Header (`Access-Control-Allow-Origin`):**
  - Response carries `Access-Control-Allow-Origin: http://localhost:3000` (or `*`), allowing direct cross-origin access from web browsers.
  - Also includes `access-control-expose-headers: Content-Disposition`.
- **Verified Property Field Names in GeoJSON:**
  - Platform: `properties.platform` (e.g., `"Sentinel-1A"`)
  - Start time: `properties.startTime` (e.g., `"2022-06-18T23:47:43Z"`)
  - Flight direction: `properties.flightDirection` (e.g., `"DESCENDING"`)
  - Relative orbit / path number: `properties.pathNumber` (e.g., `77`)
  - Frame number: `properties.frameNumber` (e.g., `510`)
  - Product name / fileID: `properties.sceneName` / `properties.fileID` (e.g., `"S1A_IW_GRDH_1SDV_20220618T234743_20220618T234808_043724_05385D_E87E"`)
  - Data link: `properties.url` (e.g., `"https://datapool.asf.alaska.edu/GRD_HD/SA/S1A_IW_GRDH_1SDV_20220618T234743_20220618T234808_043724_05385D_E87E.zip"`)

### Real Request 2: NASA-ISRO NISAR over Hakaluki Haor Box
- **Request Parameters Used:**
  ```text
  dataset: NISAR
  processingLevel: GCOV
  bbox: 91.98,24.58,92.16,24.74
  start: 2026-06-17
  end: 2026-10-31
  output: geojson
  ```
- **HTTP Status:** `200 OK`
- **Result Count:** `34` features
- **CORS Header (`Access-Control-Allow-Origin`):**
  - Response carries `Access-Control-Allow-Origin: http://localhost:3000`
- **Key Observation:**
  - Captures Track 141 Frame 014 Ascending passes (`2026-06-23`, `2026-07-05`, `2026-07-17`, `2026-08-10`, `2026-08-22`, `2026-09-03`, `2026-09-15`, `2026-09-27`, `2026-10-09`), exactly matching the 10-date time series in `data/nisar/hakaluki-haor/timeseries.json`.

### Architecture Decision: Direct vs Server Route Proxy
- **CORS Status:** ASF DAAC natively supports CORS (`Access-Control-Allow-Origin: *`).
- **Decision:** Implement both direct and server route support (`app/api/asf-search/route.ts`):
  1. Server route provides rigorous parameter validation, bounding-box clamping, fixed-host enforcement, and graceful offline fallback JSON (`{ offline: true, reason }`) when offline.
  2. The UI uses the `/api/asf-search` server route by default, ensuring uniform error handling, avoiding client-side ad-blocker network blocks, and providing full offline resilience.

---

## 2. Google Earth Engine `COPERNICUS/S1_GRD` Property Names

Fetched directly from official Google Earth Engine documentation (`https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD`):

1. **Orbit Direction:**
   - **Property Name:** `orbitProperties_pass`
   - **Type:** `STRING`
   - **Allowed Values:** `'ASCENDING'` or `'DESCENDING'`
   - **Official Quote:** *"Direction of the orbit ('ASCENDING' or 'DESCENDING') for the oldest image data in the product (the start of the product)."*
2. **Relative Orbit Number:**
   - **Property Name:** `relativeOrbitNumber_start`
   - **Type:** `DOUBLE`
   - **Official Quote:** *"Relative orbit number of the oldest line within the image data."*
   - Also available: `relativeOrbitNumber_stop`.
3. **Instrument Mode:**
   - **Property Name:** `instrumentMode`
   - **Type:** `STRING`
   - **Allowed Values:** `'IW'`, `'SM'`, or `'EW'`
   - **Official Quote:** *"IW (Interferometric Wide Swath), SM (Strip Map), or EW (Extra Wide Swath)."*
4. **Polarizations:**
   - **Property Name:** `transmitterReceiverPolarisation`
   - **Type:** `STRING_LIST`
   - **Allowed Values:** `['VV']`, `['HH']`, `['VV', 'VH']`, or `['HH', 'HV']`
   - **Official Quote:** *"Transmit/Receive polarisation for the data. There is one element for each Tx/Rx combination"*

### Comparison with Existing Scripts
- `scripts/gee/export_sylhet.js` uses:
  - `instrumentMode` via `.filter(ee.Filter.eq('instrumentMode', 'IW'))`
  - `transmitterReceiverPolarisation` via `.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))`
  - References `orbitProperties_pass` and `relativeOrbitNumber_start` in documented comment placeholders.

---

## 3. OpenStreetMap Nominatim Usage Policy

Fetched directly from the official OSM Foundation policy (`https://operations.osmfoundation.org/policies/nominatim/`):

1. **Request Rate Limit:**
   - **Official Quote:** *"No heavy uses (an absolute maximum of 1 request per second)."*
2. **Identification (User-Agent / Referer):**
   - **Official Quote:** *"Provide a valid HTTP Referer or User-Agent identifying the application (stock User-Agents as set by http libraries will not do)."*
   - Application User-Agent: `"TerraPulse/1.0 (https://github.com/Ajoy12roy/dancing-with-sars)"`
3. **Auto-Complete Ban:**
   - **Official Quote:** *"Auto-complete search: This is not yet supported by Nominatim and you must not implement such a service on the client side using the API."*
   - Requirement: Search must trigger strictly on explicit user submission (`Enter` key or search button click), never on typing or keystroke change.
4. **Attribution:**
   - **Official Quote:** *"Clearly display attribution as suitable for your medium. Data is provided under the ODbL license"*
   - Required Attribution: OpenStreetMap contributors under ODbL 1.0.

---

## 4. Vercel Hosting Limitations

Quoted directly from `docs/DEPLOYMENT.md` and official Vercel documentation (`https://vercel.com/docs/functions/limitations`):

1. **Request Body Size Limit:**
   - **Official Quote:** *"The maximum payload size for the request body or the response body of a Vercel Function is 4.5 MB. If a Vercel Function receives a payload in excess of the limit it will return an error 413: FUNCTION_PAYLOAD_TOO_LARGE."*
2. **Serverless Function Maximum Duration:**
   - **Official Quote:** *"With Fluid compute enabled, Vercel Functions have the following defaults and maximum limits: Hobby: 300s default and maximum."*
   - Route handlers set `export const maxDuration = 30;` or `15;` (well within the 300 s ceiling).
3. **Function Bundle Size Limit:**
   - **Official Quote:** *"For Vercel Functions, the maximum uncompressed size is 250 MB including layers which are automatically used depending on runtimes."*
4. **Read-Only Filesystem & Python Runtime:**
   - Vercel functions provide a read-only filesystem (except `/tmp`) and lack GDAL, Rasterio, and Python SAR processing environments.
   - Consequence: All raw GeoTIFF upload processing streams directly to the separate Python container (`NEXT_PUBLIC_PROCESSING_API_URL`), protecting Vercel memory and duration boundaries.
