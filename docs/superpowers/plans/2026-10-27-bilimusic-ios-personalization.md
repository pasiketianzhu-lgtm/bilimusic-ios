# BiliMusic iOS 个性化改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 BBPlayer iOS 应用改造成以个人歌单、离线下载和稳定播放页为核心的 BiliMusic 自用播放器一期。

**Architecture:** 复用现有 Expo Router、Drizzle SQLite、本地歌单、Orpheus 播放器、下载管理和歌词组件。先在现有页面上收敛导航与产品入口，再补齐导入、队列偏好、长内容规则和离线状态；同步只保留可迁移的数据字段，不开放联网同步流程。

**Tech Stack:** Expo 57、React Native、Expo Router、TypeScript、Zustand、Drizzle SQLite、Orpheus Swift 播放引擎、EAS iOS unsigned build。

**Spec:** `docs/product/bilimusic-ios-v1-spec.md`

## Global Constraints

- 继续使用 pnpm；TypeScript/JS 改动完成后运行 `pnpm type-check` 和 `pnpm lint`。
- 保留现有 Bilibili 登录、长音频 HLS、后台音频和免费签名安装能力。
- 不启用推荐歌单；不自动下载新加入内容；不在第一阶段开放云同步。
- 长内容阈值固定为 30 分钟；默认排除随机播放并记住播放位置。
- UI 同时支持 iPhone 竖屏和 iPad 横屏；第一阶段沿用 BBPlayer 名称和图标。

## Review Focus

- 完整收藏夹分页导入不能因单条失败而中断，并且重复导入必须幂等。
- 随机模式不能连续播放同一条目，且默认排除超过 30 分钟内容。
- 登录失效或断网时，本地歌单、播放队列和已下载音轨仍可用。
- 长合集切歌后要恢复准确位置，长音频不能重新回到整段 MP4 缓冲路径。
- iPad 横屏播放页不能破坏 iPhone 播放页和锁屏控制。

---

