import assert from 'node:assert/strict'

import { subtitlesToLrc } from '../apps/mobile/src/features/player/utils/subtitleLrc.ts'
assert.equal(
	subtitlesToLrc([
		{ from: 59.999, content: '测试\n下一行' },
		{ from: 1.2, content: '开头' },
	]),
	'[00:01.20]开头\n[01:00.00]测试 下一行',
)
assert.equal(subtitlesToLrc([{ from: NaN, content: 'bad' }]), '')
