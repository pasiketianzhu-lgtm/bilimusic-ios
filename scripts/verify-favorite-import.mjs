import assert from 'node:assert/strict'

import { importPages } from '../apps/mobile/src/features/library/favorite/importPages.ts'
const processed = []
const result = await importPages({
	load: async (page) => ({
		items: page === 1 ? [1, 2, 2] : [3, 4],
		hasMore: page === 1,
	}),
	key: String,
	selected: (item) => item !== 4,
	save: async (item) => {
		if (item === 2) throw new Error('unavailable')
		processed.push(item)
		return 'added'
	},
	cancelled: () => false,
})
assert.deepEqual(processed, [1, 3])
assert.equal(result.added, 2)
assert.equal(result.failures.length, 1)
assert.equal(result.failures[0].item, 2)
const cancelled = await importPages({
	load: async () => {
		throw Error('must not load')
	},
	key: String,
	selected: () => true,
	save: async () => 'added',
	cancelled: () => true,
})
assert.equal(cancelled.cancelled, true)
