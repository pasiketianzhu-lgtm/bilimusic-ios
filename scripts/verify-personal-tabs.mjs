import assert from 'node:assert/strict'
import { PERSONAL_TABS } from '../apps/mobile/src/app/(tabs)/tabConfig.ts'

assert.deepEqual(
  PERSONAL_TABS.map(({ name, label }) => ({ name, label })),
  [
    { name: 'index', label: '首页' },
    { name: 'library/[tab]', label: '歌单' },
    { name: 'download', label: '下载' },
    { name: 'my', label: '我的' },
  ],
)

console.log('personal navigation contract passed')
