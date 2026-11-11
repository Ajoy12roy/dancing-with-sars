import assert from 'node:assert/strict';
import {
  shouldProbeService,
  isLocalHostname,
  isLoopbackHost,
} from '../lib/service-probe.ts';

console.log('Running Service Probe (lib/service-probe.ts) Test Suite...');

// 1. isLocalHostname
assert.equal(isLocalHostname('localhost'), true, 'localhost is local');
assert.equal(isLocalHostname('127.0.0.1'), true, '127.0.0.1 is local');
assert.equal(isLocalHostname('::1'), true, '::1 is local');
assert.equal(isLocalHostname('localhost:3000'), true, 'localhost with port is local');
assert.equal(isLocalHostname('terra-pulse.vercel.app'), false, 'Vercel domain is not local');
assert.equal(isLocalHostname('example.com'), false, 'example.com is not local');
assert.equal(isLocalHostname(''), false, 'empty is not local');

// 2. isLoopbackHost
assert.equal(isLoopbackHost('http://localhost:8000'), true, 'http://localhost:8000 is loopback');
assert.equal(isLoopbackHost('http://127.0.0.1:8000'), true, 'http://127.0.0.1:8000 is loopback');
assert.equal(isLoopbackHost('http://[::1]:8000'), true, 'http://[::1]:8000 is loopback');
assert.equal(isLoopbackHost('localhost'), true, 'localhost is loopback');
assert.equal(isLoopbackHost('127.0.0.1'), true, '127.0.0.1 is loopback');
assert.equal(isLoopbackHost('https://api.terrapulse.org'), false, 'public https url is not loopback');

// 3. shouldProbeService: local environments
assert.equal(
  shouldProbeService('localhost', 'http://localhost:8000'),
  true,
  'Local dev with local backend should probe'
);
assert.equal(
  shouldProbeService('127.0.0.1', 'http://localhost:8000'),
  true,
  '127.0.0.1 with local backend should probe'
);
assert.equal(
  shouldProbeService('::1', 'http://127.0.0.1:8000'),
  true,
  'IPv6 loopback with local backend should probe'
);
assert.equal(
  shouldProbeService('localhost', ''),
  false,
  'Empty API URL on localhost should NOT probe'
);
assert.equal(
  shouldProbeService('localhost', undefined),
  false,
  'Undefined API URL on localhost should NOT probe'
);

// 4. shouldProbeService: remote deployed environments (no console spam)
assert.equal(
  shouldProbeService('terra-pulse.vercel.app', 'http://localhost:8000'),
  false,
  'Vercel deployment with loopback API URL must NOT probe (prevents ERR_CONNECTION_REFUSED spam)'
);
assert.equal(
  shouldProbeService('terra-pulse.vercel.app', 'http://127.0.0.1:8000'),
  false,
  'Vercel deployment with 127.0.0.1 API URL must NOT probe'
);
assert.equal(
  shouldProbeService('terra-pulse.vercel.app', ''),
  false,
  'Vercel deployment with empty API URL must NOT probe'
);
assert.equal(
  shouldProbeService('terra-pulse.vercel.app', undefined),
  false,
  'Vercel deployment with undefined API URL must NOT probe'
);
assert.equal(
  shouldProbeService('terra-pulse.vercel.app', 'https://api.terrapulse.org'),
  true,
  'Vercel deployment with remote cloud backend should probe'
);

console.log('✓ All shouldProbeService, isLocalHostname, and isLoopbackHost checks passed.');
console.log('All Service Probe tests passed successfully!');
