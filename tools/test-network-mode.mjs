import assert from 'node:assert/strict';
import { effectiveOffline, statusLabel } from '../lib/network-mode.ts';

console.log('Running Network Mode (lib/network-mode.ts) Test Suite...');

// Case 1: Online default
assert.equal(effectiveOffline(false, true), false, 'effectiveOffline(false, true) should be false');
assert.equal(statusLabel(false, true), 'Online', 'statusLabel(false, true) should be "Online"');

// Case 2: Manual offline with connection available
assert.equal(effectiveOffline(true, true), true, 'effectiveOffline(true, true) should be true');
assert.equal(statusLabel(true, true), 'Offline (manual)', 'statusLabel(true, true) should be "Offline (manual)"');

// Case 3: Offline due to lost browser connection (manual off)
assert.equal(effectiveOffline(false, false), true, 'effectiveOffline(false, false) should be true');
assert.equal(statusLabel(false, false), 'Offline (no connection)', 'statusLabel(false, false) should be "Offline (no connection)"');

// Case 4: Both manual offline and lost browser connection
assert.equal(effectiveOffline(true, false), true, 'effectiveOffline(true, false) should be true');
assert.equal(statusLabel(true, false), 'Offline (no connection)', 'statusLabel(true, false) should be "Offline (no connection)"');

console.log('✓ All 4 truth-table combinations verified for effectiveOffline and statusLabel.');
console.log('All Network Mode tests passed successfully!');

