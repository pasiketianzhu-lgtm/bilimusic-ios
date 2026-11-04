import { Orpheus } from '@bbplayer/orpheus'
import { useQuery } from '@tanstack/react-query'
import { useIsFocused, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import {
	Icon,
	ProgressBar,
	Text,
	TouchableRipple,
	useTheme,
} from 'react-native-paper'

import CoverWithPlaceHolder from '@/components/common/CoverWithPlaceHolder'
import IconButton from '@/components/common/IconButton'
import { useRecentTracks } from '@/features/history/RecentTracks'
import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { setPlayerShuffleMode } from '@/hooks/player/usePlaybackOptions'
import { usePlaylistLists } from '@/hooks/queries/db/playlist'
import { useListeningHistoryStore } from '@/hooks/stores/useListeningHistoryStore'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { ensureLikedPlaylist } from '@/lib/services/likedPlaylistService'
import { isLongContent } from '@/lib/services/playlistRules'
import type { Track } from '@/types/core/media'
import { toastAndLogError } from '@/utils/error-handling'
import { addToQueue } from '@/utils/player'
import { formatDurationToHHMMSS } from '@/utils/time'
import toast from '@/utils/toast'

import { selectHomePlaylists } from './homePreview'
import { useHomeLibrary } from './useHomeLibrary'

export default function HomeDashboard() {
	const { colors } = useTheme()
	const router = useRouter()
	const focused = useIsFocused()
	const { width } = useWindowDimensions()
	const wide = width >= 900
	const [gridWidth, setGridWidth] = useState(330)
	const [startingRandom, setStartingRandom] = useState(false)
	const current = useCurrentTrack()
	const { tracks: recent, isError: recentError } = useRecentTracks(6)
	const { data: playlists = [], isError: playlistError } = usePlaylistLists()
	const {
		data: library = [],
		isError: libraryError,
		refetch: refreshLibrary,
	} = useHomeLibrary()
	const entries = useListeningHistoryStore((state) => state.entries)
	const homePlaylists = selectHomePlaylists(
		playlists.filter(
			(item) => item.type === 'local' || item.type === 'dynamic',
		),
		6,
	)
	const resume = current ?? recent[0]
	const longTracks = useMemo(() => {
		const candidates = new Map(
			[...library, ...recent, ...(current ? [current] : [])].map((track) => [
				track.uniqueKey,
				track,
			]),
		)
		const order = new Map(
			recent.toReversed().map((track, index) => [track.uniqueKey, index]),
		)
		entries.forEach((entry, index) =>
			order.set(entry.track.id, recent.length + index),
		)
		if (current) order.set(current.uniqueKey, Number.MAX_SAFE_INTEGER)
		return [...candidates.values()]
			.filter((track) => isLongContent(track.duration))
			.sort(
				(a, b) =>
					(order.get(b.uniqueKey) ?? -1) - (order.get(a.uniqueKey) ?? -1) ||
					b.updatedAt.getTime() - a.updatedAt.getTime(),
			)
			.slice(0, 4)
	}, [library, recent, current, entries])

	const positionKeys = [
		resume?.uniqueKey,
		...longTracks.map((track) => track.uniqueKey),
	].filter((key): key is string => Boolean(key))
	const { data: positions = {} } = useQuery({
		queryKey: ['home-positions', current?.uniqueKey, positionKeys.join('|')],
		networkMode: 'always',
		enabled: focused,
		refetchInterval: focused ? 5000 : false,
		queryFn: async () => {
			const saved: Record<string, number> = {}
			for (const key of positionKeys)
				saved[key] =
					Platform.OS === 'ios' &&
					typeof Orpheus.getSavedTrackPosition === 'function'
						? Math.max(0, Orpheus.getSavedTrackPosition(key))
						: 0
			const native = await Orpheus.getCurrentTrack().catch(() => null)
			if (native) {
				const position = await Orpheus.getPosition().catch(() => undefined)
				if (position !== undefined && Number.isFinite(position))
					saved[native.id] = Math.max(0, position)
			}
			return saved
		},
	})
	const playTrack = async (track: Track) => {
		try {
			const queue = await Orpheus.getQueue()
			const index = queue.findIndex((item) => item.id === track.uniqueKey)
			if (index >= 0) {
				if ((await Orpheus.getCurrentTrack())?.id !== track.uniqueKey)
					await Orpheus.skipTo(index)
				await Orpheus.play()
			} else if (
				!(await addToQueue({
					tracks: [track],
					playNow: true,
					clearQueue: false,
					startFromKey: track.uniqueKey,
					playNext: false,
				}))
			)
				return

			router.navigate('/player')
		} catch (error) {
			toastAndLogError('继续播放失败', error, 'Home.Play')
		}
	}
	const randomPlay = async () => {
		if (startingRandom) return
		setStartingRandom(true)
		try {
			const refreshed = await refreshLibrary()
			if (refreshed.isError) throw refreshed.error
			const candidates = refreshed.data ?? []
			const flags = await Promise.all(
				candidates.map(async (track) =>
					Platform.OS === 'ios'
						? (await Orpheus.getTrackBehavior(track.uniqueKey, track.duration))
								.random
						: !isLongContent(track.duration),
				),
			)
			const eligible = candidates.filter((_track, index) => flags[index])
			const active = (await Orpheus.getCurrentTrack())?.id
			const choices = eligible.filter((track) => track.uniqueKey !== active)
			if (!choices.length) {
				toast.info('歌单中还没有其他可随机播放的歌曲')
				return
			}
			const first = choices[Math.floor(Math.random() * choices.length)]
			await setPlayerShuffleMode(true)
			if (
				await addToQueue({
					tracks: eligible,
					playNow: true,
					clearQueue: true,
					startFromKey: first.uniqueKey,
					playNext: false,
				})
			)
				router.navigate('/player')
		} catch (error) {
			toastAndLogError('开始随机播放失败', error, 'Home.Random')
		} finally {
			setStartingRandom(false)
		}
	}
	const openLiked = async () => {
		try {
			const id = await ensureLikedPlaylist()
			router.navigate(`/playlist/local/${id}`)
		} catch (error) {
			toastAndLogError('打开我喜欢失败', error, 'Home')
		}
	}
	const heading = (
		title: string,
		action?: { title: string; onPress: () => void },
	) => (
		<View style={styles.heading}>
			<Text style={{ fontSize: 20, fontWeight: '700' }}>{title}</Text>
			{action && (
				<TouchableRipple onPress={action.onPress}>
					<Text style={{ paddingVertical: 10, color: colors.onSurfaceVariant }}>
						{action.title}
					</Text>
				</TouchableRipple>
			)}
		</View>
	)
	const trackRow = (track: Track, progress = false) => {
		const position = Math.min(track.duration, positions[track.uniqueKey] ?? 0)
		return (
			<TouchableRipple
				key={track.uniqueKey}
				onPress={() => void playTrack(track)}
				accessibilityLabel={`播放 ${track.title}`}
				style={{ borderRadius: 12 }}
			>
				<View style={styles.trackRow}>
					<CoverWithPlaceHolder
						id={track.uniqueKey}
						cover={track.coverUrl}
						title={track.title}
						size={52}
						borderRadius={10}
					/>
					<View style={{ flex: 1, gap: 5 }}>
						<Text
							numberOfLines={1}
							style={{ fontSize: 15, fontWeight: '500' }}
						>
							{track.title}
						</Text>
						<Text
							numberOfLines={1}
							style={{ fontSize: 12, color: colors.onSurfaceVariant }}
						>
							{progress
								? `已听 ${formatDurationToHHMMSS(position)} / ${formatDurationToHHMMSS(track.duration)}`
								: (track.artist?.name ?? '未知作者')}
						</Text>
						{progress && (
							<ProgressBar
								progress={track.duration > 0 ? position / track.duration : 0}
								color={colors.primary}
								style={{ height: 3, borderRadius: 2 }}
							/>
						)}
					</View>
					<Icon
						source='play-circle-outline'
						size={26}
						color={colors.onSurfaceVariant}
					/>
				</View>
			</TouchableRipple>
		)
	}
	const continueBlock = (
		<View style={{ marginBottom: 20 }}>
			{heading('继续收听')}
			{resume ? (
				<TouchableRipple
					onPress={() => void playTrack(resume)}
					style={{
						borderRadius: 20,
						backgroundColor: colors.secondaryContainer,
					}}
					accessibilityLabel={`继续收听 ${resume.title}`}
				>
					<View style={{ padding: 18, gap: 14 }}>
						<View
							style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}
						>
							<CoverWithPlaceHolder
								id={resume.uniqueKey}
								title={resume.title}
								cover={resume.coverUrl}
								size={88}
								borderRadius={14}
							/>
							<View style={{ flex: 1, gap: 8 }}>
								<Text
									numberOfLines={2}
									style={{
										fontSize: 19,
										lineHeight: 26,
										fontWeight: '700',
										color: colors.onSecondaryContainer,
									}}
								>
									{resume.title}
								</Text>
								<Text
									numberOfLines={1}
									style={{ fontSize: 13, color: colors.onSecondaryContainer }}
								>
									{resume.artist?.name ?? '上次播放'}
								</Text>
							</View>
							<Icon
								source='play-circle'
								size={40}
								color={colors.onSecondaryContainer}
							/>
						</View>
						<View style={{ gap: 8 }}>
							<ProgressBar
								progress={
									resume.duration > 0
										? Math.min(
												1,
												(positions[resume.uniqueKey] ?? 0) / resume.duration,
											)
										: 0
								}
							/>
							<Text
								style={{ fontSize: 12, color: colors.onSecondaryContainer }}
							>
								{formatDurationToHHMMSS(positions[resume.uniqueKey] ?? 0)} /{' '}
								{formatDurationToHHMMSS(resume.duration)}
							</Text>
						</View>
					</View>
				</TouchableRipple>
			) : (
				<View
					style={{
						padding: 22,
						backgroundColor: colors.surfaceVariant,
						borderRadius: 20,
						gap: 8,
					}}
				>
					<Text style={{ fontSize: 17 }}>从喜欢的音乐开始</Text>
					<Text style={{ color: colors.onSurfaceVariant }}>
						搜索音乐或打开歌单，下一次从这里接着听。
					</Text>
				</View>
			)}
		</View>
	)
	const shortcuts = (
		<View style={styles.shortcuts}>
			{(
				[
					['heart', '我喜欢', () => void openLiked()],
					['download', '已下载', () => router.navigate('/download')],
					['history', '最近播放', () => router.navigate('/history/recent')],
					[
						'shuffle-variant',
						startingRandom ? '准备中' : '随机听',
						() => void randomPlay(),
					],
				] as const
			).map(([icon, title, onPress]) => (
				<TouchableRipple
					key={icon}
					onPress={onPress}
					disabled={icon === 'shuffle-variant' && startingRandom}
					style={{ flex: 1, borderRadius: 14 }}
				>
					<View style={{ alignItems: 'center', gap: 9, paddingVertical: 14 }}>
						<View
							style={{
								padding: 12,
								backgroundColor: colors.surfaceVariant,
								borderRadius: 18,
							}}
						>
							<Icon
								source={icon}
								size={24}
								color={icon === 'heart' ? colors.error : colors.primary}
							/>
						</View>
						<Text style={{ fontSize: 12 }}>{title}</Text>
					</View>
				</TouchableRipple>
			))}
		</View>
	)
	const playlistBlock = (
		<View style={{ marginBottom: 20 }}>
			<View style={styles.heading}>
				<Text style={{ fontSize: 20, fontWeight: '700', flex: 1 }}>
					我的歌单
				</Text>
				<IconButton
					icon='plus'
					accessibilityLabel='新建歌单'
					size={24}
					onPress={() =>
						useModalStore
							.getState()
							.open('CreatePlaylist', { redirectToNewPlaylist: true })
					}
				/>
				<TouchableRipple onPress={() => router.navigate('/library/0')}>
					<Text style={{ color: colors.onSurfaceVariant, paddingVertical: 12 }}>
						全部 ›
					</Text>
				</TouchableRipple>
			</View>
			<View
				onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
				style={styles.grid}
			>
				{homePlaylists.map((playlist) => {
					const size = Math.max(80, (gridWidth - 24) / 3)
					return (
						<TouchableRipple
							key={playlist.id}
							onPress={() => router.navigate(`/playlist/local/${playlist.id}`)}
							style={{ width: size, borderRadius: 12 }}
						>
							<View style={{ gap: 6, paddingBottom: 12 }}>
								<CoverWithPlaceHolder
									id={playlist.id}
									cover={playlist.coverUrl}
									title={playlist.title}
									size={size}
									borderRadius={12}
								/>
								<Text
									numberOfLines={1}
									style={{ fontSize: 14, fontWeight: '600' }}
								>
									{playlist.isPinned ? '⌖ ' : ''}
									{playlist.title}
								</Text>
								<Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
									{playlist.itemCount} 首
								</Text>
							</View>
						</TouchableRipple>
					)
				})}
			</View>
			{!homePlaylists.length && (
				<TouchableRipple
					onPress={() =>
						useModalStore
							.getState()
							.open('CreatePlaylist', { redirectToNewPlaylist: true })
					}
				>
					<View style={{ paddingVertical: 24, gap: 8 }}>
						<Text>创建你的第一个歌单 ＋</Text>
						<Text style={{ color: colors.onSurfaceVariant }}>
							{playlistError
								? '歌单读取失败，请重新进入首页'
								: '把喜欢的 B 站音乐整理到一起'}
						</Text>
					</View>
				</TouchableRipple>
			)}
		</View>
	)
	const recentBlock = (
		<View style={{ marginBottom: 20 }}>
			{heading('最近在听', {
				title: '全部 ›',
				onPress: () => router.navigate('/history/recent'),
			})}
			{recent.map((track) => trackRow(track))}
			{!recent.length && (
				<Text style={{ color: colors.onSurfaceVariant, paddingVertical: 18 }}>
					{recentError
						? '最近播放读取失败，请重新进入首页'
						: '听过的音乐会出现在这里'}
				</Text>
			)}
		</View>
	)
	const longBlock = (
		<View style={{ marginBottom: 20 }}>
			{heading('长内容专区')}
			{longTracks.map((track) => trackRow(track, true))}
			{!longTracks.length && (
				<Text
					style={{
						color: colors.onSurfaceVariant,
						paddingVertical: 18,
						lineHeight: 22,
					}}
				>
					{libraryError
						? '音乐库读取失败，请重新进入首页'
						: '歌单中超过 30 分钟的内容会出现在这里，方便接着听。'}
				</Text>
			)}
		</View>
	)
	return wide ? (
		<View style={{ flexDirection: 'row', gap: 32 }}>
			<View style={{ flex: 0.9 }}>
				{continueBlock}
				{shortcuts}
				{longBlock}
			</View>
			<View style={{ flex: 1.3 }}>
				{playlistBlock}
				{recentBlock}
			</View>
		</View>
	) : (
		<View>
			{continueBlock}
			{shortcuts}
			{playlistBlock}
			{recentBlock}
			{longBlock}
		</View>
	)
}
const styles = StyleSheet.create({
	heading: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		minHeight: 52,
		marginBottom: 8,
	},
	shortcuts: { flexDirection: 'row', gap: 4, marginBottom: 20 },
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
	trackRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 10,
		paddingHorizontal: 2,
	},
})
