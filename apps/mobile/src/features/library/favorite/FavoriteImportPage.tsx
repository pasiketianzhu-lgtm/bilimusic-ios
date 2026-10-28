import { LegendList } from '@legendapp/list/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import {
	Appbar,
	Button,
	Checkbox,
	List,
	Text,
	TextInput,
	useTheme,
} from 'react-native-paper'

import { useInfiniteFavoriteList } from '@/hooks/queries/bilibili/favorite'
import { playlistKeys, usePlaylistLists } from '@/hooks/queries/db/playlist'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { queryClient } from '@/lib/config/queryClient'
import { syncFacade } from '@/lib/facades/syncBilibiliPlaylist'
import { playlistService } from '@/lib/services/playlistService'
import type { BilibiliFavoriteListContent } from '@/types/apis/bilibili'

import { importPages, type ImportSummary } from './importPages'

async function save(
	item: BilibiliFavoriteListContent,
	playlistId: number,
): Promise<'added' | 'skipped'> {
	if (!item.bvid || item.type !== 2) throw new Error('该条目不是可导入的视频')
	const result = await syncFacade.addTrackToLocal({
		id: item.id,
		uniqueKey: `bilibili::${item.bvid}`,
		source: 'bilibili',
		title: item.title,
		coverUrl: item.cover,
		duration: item.duration,
		createdAt: new Date(),
		updatedAt: new Date(),
		artist: {
			id: item.upper.mid,
			name: item.upper.name,
			remoteId: String(item.upper.mid),
			source: 'bilibili',
			avatarUrl: item.upper.face,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		bilibiliMetadata: {
			bvid: item.bvid,
			cid: null,
			isMultiPage: false,
			videoIsValid: item.attr === 0,
		},
	})
	if (result.isErr()) throw result.error
	const added = await playlistService.addManyTracksToLocalPlaylist(playlistId, [
		result.value.id,
	])
	if (added.isErr()) throw added.error
	return added.value.length ? 'added' : 'skipped'
}

export default function FavoriteImportPage() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const favoriteId = Number(id)
	const router = useRouter()
	const { colors } = useTheme()
	const source = useInfiniteFavoriteList(favoriteId)
	const { data: playlists = [] } = usePlaylistLists()
	const [excluded, setExcluded] = useState<Set<string>>(new Set())
	const [destination, setDestination] = useState<number>()
	const [chooseDestination, setChooseDestination] = useState(false)
	const [name, setName] = useState('')
	const [busy, setBusy] = useState(false)
	const [summary, setSummary] =
		useState<ImportSummary<BilibiliFavoriteListContent>>()
	const [error, setError] = useState('')
	const cancel = useRef(false)
	const mounted = useRef(true)
	useEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
			cancel.current = true
		}
	}, [])
	const tracks = source.data?.pages.flatMap((page) => page.medias ?? []) ?? []
	const info = source.data?.pages[0]?.info
	const selectedTitle = playlists.find((p) => p.id === destination)?.title

	async function start(retryOnly = false) {
		if (busy || !info) return
		setBusy(true)
		setError('')
		cancel.current = false
		let target = destination
		try {
			if (target === undefined) {
				const created = await playlistService.createPlaylist({
					title: name.trim() || info.title,
					coverUrl: info.cover,
					type: 'local',
					description: `从 B 站收藏夹「${info.title}」导入`,
				})
				if (created.isErr()) throw created.error
				target = created.value.id
				if (mounted.current) setDestination(target)
			}
			const targetId = target
			const failedItems = summary?.failures.map((failure) => failure.item) ?? []
			const result = await importPages({
				load: async (page) => {
					if (retryOnly) return { items: failedItems, hasMore: false }
					const loaded = await bilibiliApi.getFavoriteListContents({
						favoriteId,
						pn: page,
					})
					if (loaded.isErr()) throw loaded.error
					return {
						items: loaded.value.medias ?? [],
						hasMore: loaded.value.has_more,
					}
				},
				key: (item) => item.bvid,
				selected: (item) => !excluded.has(item.bvid),
				save: (item) => save(item, targetId),
				cancelled: () => cancel.current,
				onProgress: (progress) => {
					if (mounted.current) setSummary(progress)
				},
			})
			if (mounted.current) setSummary(result)
		} catch (cause) {
			if (mounted.current)
				setError(
					cause instanceof Error
						? cause.message
						: '导入失败，请重试；已导入内容会自动去重',
				)
		} finally {
			await queryClient.invalidateQueries({ queryKey: playlistKeys.all })
			if (mounted.current) setBusy(false)
		}
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Appbar.Header>
				<Appbar.BackAction
					disabled={busy}
					onPress={() => router.back()}
				/>
				<Appbar.Content title='导入收藏夹' />
			</Appbar.Header>
			<View style={styles.header}>
				<Text variant='titleMedium'>{info?.title ?? '正在读取收藏夹…'}</Text>
				<Text>默认选择整个收藏夹，取消勾选可排除条目。导入后独立管理。</Text>
				<Button
					disabled={busy}
					onPress={() => setChooseDestination(!chooseDestination)}
				>
					{destination === undefined
						? '导入到新歌单'
						: `导入到：${selectedTitle ?? '所选歌单'}`}{' '}
					· 更改
				</Button>
				{chooseDestination && !busy && (
					<ScrollView style={styles.destinations}>
						<Button
							onPress={() => {
								setDestination(undefined)
								setChooseDestination(false)
							}}
						>
							新建歌单
						</Button>
						{playlists
							.filter((p) => p.type === 'local')
							.map((p) => (
								<Button
									key={p.id}
									onPress={() => {
										setDestination(p.id)
										setChooseDestination(false)
									}}
								>
									{p.title}
								</Button>
							))}
					</ScrollView>
				)}
				{destination === undefined && (
					<TextInput
						label='新歌单名称'
						placeholder={info?.title}
						value={name}
						onChangeText={setName}
						disabled={busy}
						mode='outlined'
					/>
				)}
				{summary && (
					<Text accessibilityLiveRegion='polite'>
						{busy
							? '正在导入'
							: summary.cancelled
								? '已取消，保留已导入内容'
								: '本次结果'}
						：新增 {summary.added}，已存在 {summary.skipped}，失败{' '}
						{summary.failures.length}
					</Text>
				)}
				{!!error && <Text style={{ color: colors.error }}>{error}</Text>}
				{source.isError && (
					<Button onPress={() => void source.refetch()}>读取失败，重试</Button>
				)}
				<View style={styles.actions}>
					<Button
						mode='contained'
						loading={busy}
						disabled={!info || busy}
						onPress={() => void start()}
					>
						开始导入
					</Button>
					{busy && (
						<Button
							onPress={() => {
								cancel.current = true
							}}
						>
							取消导入
						</Button>
					)}
					{!busy && Boolean(summary?.failures.length) && (
						<Button onPress={() => void start(true)}>重试失败项</Button>
					)}
					{!busy && destination !== undefined && (
						<Button
							onPress={() => router.navigate(`/playlist/local/${destination}`)}
						>
							查看歌单
						</Button>
					)}
				</View>
			</View>
			<LegendList
				data={tracks}
				keyExtractor={(item) => item.bvid}
				extraData={{ excluded, busy }}
				renderItem={({ item }) => (
					<Checkbox.Item
						label={item.title}
						disabled={busy}
						status={excluded.has(item.bvid) ? 'unchecked' : 'checked'}
						onPress={() =>
							setExcluded((previous) => {
								const next = new Set(previous)
								if (!next.delete(item.bvid)) next.add(item.bvid)
								return next
							})
						}
					/>
				)}
				onEndReached={() => {
					if (source.hasNextPage && !source.isFetchingNextPage && !busy)
						void source.fetchNextPage()
				}}
				ListFooterComponent={
					<View>
						{source.hasNextPage && (
							<Button
								loading={source.isFetchingNextPage}
								onPress={() => void source.fetchNextPage()}
							>
								加载更多供选择
							</Button>
						)}
						{summary?.failures.map((failure) => (
							<List.Item
								key={failure.item.bvid}
								title={failure.item.title}
								description={failure.message}
							/>
						))}
					</View>
				}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: { padding: 16, gap: 8 },
	actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	destinations: { maxHeight: 200 },
})
