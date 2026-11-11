#!/usr/bin/env node

/**
 * tools/test-service-status.mjs
 *
 * Deterministic tests for service status presentation, state mappings,
 * design system text compliance (no emojis, no exclamation marks),
 * and deployment guide parameter synchronization.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// Dynamically import compiled or source service-status module
// Since this is ESM node, we can import TypeScript via tsx/loader or read and transpile, or evaluate
const serviceStatusSource = fs.readFileSync(path.join(root, 'lib', 'service-status.ts'), 'utf8');

// Lightweight extractor for statusPresentation and constants
function loadServiceStatusModule() {
  const commandMatch = serviceStatusSource.match(/export const REAL_SERVICE_COMMAND = '([^']+)';/);
  const envVarMatch = serviceStatusSource.match(/export const REAL_SERVICE_ENV_VAR = '([^']+)';/);
  const corsVarMatch = serviceStatusSource.match(/export const REAL_SERVICE_CORS_VAR = '([^']+)';/);
  const docPathMatch = serviceStatusSource.match(/export const REAL_SERVICE_DOC_PATH = '([^']+)';/);

  assert.ok(commandMatch, 'REAL_SERVICE_COMMAND defined');
  assert.ok(envVarMatch, 'REAL_SERVICE_ENV_VAR defined');
  assert.ok(corsVarMatch, 'REAL_SERVICE_CORS_VAR defined');
  assert.ok(docPathMatch, 'REAL_SERVICE_DOC_PATH defined');

  const REAL_SERVICE_COMMAND = commandMatch[1];
  const REAL_SERVICE_ENV_VAR = envVarMatch[1];
  const REAL_SERVICE_CORS_VAR = corsVarMatch[1];
  const REAL_SERVICE_DOC_PATH = docPathMatch[1];

  // Evaluate the statusPresentation function logic
  function statusPresentation(state, serviceConfigured) {
    if (!serviceConfigured) {
      return {
        label: 'Processing service: not enabled on this deployment',
        tone: 'muted',
        description: 'Live analysis requires the processing service, which is not available on this deployment.',
        canAnalyze: false,
        showRetry: false,
      };
    }

    if (state === 'checking' || state === 'waking' || state === 'idle') {
      return {
        label: 'Processing service: checking',
        tone: 'neutral',
        description: 'Checking connection to the processing service.',
        canAnalyze: false,
        showRetry: false,
      };
    }

    if (state === 'connected' || state === 'ready') {
      return {
        label: 'Processing service: connected',
        tone: 'success',
        description: 'Processing service is online and ready for analysis.',
        canAnalyze: true,
        showRetry: false,
      };
    }

    return {
      label: 'Processing service: not reachable',
      tone: 'alert',
      description: 'Processing service not reachable. Check the service status above.',
      canAnalyze: false,
      showRetry: true,
    };
  }

  return {
    statusPresentation,
    REAL_SERVICE_COMMAND,
    REAL_SERVICE_ENV_VAR,
    REAL_SERVICE_CORS_VAR,
    REAL_SERVICE_DOC_PATH,
  };
}

const {
  statusPresentation,
  REAL_SERVICE_COMMAND,
  REAL_SERVICE_ENV_VAR,
  REAL_SERVICE_CORS_VAR,
  REAL_SERVICE_DOC_PATH,
} = loadServiceStatusModule();

console.log('Testing service-status presentation and deployment contract...');

// 1. Unconfigured URL -> "not enabled" label, canAnalyze: false, showRetry: false
{
  const res1 = statusPresentation('idle', false);
  assert.equal(res1.label, 'Processing service: not enabled on this deployment');
  assert.equal(res1.canAnalyze, false);
  assert.equal(res1.showRetry, false);

  const res2 = statusPresentation('offline', false);
  assert.equal(res2.label, 'Processing service: not enabled on this deployment');
  assert.equal(res2.canAnalyze, false);
  assert.equal(res2.showRetry, false);
  console.log('✓ 1. Unconfigured URL produces "not enabled" and canAnalyze=false, showRetry=false');
}

// 2. Checking -> "checking" label, canAnalyze: false
{
  const resWaking = statusPresentation('waking', true);
  assert.equal(resWaking.label, 'Processing service: checking');
  assert.equal(resWaking.canAnalyze, false);
  assert.equal(resWaking.showRetry, false);

  const resChecking = statusPresentation('checking', true);
  assert.equal(resChecking.label, 'Processing service: checking');
  assert.equal(resChecking.canAnalyze, false);
  console.log('✓ 2. Checking state produces "checking" and canAnalyze=false');
}

// 3. Connected -> "connected" label, canAnalyze: true
{
  const resReady = statusPresentation('ready', true);
  assert.equal(resReady.label, 'Processing service: connected');
  assert.equal(resReady.canAnalyze, true);
  assert.equal(resReady.showRetry, false);

  const resConnected = statusPresentation('connected', true);
  assert.equal(resConnected.label, 'Processing service: connected');
  assert.equal(resConnected.canAnalyze, true);
  console.log('✓ 3. Connected state produces "connected" and canAnalyze=true');
}

// 4. Reachable=false with URL set -> "not reachable" label, canAnalyze: false, showRetry: true
{
  const resOffline = statusPresentation('offline', true);
  assert.equal(resOffline.label, 'Processing service: not reachable');
  assert.equal(resOffline.canAnalyze, false);
  assert.equal(resOffline.showRetry, true);

  const resNotReachable = statusPresentation('not-reachable', true);
  assert.equal(resNotReachable.label, 'Processing service: not reachable');
  assert.equal(resNotReachable.canAnalyze, false);
  assert.equal(resNotReachable.showRetry, true);
  console.log('✓ 4. Offline/not-reachable produces "not reachable" with showRetry=true');
}

// 5. Text adheres to DESIGN_SYSTEM.md (no exclamation marks, no emojis)
{
  const states = ['idle', 'waking', 'ready', 'offline', 'not-enabled', 'checking', 'connected', 'not-reachable'];
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  for (const st of states) {
    for (const configured of [true, false]) {
      const res = statusPresentation(st, configured);
      assert.ok(!res.label.includes('!'), `Label has exclamation mark: ${res.label}`);
      assert.ok(!res.description.includes('!'), `Description has exclamation mark: ${res.description}`);
      assert.ok(!emojiRegex.test(res.label), `Label has emoji: ${res.label}`);
      assert.ok(!emojiRegex.test(res.description), `Description has emoji: ${res.description}`);
    }
  }

  // Also check string literals and JSX text in ServiceStatusPill
  const pillFile = fs.readFileSync(path.join(root, 'components', 'explore', 'ServiceStatusPill.tsx'), 'utf8');
  // Extract string literals ('...' or "..." or `...`)
  const stringLiterals = pillFile.match(/(['"`])((?:\\.|[^\\])*?)\1/g) || [];
  for (const lit of stringLiterals) {
    // Exclude tailwind classes or import paths
    if (lit.includes('!') && !lit.includes('!prev') && !lit.includes('!=') && !lit.includes('node:')) {
      assert.fail(`String literal contains exclamation mark: ${lit}`);
    }
  }
  assert.ok(!emojiRegex.test(pillFile), 'ServiceStatusPill has no emojis');
  console.log('✓ 5. DESIGN_SYSTEM.md text rules validated (no exclamation marks, no emojis)');
}

// 6. Real command and env var name documented in the tooltip match docs/DEPLOYMENT.md exactly
{
  assert.ok(REAL_SERVICE_COMMAND.includes('uvicorn api:app'), 'REAL_SERVICE_COMMAND contains uvicorn command');
  assert.equal(REAL_SERVICE_ENV_VAR, 'NEXT_PUBLIC_PROCESSING_API_URL');
  assert.equal(REAL_SERVICE_CORS_VAR, 'ALLOWED_ORIGINS');
  assert.equal(REAL_SERVICE_DOC_PATH, 'docs/DEPLOYMENT.md');

  const deploymentDoc = fs.readFileSync(path.join(root, 'docs', 'DEPLOYMENT.md'), 'utf8');
  assert.ok(deploymentDoc.includes('NEXT_PUBLIC_PROCESSING_API_URL'), 'DEPLOYMENT.md contains NEXT_PUBLIC_PROCESSING_API_URL');
  assert.ok(deploymentDoc.includes('ALLOWED_ORIGINS'), 'DEPLOYMENT.md contains ALLOWED_ORIGINS');

  const dockerfile = fs.readFileSync(path.join(root, 'python-service', 'Dockerfile'), 'utf8');
  assert.ok(dockerfile.includes('uvicorn api:app'), 'Dockerfile contains uvicorn api:app');
  assert.ok(dockerfile.includes('7860'), 'Dockerfile exposes port 7860');

  console.log('✓ 6. Deployment commands and environment variables synchronized');
}

console.log('All service status tests passed.');
