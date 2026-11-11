# Terra Pulse (dancing-with-sars) Deployment Guide

This document outlines the deployment configuration, environment variables, hosting architecture, and known platform limitations for deploying Terra Pulse to Vercel and connecting it to the companion Python processing service.

---

## 1. Architecture Overview

- **Frontend & App Server (Vercel)**:
  - Framework: Next.js 16.3.6 (App Router), React 19.2.8, Node.js 20+ / 22+.
  - Build Engine: Webpack production build (`next build --webpack`), specified via `vercel.json`.
  - Roles: Serves UI pages, static assets, precomputed SAR change maps, sensitivity bounds, and AI insights via route handlers.
- **Processing Service (Container / External)**:
  - Framework: FastAPI + Rasterio + GDAL + NumPy/SciPy in `python-service/`.
  - Deployment: Runs as a container (Dockerfile provided in `python-service/Dockerfile`) on platforms such as Render, Google Cloud Run, or AWS ECS.
  - Roles: Computes live change detection on custom uploaded GeoTIFF pairs when live upload processing is desired.

---

## 2. Environment Variables

Set these names in Vercel: **Project Settings -> Environment Variables (Production and Preview)**; take the values from your own `.env.local`; never commit them.

| Variable Name | Scope | Required / Optional | Behavior When Missing |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server-only | Optional | Falls back to `GOOGLE_API_KEY`. If both are missing, `/api/ai-insight` returns a deterministic offline fallback analysis with `cached: false, fallback: true` and full reliability notes. |
| `GOOGLE_API_KEY` | Server-only | Optional | Secondary fallback for `GEMINI_API_KEY`. |
| `NEXT_PUBLIC_APP_URL` | Client-exposed | Optional | Falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, then `http://localhost:3000`. Used for metadata base URL resolution. |
| `NEXT_PUBLIC_PROCESSING_API_URL` | Client-exposed | Optional | If omitted, live processing is disabled, and the client displays a clear notice: *"Live processing is not configured; precomputed areas still work."* All precomputed cases continue to work completely offline. |
| `UPLOAD_ENABLED` | Server-only | Optional | Defaults to `"false"` (or unset). On Vercel, requests to `POST /api/analyze-upload` return HTTP 503 ("Local-only route. Live processing uses the separate Python API."). |
| `PYTHON_BIN` | Server-only | Optional | Path to local Python executable. Used only in local CLI analysis; not needed on Vercel. |
| `EARTHDATA_TOKEN` | Server / CLI | Optional | NASA Earthdata Cloud bearer token. Only needed by offline scripts in `scripts/nisar/` or `python-service/` for streaming/downloading NISAR L-band granules. Never used by Next.js client or runtime routes. |

---

## 3. Build Configuration (`vercel.json`)

