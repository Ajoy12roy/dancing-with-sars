import assert from 'node:assert/strict';
import { buildYouTubeEmbedUrl } from '../lib/video.ts';

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

console.log('All YouTube Embed tests passed successfully!');
