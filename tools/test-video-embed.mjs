import assert from 'node:assert/strict';
import {
  buildYouTubeEmbedUrl,
  buildYouTubePlayerVars,
  decideScrollPlaybackAction,
  handlePlayerStateChange,
} from '../lib/video.ts';

console.log('Running YouTube Embed URL Test Suite...');

// 1. Valid YouTube ID
const validId = 'KXagoM8xsFo';
const expectedUrl =
  'https://www.youtube-nocookie.com/embed/KXagoM8xsFo?autoplay=1&rel=0&modestbranding=1&playsinline=1&cc_load_policy=1';
const resultUrl = buildYouTubeEmbedUrl(validId);
assert.equal(resultUrl, expectedUrl, 'Valid ID should produce exact nocookie embed URL');
console.log('✓ Valid ID returns exact nocookie URL');

// 2. Another valid 11-char ID with - and _
const validId2 = 'abc-123_XYZ';
const expectedUrl2 =
  'https://www.youtube-nocookie.com/embed/abc-123_XYZ?autoplay=1&rel=0&modestbranding=1&playsinline=1&cc_load_policy=1';
assert.equal(buildYouTubeEmbedUrl(validId2), expectedUrl2, 'Valid ID with hyphen and underscore works');
console.log('✓ Valid ID with symbols returns exact nocookie URL');

// 3. Invalid IDs must throw
const invalidIds = [
  '',
  'KXagoM8xsF', // 10 chars
  'KXagoM8xsFoo', // 12 chars
  'KXagoM8xsF!', // forbidden char !
  'KXagoM8xsF<', // injection attempt
  '../escaped',
  'javascript:alert(1)',
  'https://youtube.com/watch?v=KXagoM8xsFo', // full URL instead of ID
];

for (const id of invalidIds) {
  assert.throws(
    () => buildYouTubeEmbedUrl(id),
    /Invalid YouTube video ID/,
    `ID "${id}" should throw an error`
  );
}
console.log(`✓ All ${invalidIds.length} invalid ID test cases threw an exception as expected`);

// 4. Optional autoplay and mute flags
const mutedAutoplayUrl = buildYouTubeEmbedUrl(validId, { autoplay: true, mute: true });
assert.ok(mutedAutoplayUrl.includes('autoplay=1'), 'Muted autoplay URL must include autoplay=1');
assert.ok(mutedAutoplayUrl.includes('mute=1'), 'Muted autoplay URL must include mute=1');
assert.ok(mutedAutoplayUrl.includes('cc_load_policy=1'), 'Muted autoplay URL must preserve cc_load_policy=1');

const noAutoplayUrl = buildYouTubeEmbedUrl(validId, { autoplay: false });
assert.ok(noAutoplayUrl.includes('autoplay=0'), 'autoplay: false must set autoplay=0');
assert.ok(!noAutoplayUrl.includes('mute=1'), 'No mute option must not include mute=1');

assert.throws(
  () => buildYouTubeEmbedUrl('bad-id', { autoplay: true, mute: true }),
  /Invalid YouTube video ID/,
  'Invalid ID with options must still throw'
);
console.log('✓ Optional autoplay/mute flags and invalid ID checks passed');

// 5. buildYouTubePlayerVars
const playerVars = buildYouTubePlayerVars(validId);
assert.deepEqual(playerVars, {
  controls: 1,
  rel: 0,
  modestbranding: 1,
  playsinline: 1,
  cc_load_policy: 1,
  enablejsapi: 1,
});
assert.throws(
  () => buildYouTubePlayerVars('bad-id'),
  /Invalid YouTube video ID/,
  'buildYouTubePlayerVars must throw on invalid ID'
);
console.log('✓ buildYouTubePlayerVars and invalid ID validation passed');

// 6. Scroll-driven play/pause & userPaused state machine
let st = { isPlaying: false, pausedByScroll: false, userPaused: false };

// Enters >= 50% visible -> play muted
const step1 = decideScrollPlaybackAction(0.55, st, true);
assert.equal(step1.action, 'play_muted');
st = step1.nextState;
assert.deepEqual(st, { isPlaying: true, pausedByScroll: false, userPaused: false });

// Hysteresis zone (30% visible) -> keeps playing
const step2 = decideScrollPlaybackAction(0.30, st, true);
assert.equal(step2.action, 'none');
assert.equal(step2.nextState.isPlaying, true);

// Scrolls out (< 25% visible) -> pause_scroll
const step3 = decideScrollPlaybackAction(0.15, st, true);
assert.equal(step3.action, 'pause_scroll');
st = step3.nextState;
assert.deepEqual(st, { isPlaying: false, pausedByScroll: true, userPaused: false });

// YT fires PAUSED (2) while out of view -> remains scroll-paused (not userPaused)
st = handlePlayerStateChange(2, 0.15, st);
assert.equal(st.userPaused, false);

// Scrolls back in (>= 50%) -> resumes
const step4 = decideScrollPlaybackAction(0.60, st, true);
assert.equal(step4.action, 'play_muted');
st = step4.nextState;

// User manually pauses while mostly visible (0.8 >= 0.25) -> sets userPaused=true
st = handlePlayerStateChange(2, 0.80, st);
assert.deepEqual(st, { isPlaying: false, pausedByScroll: false, userPaused: true });

// Scrolls out and back in -> must NOT resume because userPaused=true
const step5 = decideScrollPlaybackAction(0.10, st, true);
assert.equal(step5.action, 'none');
const step6 = decideScrollPlaybackAction(0.85, st, true);
assert.equal(step6.action, 'none');

// User presses play again (YT state 1) -> clears userPaused
st = handlePlayerStateChange(1, 0.85, st);
assert.deepEqual(st, { isPlaying: true, pausedByScroll: false, userPaused: false });

// Reduced motion / offline (canAutoplay = false) -> does not autoplay
const stepReduced = decideScrollPlaybackAction(0.90, { isPlaying: false, pausedByScroll: false, userPaused: false }, false);
assert.equal(stepReduced.action, 'none');

console.log('✓ Scroll-driven play/pause and userPaused state machine tests passed');
console.log('All YouTube Embed tests passed successfully!');
