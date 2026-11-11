// tools/smoke-test-server.mjs
// Production smoke test running against a production Next.js server instance.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = 62278;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function fetchUrl(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${urlPath}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetchUrl('/');
      if (res.status === 200) return true;
    } catch {
      // Server not ready yet
    }
    await sleep(1000);
  }
  return false;
}

function countH1Tags(html) {
  const matches = html.match(/<h1[\s>]/gi);
  return matches ? matches.length : 0;
}

async function runSmokeTest() {
  console.log(`Starting Next.js production server on port ${PORT}...`);
  const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');
  const server = spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
    },
  });

  server.stdout.on('data', (d) => {
    console.log(`[next stdout]: ${d}`);
  });
  server.stderr.on('data', (d) => {
    console.error(`[next stderr]: ${d}`);
  });

  const cleanup = () => {
    console.log('Stopping production server...');
    try {
      server.kill('SIGTERM');
    } catch {
      // ignore
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  try {
    const ready = await waitForServer();
    if (!ready) {
      throw new Error('Production server failed to become ready within 30 seconds.');
    }
    console.log('✓ Server is ready and accepting requests.\n');

    // 1. Static HTML Pages Check
    const routes = [
      '/',
      '/explore',
      '/how-it-works',
      '/data-sources',
      '/terms',
      '/privacy',
      '/about',
    ];

    console.log('=== HTML Routes Verification (Status 200 & Exactly One <h1>) ===');
    console.log('| Route | HTTP Status | <h1> Count | Verification |');
    console.log('| :--- | :---: | :---: | :---: |');

    for (const r of routes) {
      const res = await fetchUrl(r);
      const h1Count = countH1Tags(res.body);
      const pass = res.status === 200 && h1Count === 1;
      console.log(`| \`${r}\` | ${res.status} | ${h1Count} | ${pass ? 'PASS' : 'FAIL'} |`);
      if (!pass) {
        throw new Error(`Route ${r} failed verification: status=${res.status}, h1Count=${h1Count}`);
      }
    }

    // 2. API Endpoints Check
    console.log('\n=== API Endpoints Verification (/api/asf-search) ===');
    // Valid Sylhet request
    const validQuery = '/api/asf-search?west=91.8&south=24.85&east=91.95&north=24.98&beforeStart=2022-05-01&beforeEnd=2022-05-25&afterStart=2022-06-18&afterEnd=2022-06-22&kind=s1';
    const validRes = await fetchUrl(validQuery);
    console.log(`Valid Sylhet Query: status=${validRes.status} (${validRes.status === 200 ? 'PASS' : 'FAIL'})`);
    if (validRes.status !== 200) {
      throw new Error(`Expected /api/asf-search to return 200 for valid request, got ${validRes.status}`);
    }

    // Invalid parameters request (missing coordinates)
    const invalidQuery = '/api/asf-search?west=invalid&south=24.85';
    const invalidRes = await fetchUrl(invalidQuery);
    console.log(`Invalid Query (missing params): status=${invalidRes.status} (${invalidRes.status === 400 ? 'PASS' : 'FAIL'})`);
    if (invalidRes.status !== 400) {
      throw new Error(`Expected /api/asf-search to return 400 for invalid request, got ${invalidRes.status}`);
    }

    console.log('\n✓ All smoke test checks passed successfully!');
  } finally {
    cleanup();
  }
}

runSmokeTest().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});

