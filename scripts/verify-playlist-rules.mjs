import assert from 'node:assert/strict'
import {
  LONG_CONTENT_THRESHOLD_SECONDS,
  defaultRandomParticipation,
  isLongContent,
  uniqueTrackIds,
} from '../apps/mobile/src/lib/services/playlistRules.ts'

assert.equal(LONG_CONTENT_THRESHOLD_SECONDS, 30 * 60)
assert.equal(isLongContent(1800), false)
assert.equal(isLongContent(1801), true)
assert.equal(isLongContent(null), false)
assert.equal(defaultRandomParticipation(1801), false)
assert.equal(defaultRandomParticipation(1800), true)
assert.deepEqual(uniqueTrackIds([3, 3, 1, 2, 1]), [3, 1, 2])
console.log('playlist rules contract passed')

assert.deepEqual(defaultRandomParticipation(7200), false)