### Task 1: 产品入口与导航收敛

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/src/app/(tabs)/index.tsx`
- Modify: `apps/mobile/src/app/(tabs)/my.tsx`
- Modify: `apps/mobile/src/components/NowPlayingBar.tsx`
- Test: `apps/mobile/src/app/__tests__/navigation.test.tsx`（如仓库测试基础设施允许）

**Interfaces:**
- Consumes existing local playlist, history, download and player routes.
- Produces stable 首页／歌单／下载／我的 navigation and persistent mini-player entry.

- [ ] **Step 1:** 盘点现有 tabs 与入口，写导航测试/静态断言，固定四个产品入口及离线可见性。
- [ ] **Step 2:** 将首页收敛为个人歌单、我喜欢、最近播放和搜索入口；移除或隐藏推荐相关入口，不删除底层远程浏览能力。
- [ ] **Step 3:** 让迷你播放器在四个入口一致显示，并保留进入完整播放页的行为。
- [ ] **Step 4:** 运行 `pnpm type-check` 与 `pnpm lint`。
- [ ] **Step 5:** Commit `feat: reshape personal music navigation`。

### Task 2: 本地歌单与我喜欢规则

**Files:**
- Modify: `apps/mobile/src/features/playlist/local/components/LocalPlaylistHeader.tsx`
- Modify: `apps/mobile/src/features/playlist/local/components/LocalTrackList.tsx`
- Modify: `apps/mobile/src/features/playlist/local/hooks/useLocalPlaylistPlayer.ts`
- Modify: `apps/mobile/src/components/modals/playlist/CreatePlaylistModal.tsx`
- Modify: relevant Drizzle schema/migrations under `apps/mobile/src/db` and `apps/mobile/drizzle`
- Test: playlist service/unit tests beside existing playlist services

**Interfaces:**
- Uses existing playlist and playlist-track tables/services.
- Produces idempotent multi-playlist membership, manual order, batch actions, and special 我喜欢 playlist behavior.

- [ ] **Step 1:** Pin the schema invariants: one video/part identity per playlist, independent references across playlists, sort key appended at tail, future sync metadata nullable.
- [ ] **Step 2:** Add/adjust mutations for create/rename/delete/cover/pin/reorder/batch move/remove and favorite toggle without deleting shared downloads.
- [ ] **Step 3:** Add UI actions and empty/offline states.
- [ ] **Step 4:** Verify duplicate insertion is skipped and removing one playlist reference keeps other references and the local asset.
- [ ] **Step 5:** Run type-check/lint and commit `feat: strengthen local playlist management`.

### Task 3: 收藏夹分页导入

**Files:**
- Modify: `apps/mobile/src/features/library/favorite/FavoriteFolderList.tsx`
- Modify: `apps/mobile/src/features/library/favorite/FavoriteFolderListItem.tsx`
- Create or modify: `apps/mobile/src/features/playlist/local/components/FavoriteImportSheet.tsx`
- Modify: relevant Bilibili favorite API/service files
- Test: import service tests with pagination, duplicate and failure cases

**Interfaces:**
- Consumes Bilibili account/favorite API and local playlist mutations from Task 2.
- Produces paged selection, default-all import, progress, failure list, retry and idempotent result.

- [ ] **Step 1:** Write tests for paged pages, partial selection, duplicate skip, one-item failure, retry and cancellation.
- [ ] **Step 2:** Implement an import controller that processes pages incrementally and records per-item result.
- [ ] **Step 3:** Add selection/import progress UI without loading all covers into memory.
- [ ] **Step 4:** Verify a full collection can finish when one or more videos are unavailable.
- [ ] **Step 5:** Commit `feat: import bilibili favorites into local playlists`.

### Task 4: Queue and playback policy

**Files:**
- Modify: `apps/mobile/src/lib/player/*` or existing queue manager files
- Modify: `apps/mobile/src/features/playlist/local/hooks/useLocalPlaylistPlayer.ts`
- Modify: `apps/mobile/src/features/player/*`
- Modify: `apps/mobile/src/db` player preference schema and migrations
- Test: queue policy tests for sequential/reverse/random/repeat/long-content exclusion

**Interfaces:**
- Consumes ordered playlist tracks and track duration.
- Produces queue persistence, next-up insertion, manual queue reorder, mode selection, no-consecutive-duplicate random selection, and resume position.

- [ ] **Step 1:** Write deterministic tests for all play modes and the 30-minute exclusion default.
- [ ] **Step 2:** Implement queue policy as a pure module with persisted current queue/item/position and per-track participation override.
- [ ] **Step 3:** Connect playlist clicks, play-next, queue modal, lock-screen controls and progress persistence.
- [ ] **Step 4:** Verify app restart and track interruption restore the expected queue and long-content position.
- [ ] **Step 5:** Commit `feat: add personal queue playback policies`.

### Task 5: Download and offline UX

**Files:**
- Modify: `apps/mobile/src/app/download.tsx`
- Modify: `apps/mobile/src/app/downloaded.tsx`
- Modify: `apps/mobile/src/features/downloads/DownloadTaskItem.tsx`
- Modify: `apps/mobile/src/features/downloads/DownloadHeader.tsx`
- Modify: download service/storage files
- Test: download policy tests for space check, queue controls, duplicate asset and offline playback

**Interfaces:**
- Consumes queue/playlist selection and existing download manager.
- Produces single/playlist download, task controls, size estimate, retry, deduplicated local asset and offline availability state.

- [ ] **Step 1:** Write tests for no auto-download, preflight space failure, playlist task creation, retry and shared asset deletion.
- [ ] **Step 2:** Add preflight space estimation and per-task pause/resume/cancel/retry state.
- [ ] **Step 3:** Add playlist download with explicit confirmation for >30-minute items and a clear downloaded-only view.
- [ ] **Step 4:** Gate remote playback on offline availability while leaving local library browseable without network.
- [ ] **Step 5:** Commit `feat: make downloads offline-first`.

### Task 6: Player, lyrics and iPad layout polish

**Files:**
- Modify: `apps/mobile/src/app/player.tsx`
- Modify: `apps/mobile/src/features/player/components/main/*`
- Modify: `apps/mobile/src/features/player/components/lyrics/*`
- Modify: `apps/mobile/src/components/modals/lyrics/*`
- Modify: `apps/mobile/src/features/player/components/visuals/*`
- Test: player smoke tests and responsive layout checks

**Interfaces:**
- Consumes current track, lyrics sources and queue from Tasks 2–4.
- Produces QQ Music-inspired player controls, subtitle fallback, LRC import/offset, lock-screen metadata, iPhone layout and iPad three-column landscape layout.

- [ ] **Step 1:** Write player smoke tests for no-lyrics, Bilibili subtitle, LRC offset, seek and queue actions.
- [ ] **Step 2:** Implement a single player state model with explicit lyrics source selection and offset.
- [ ] **Step 3:** Add adaptive iPhone/iPad layout: queue／cover-controls／lyrics in landscape, single-column phone layout.
- [ ] **Step 4:** Verify lock-screen metadata and interruption behavior on the existing native player path.
- [ ] **Step 5:** Commit `feat: polish music player and lyrics experience`.

### Task 7: Offline-safe account and release verification

**Files:**
- Modify: Bilibili account/auth hooks and settings screens
- Modify: `apps/mobile/src/app/_layout.tsx`
- Modify: sync metadata migration only; do not expose sync UI
- Test: account-expiry and offline startup checks

**Interfaces:**
- Consumes existing keychain/cookie login and local database.
- Produces local-first startup and nullable future-sync fields without an active cloud sync workflow.

- [ ] **Step 1:** Write checks for expired login, no network startup, and local playback of downloaded assets.
- [ ] **Step 2:** Keep auth prompts scoped to remote operations and preserve local navigation.
- [ ] **Step 3:** Verify no recommendation entry or sync entry is exposed in the first release.
- [ ] **Step 4:** Run `pnpm type-check`, `pnpm lint`, and the EAS unsigned iOS build; install on the connected iPad for smoke verification.
- [ ] **Step 5:** Commit `chore: verify offline-first personal release`.
