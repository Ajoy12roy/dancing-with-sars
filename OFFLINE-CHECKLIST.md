# Offline Verification Checklist

This project is built to function fully on a local network for offline demonstrations (e.g., during the NASA Space Apps judging, if internet is unreliable).

## Network Call Audit

| Feature | External Network Request? | Offline Fallback Mechanism | Status |
| :--- | :--- | :--- | :--- |
| **Fonts** | No (Locally bundled) | We use `next/font/google` for Source Serif 4, Public Sans, and IBM Plex Mono. Next.js downloads these at build time and serves them locally. They will never silently fallback or break the visual identity when offline. | ✅ Verified |
| **Map Tiles (Leaflet)** | Yes (OSM fallback) | The `ChangeMap` component attempts to load tiles from `/public/tiles/<aoiId>/...`. If missing, it falls back to live OSM. When offline, if the local tiles were cached via `node scripts/download_tiles.js`, it works flawlessly. If offline and missing, it fails gracefully. | ✅ Verified |
| **AI Insight Generation** | Yes (Gemini API) | The `/api/ai-insight` endpoint and `AIInsightPanel.tsx` contain a robust `try/catch` fallback. If the network is disabled, the fetch fails gracefully, and a static, deterministic explanation is rendered instead, tagged with an *offline mode* indicator. | ✅ Verified |
| **SAR Imagery / Analytics** | No (Locally served) | The `/api/change-detection` and `/api/images` endpoints serve precomputed statistics and PNG/WebP images strictly from the local file system. No raw GeoTIFF processing happens on the client, and no external buckets are queried during the demo. | ✅ Verified |

## Running the App Offline

To manually verify the offline capabilities on `localhost`:

1. Download the demo AOI map tiles to your local cache:
   ```bash
   node scripts/download_tiles.js
   ```
2. Build the production application locally:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm run start
   ```
3. Disconnect your computer from Wi-Fi / Ethernet (or simulate offline mode in your browser's network tab).
4. Navigate to `http://localhost:3000`.
5. Verify that:
   - The fonts load correctly and no fallback fonts appear.
   - The `/explore` page loads analytics correctly.
   - The `ChangeMap` displays the offline mode indicator instead of broken map tiles.
   - The `AIInsightPanel` successfully displays the static fallback explanation marked with *offline mode*.
