// ========================================================================
// Font Download Script for Self-Hosting (Offline Support)
// Downloads Source Serif 4, Public Sans, and IBM Plex Mono woff2 files.
// Usage: node scripts/download-fonts.mjs
// ========================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontsDir = path.join(__dirname, '..', 'app', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  {
    file: 'SourceSerif4-Variable.woff2',
    url: 'https://fonts.gstatic.com/s/sourceserif4/v15/vEFI2_tTDB4M7-auWDN0ahZJW1gV8tenXg.woff2',
  },
  {
    file: 'SourceSerif4-Italic-Variable.woff2',
    url: 'https://fonts.gstatic.com/s/sourceserif4/v15/vEFK2_tTDB4M7-auWDN0ahZJW1gewtu_Wo7H.woff2',
  },
  {
    file: 'PublicSans-Variable.woff2',
    url: 'https://fonts.gstatic.com/s/publicsans/v21/ijwRs572Xtc6ZYQws9YVwnNIfJ7Cww.woff2',
  },
  {
    file: 'PublicSans-Italic-Variable.woff2',
    url: 'https://fonts.gstatic.com/s/publicsans/v21/ijwTs572Xtc6ZYQws9YVwnNDTJLax9k0.woff2',
  },
  {
    file: 'IBMPlexMono-Regular.woff2',
    url: 'https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n1iEq129k.woff2',
  },
  {
    file: 'IBMPlexMono-Medium.woff2',
    url: 'https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3twJwl5FgtIU.woff2',
  },
  {
    file: 'IBMPlexMono-SemiBold.woff2',
    url: 'https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3vAOwl5FgtIU.woff2',
  },
  {
    file: 'IBMPlexMono-Bold.woff2',
    url: 'https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3pQPwl5FgtIU.woff2',
  },
  {
    file: 'IBMPlexMono-Italic.woff2',
    url: 'https://fonts.gstatic.com/s/ibmplexmono/v20/-F6pfjptAgt5VM-kVkqdyU8n1ioa23dgv-s.woff2',
  },
];

async function downloadAll() {
  for (const font of fonts) {
    const dest = path.join(fontsDir, font.file);
    console.log(`Downloading ${font.file}...`);
    const res = await fetch(font.url);
    if (!res.ok) {
      throw new Error(`Failed to download ${font.file}: HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`Saved ${font.file} (${buf.length} bytes)`);
  }
  console.log('All fonts downloaded and self-hosted successfully in app/fonts/.');
}

downloadAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
