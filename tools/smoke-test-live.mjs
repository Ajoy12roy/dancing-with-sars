import http from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

console.log('Starting production server smoke test on port 3009...');

const proc = spawn('npx', ['next', 'start', '-p', '3009'], {
  cwd: process.cwd(),
  shell: true,
  stdio: 'inherit',
});

function cleanup() {
  console.log('Shutting down server process on port 3009...');
  proc.kill('SIGTERM');
  setTimeout(() => {
    try {
      proc.kill('SIGKILL');
    } catch {}
  }, 1000);
}

process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} failed to start within ${timeoutMs}ms`);
}

async function runTests() {
  try {
    await waitForServer('http://localhost:3009');
    console.log('Server is responding on port 3009.');

    // 1. POST /api/live-analyze with invalid input returns 400 with formal message
    console.log('Testing POST /api/live-analyze with invalid box...');
    const postRes = await fetch('http://localhost:3009/api/live-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'localhost:3009',
      },
      body: JSON.stringify({
        box: [91.800, 24.850, 91.805, 24.855], // side < 2km
        beforeWindow: { start: '2022-05-01', end: '2022-05-15' },
        afterWindow: { start: '2022-06-18', end: '2022-06-25' },
        mode: 'flood',
      }),
    });
    assert.equal(postRes.status, 400, 'Invalid input should return 400');
    const postJson = await postRes.json();
    assert.match(postJson.error, /Area side length must be at least/, 'Must return formal error message');
    console.log('✓ Invalid input returns 400 with formal message:', postJson.error);

    // 2. Request with non-local headers without configured external service returns 503
    console.log('Testing non-local host header probe block...');
    const nonLocalRes = await fetch('http://localhost:3009/api/live-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'dancing-with-sars.vercel.app',
        'X-Forwarded-Host': 'dancing-with-sars.vercel.app',
      },
      body: JSON.stringify({
        box: [91.8, 24.85, 91.95, 24.98],
        beforeWindow: { start: '2022-05-01', end: '2022-05-15' },
        afterWindow: { start: '2022-06-18', end: '2022-06-25' },
        mode: 'flood',
      }),
    });
    assert.equal(nonLocalRes.status, 503, 'Non-local request without external service should return 503');
    const nonLocalJson = await nonLocalRes.json();
    assert.match(nonLocalJson.error, /Live area analysis requires a connected backend service/, 'Must return 503 notice');
    console.log('✓ Non-local request returns 503 without firing requests:', nonLocalJson.error);

    // 3. /explore returns HTTP 200 with exactly one <h1>
    console.log('Testing /explore route and <h1> count...');
    const exploreRes = await fetch('http://localhost:3009/explore');
    assert.equal(exploreRes.status, 200, '/explore must return HTTP 200');
    const html = await exploreRes.text();
    const h1Matches = html.match(/<h1\b[^>]*>/gi) || [];
    assert.equal(h1Matches.length, 1, `/explore must contain exactly ONE <h1> tag, found ${h1Matches.length}`);
    console.log(`✓ /explore returned 200 with exactly ${h1Matches.length} <h1> tag.`);

    console.log('\nAll smoke test checks passed successfully!');
  } finally {
    cleanup();
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Smoke test failure:', err);
    cleanup();
    process.exit(1);
  });
