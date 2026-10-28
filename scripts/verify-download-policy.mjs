import assert from 'node:assert/strict'

import {
	estimateAudioBytes,
	hasDownloadSpace,
} from '../apps/mobile/src/features/downloads/downloadPolicy.ts'
assert.equal(estimateAudioBytes(300), 12000000)
assert.equal(estimateAudioBytes(undefined), 24000000)
assert.equal(estimateAudioBytes(-1), 24000000)
assert.equal(hasDownloadSpace(100, 100), false)
assert.equal(hasDownloadSpace(64 * 1048576 + 1000, 600, 400), true)
assert.equal(hasDownloadSpace(64 * 1048576 + 999, 600, 400), false)
assert.equal(hasDownloadSpace(NaN, 1), false)
