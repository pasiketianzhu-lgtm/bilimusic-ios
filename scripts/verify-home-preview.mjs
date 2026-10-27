import assert from 'node:assert/strict'
import { selectHomePlaylists } from '../apps/mobile/src/features/home/homePreview.ts'

const playlists = [
  { id: 1, title: '普通', isPinned: false, updatedAt: new Date('2026-01-01') },
  { id: 2, title: '置顶', isPinned: true, updatedAt: new Date('2025-01-01') },
  { id: 3, title: '最新', isPinned: false, updatedAt: new Date('2026-02-01') },
]
assert.deepEqual(selectHomePlaylists(playlists, 2).map((p) => p.id), [2, 3])
console.log('home preview contract passed')