Terra Pulse includes a dedicated `vercel.json` configured as follows:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "next build --webpack"
}
```

### Why Webpack (`next build --webpack`)?
Every verification and testing pass throughout this project has utilized the webpack production build. The default Next.js 16 Turbopack production build encountered crashes in local Windows verification environments. To guarantee deterministic builds across development and deployment environments without altering `package.json` scripts, `buildCommand` explicitly invokes `next build --webpack`.

---

## 4. Runtime File Tracing (`next.config.ts`)

Server routes (`/api/change-detection`, `/api/ai-insight`, `/api/images`, and the `/explore` page) read precomputed case study data, change maps, and sensitivity ranges from:
- `data/precomputed/**/*`
- `data/case-studies/**/*`
- `data/sensitivity/**/*`

To ensure Next.js file tracing bundles these required assets into Vercel Serverless Function deployment packages, `next.config.ts` includes explicit `outputFileTracingIncludes` directives for `/api/**/*`, individual API endpoints, and `/**/*`.

---

## 5. Known Limitations on Vercel

The following limits are quoted directly from official Vercel documentation ([https://vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations)):

1. **Request Body Size Limit**:
   > *"The maximum payload size for the request body or the response body of a Vercel Function is 4.5 MB. If a Vercel Function receives a payload in excess of the limit it will return an error 413: FUNCTION_PAYLOAD_TOO_LARGE."*
2. **Function Bundle Size Limit**:
   > *"For Vercel Functions, the maximum uncompressed size is 250 MB including layers which are automatically used depending on runtimes."*
3. **Maximum Duration (Hobby Plan)**:
   > *"With Fluid compute enabled, Vercel Functions have the following defaults and maximum limits: Hobby: 300s default and maximum. Pro and Enterprise: 300s default, 800s maximum, and 1800s extended maximum Beta."*
4. **Read-Only Filesystem & Python Runtime**:
   > Vercel Serverless Function environments provide a read-only filesystem (except `/tmp`) and do not provide a native Python runtime or geospatial libraries (GDAL, Rasterio, PROJ) required for SAR processing.

### Consequence for Uploads
SAR GeoTIFF images are routinely tens to hundreds of megabytes (exceeding Vercel's 4.5 MB request body limit by orders of magnitude). Therefore, the application architecture does **not** route upload payloads through Vercel Serverless Functions. Instead:
- When a user uploads custom GeoTIFF files, the browser client streams the `FormData` directly to `NEXT_PUBLIC_PROCESSING_API_URL` (the hosted Python container on Render / Cloud Run).
- If `NEXT_PUBLIC_PROCESSING_API_URL` is not configured, the UI cleanly informs the user that live processing is offline, while all precomputed cases (Sylhet, Amazon, Tanguar Haor, etc.) and AI insights remain fully operational.

---

## 6. Route Durations (`maxDuration`)

Route handlers that interface with external APIs specify route segment duration configuration:
- `app/api/ai-insight/route.ts`: `export const maxDuration = 30;` (Gemini API calls with strict 12-second timeout, well within the Vercel Hobby plan limit of 300 seconds).
- `app/api/analyze-upload/route.ts`: `export const maxDuration = 30;` (Local-only upload route, disabled on Vercel via HTTP 503).

---

## 7. Companion Processing Service Connectivity & CORS Setup

If uploaded GeoTIFF analysis displays `"Unable to connect to the processing server"` or `"The processing service is not reachable"`, verify the following platform configurations:

1. **Vercel Frontend Configuration (`NEXT_PUBLIC_PROCESSING_API_URL`)**:
   - In Vercel Project Settings -> **Environment Variables**, ensure `NEXT_PUBLIC_PROCESSING_API_URL` is set for **both Production and Preview** environments.
   - The value must be the public HTTPS URL of the hosted container (e.g. on Render, Cloud Run, or AWS), with no trailing slash and without pointing to `localhost`.
   - Re-deploy the frontend after modifying `NEXT_PUBLIC_*` variables so that the client-side bundle receives the updated value.

2. **Container Service CORS Configuration (`ALLOWED_ORIGINS`)**:
   - The FastAPI backend in `python-service/api.py` restricts cross-origin browser requests via `CORSMiddleware` using `ALLOWED_ORIGINS`.
   - On the container hosting provider (Render, Cloud Run, etc.), set the `ALLOWED_ORIGINS` environment variable to include the deployed frontend origin:
     - Production origin: `https://dancing-with-sars.vercel.app`
     - Local development: `http://localhost:3000`
     - Wildcard / Preview deployments: comma-separated list of origins, or adjust `ALLOWED_ORIGINS` to match your Vercel preview domains.
   - If `ALLOWED_ORIGINS` is missing on the container, the backend defaults strictly to `http://localhost:3000`, causing browsers to block requests with a CORS preflight error (`Failed to fetch`).

3. **Free-Tier Cold-Start Wake-Up Delay**:
   - Hosting providers such as Render spin down inactive free-tier containers after 15 minutes.
   - Container spin-up can require 50 to 90 seconds.
   - The client status check automatically polls with exponential backoff for up to 90 seconds, displaying `"The processing service is starting. This can take up to one minute."` before showing an offline notice and a Retry button.

