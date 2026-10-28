import assert from 'node:assert/strict'

import {
	splitAppState,
	mergeAppState,
} from '../apps/mobile/src/utils/appStateSecrets.ts'
const original = {
	version: 6,
	state: {
		settings: { theme: 'system' },
		bilibiliCookie: { test: 'fixture' },
		bbplayerToken: 'fixture-token',
	},
}
const parts = splitAppState(JSON.stringify(original))
assert.equal(parts.publicValue.includes('fixture'), false)
assert.deepEqual(
	JSON.parse(mergeAppState(parts.publicValue, parts.privateValue)),
	original,
)
const cleared = splitAppState(
	JSON.stringify({ state: { bilibiliCookie: null, bbplayerToken: null } }),
)
assert.deepEqual(JSON.parse(cleared.privateValue), {
	bilibiliCookie: null,
	bbplayerToken: null,
})
