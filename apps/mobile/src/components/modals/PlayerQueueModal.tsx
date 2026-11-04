import type { Track as OrpheusTrack } from '@bbplayer/orpheus'
import { Orpheus } from '@bbplayer/orpheus'
import type { LegendListRef } from '@legendapp/list/react-native'
import { LegendList } from '@legendapp/list/react-native'
import {
	TrueSheet,
	type TrueSheetProps,
} from '@lodev09/react-native-true-sheet'
import Color from 'color'
import type { RefObject } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import {
	GestureDetector,
	GestureHandlerRootView,
	Touchable,
	usePanGesture,
} from 'react-native-gesture-handler'
import { Text, TouchableRipple, useTheme } from 'react-native-paper'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import IconButton from '@/components/common/IconButton'
import { alert } from '@/components/modals/AlertModal'
import { requestDownloads } from '@/features/downloads/requestDownloads'
import PlaybackModeButton from '@/features/player/components/controls/PlaybackModeButton'
import QueueHistoryPanel from '@/features/player/components/main/QueueHistoryPanel'
import useCurrentTrackIdHook from '@/hooks/player/useCurrentTrackId'
import { useIsCurrentTrack } from '@/hooks/player/useIsCurrentTrack'
import { useListeningHistoryStore } from '@/hooks/stores/useListeningHistoryStore'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { usePlayerQueueSheetStore } from '@/hooks/stores/usePlayerQueueSheetStore'
import { usePlayerQueueStore } from '@/hooks/stores/usePlayerQueueStore'
import { useDeferredSheetAction } from '@/hooks/ui/useDeferredSheetAction'
import { clearPlaybackQueue } from '@/lib/player/playbackSession'
import { toastAndLogError } from '@/utils/error-handling'
import * as Haptics from '@/utils/haptics'

const ROW_HEIGHT = 52
const EDGE_ZONE = 64
const SCROLL_STEP = 8

const TrackItem = memo(
	({
		track,
		onSwitchTrack,
		onRemoveTrack,
		onDragStart,
		onDragUpdate,
		onDragEnd,
		isDragging,
		index,
	}: {
		track: OrpheusTrack
		onSwitchTrack: (index: number) => void
		onRemoveTrack: (index: number) => void
		onDragStart: (index: number, translationY: number, touchY: number) => void
		onDragUpdate: (translationY: number) => void
		onDragEnd: () => void
		isDragging: boolean
		index: number
	}) => {
		const colors = useTheme().colors
		const isCurrentTrack = useIsCurrentTrack(track.id)
		const dragPan = usePanGesture({
			activateAfterLongPress: 300,
			runOnJS: true,
			onActivate: (event) => onDragStart(index, event.translationY, event.y),
			onUpdate: (event) => onDragUpdate(event.translationY),
			onFinalize: onDragEnd,
		})
		return (
			<GestureDetector gesture={dragPan}>
				<View
					collapsable={false}
					style={{
						backgroundColor: isCurrentTrack ? 'transparent' : undefined,
						overflow: 'hidden',
						height: ROW_HEIGHT,
						opacity: isDragging ? 0.35 : 1,
					}}
				>
					<Touchable
						style={{ flex: 1 }}
						androidRipple={{}}
						onPress={() => {
							void Promise.resolve(onSwitchTrack(index)).catch(
								(error: unknown) =>
									toastAndLogError('切换歌曲失败', error, 'Player.Queue'),
							)
						}}
					>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: 8,
								flex: 1,
							}}
						>
							<View
								style={{
									paddingRight: 0,
									flex: 1,
									marginLeft: 12,
									flexDirection: 'row',
								}}
							>
								<Text
									numberOfLines={1}
									style={{
										flex: 1,
										fontSize: 16,
										color: isCurrentTrack ? '#20c997' : colors.onSurface,
									}}
								>
									{track.title}
									<Text
										style={{
											fontSize: 14,
											color: isCurrentTrack
												? '#20c997'
												: colors.onSurfaceVariant,
										}}
									>
										{' '}
										- {track.artist ?? '未知作者'}
									</Text>
								</Text>
								{isCurrentTrack && (
									<Text
										style={{ color: '#20c997', marginLeft: 8, fontSize: 20 }}
									>
										▂▆▃
									</Text>
								)}
							</View>
							<IconButton
								icon='close'
								accessibilityLabel={`移除 ${track.title}`}
								size={24}
								onPress={() => {
									void Promise.resolve(onRemoveTrack(index)).catch(
										(error: unknown) =>
											toastAndLogError('移除歌曲失败', error, 'Player.Queue'),
									)
								}}
							/>
						</View>
					</Touchable>
				</View>
			</GestureDetector>
		)
	},
)

TrackItem.displayName = 'TrackItem'

interface PlayerQueueModalProps extends TrueSheetProps {
	sheetRef?: RefObject<TrueSheet | null>
}

function PlayerQueueModal({ sheetRef, ...props }: PlayerQueueModalProps) {
	const insets = useSafeAreaInsets()
	const [tab, setTab] = useState<'queue' | 'history' | 'playlists' | 'random'>(
		'queue',
	)
	const historyEntries = useListeningHistoryStore((state) => state.entries)
	const playedPlaylists = useListeningHistoryStore((state) => state.playlists)
	const [clearing, setClearing] = useState(false)
	const { deferAction, runPendingAction } = useDeferredSheetAction()

	const dismissWithAction = useCallback(
		(action: () => void) => {
			deferAction(action)
			void usePlayerQueueSheetStore.getState().close()
		},
		[deferAction],
	)

	const clearQueue = () => {
		dismissWithAction(() => {
			alert('清空播放队列', '清空播放队列并停止播放？', [
				{ text: '取消' },
				{
					text: '清空',
					onPress: () => {
						setClearing(true)
						void clearPlaybackQueue()
							.catch((error: unknown) =>
								toastAndLogError('清空播放队列失败', error, 'Player.Queue'),
							)
							.finally(() => setClearing(false))
					},
				},
			])
		})
	}
	const currentTrackId = useCurrentTrackIdHook()
	const theme = useTheme()
	const [didInitialScroll, setDidInitialScroll] = useState(false)
	const flatListRef = useRef<LegendListRef>(null)
	const listHeightRef = useRef(0)
	const contentHeightRef = useRef(0)
	const scrollOffsetRef = useRef(0)
	const dragTranslationRef = useRef(0)
	const dragStartTranslationRef = useRef(0)
	const dragOriginRef = useRef(0)
	const dragTouchOffsetRef = useRef(ROW_HEIGHT / 2)
	const scrollDirectionRef = useRef(0)
	const dragRef = useRef<{ from: number; to: number; slot: number } | null>(
		null,
	)
	const [drag, setDrag] = useState<{
		from: number
		to: number
		slot: number
	} | null>(null)
	const ghostY = useSharedValue(0)
	const lineY = useSharedValue(0)
	const ghostStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: ghostY.value }],
	}))
	const lineStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: lineY.value }],
	}))
	const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const stopAutoScroll = useCallback(() => {
		if (autoScrollRef.current !== null) clearInterval(autoScrollRef.current)
		autoScrollRef.current = null
		scrollDirectionRef.current = 0
	}, [])
	useEffect(() => stopAutoScroll, [stopAutoScroll])
	const scrollableRef = useMemo(
		() => ({
			get current() {
				return flatListRef.current?.getNativeScrollRef() ?? null
			},
		}),
		[],
	)

	const queue = usePlayerQueueStore((state) => state.tracks)
	const queueRef = useRef(queue)
	useEffect(() => {
		queueRef.current = queue
	}, [queue])

	const currentIndex = useMemo(() => {
		if (!currentTrackId) return -1
		return queue.findIndex((t) => t.id === currentTrackId)
	}, [currentTrackId, queue])

	const switchTrackHandler = useCallback(
		async (index: number) => {
			if (index === -1) return
			const target = queue[index]
			if (!target) return
			if (target.id === currentTrackId) {
				await Orpheus.play()
				return
			}
			await Orpheus.skipTo(index)
		},
		[queue, currentTrackId],
	)

	const removeTrackHandler = useCallback(async (index: number) => {
		await Orpheus.removeTrack(index)
	}, [])

	const updateDropTarget = useCallback(
		(translationY: number) => {
			const active = dragRef.current
			if (!active) return
			const ghostTop =
				dragOriginRef.current + translationY - dragStartTranslationRef.current
			ghostY.set(ghostTop)
			const slot = Math.max(
				0,
				Math.min(
					queueRef.current.length,
					Math.round(
						(ghostTop + dragTouchOffsetRef.current + scrollOffsetRef.current) /
							ROW_HEIGHT,
					),
				),
			)
			lineY.set(slot * ROW_HEIGHT - scrollOffsetRef.current - 1)
			const to = slot > active.from ? slot - 1 : slot
			if (slot !== active.slot) {
				dragRef.current = { ...active, to, slot }
				setDrag(dragRef.current)
			}
		},
		[ghostY, lineY],
	)

	const updateDrag = useCallback(
		(translationY: number) => {
			if (!dragRef.current) return
			dragTranslationRef.current = translationY
			updateDropTarget(translationY)
			const localY =
				dragOriginRef.current +
				translationY -
				dragStartTranslationRef.current +
				dragTouchOffsetRef.current
			const direction =
				localY < EDGE_ZONE
					? -1
					: localY > listHeightRef.current - EDGE_ZONE
						? 1
						: 0
			if (direction === scrollDirectionRef.current) return
			stopAutoScroll()
			if (direction !== 0) {
				scrollDirectionRef.current = direction
				autoScrollRef.current = setInterval(() => {
					const maxOffset = Math.max(
						0,
						contentHeightRef.current - listHeightRef.current,
					)
					const next = Math.max(
						0,
						Math.min(
							maxOffset,
							scrollOffsetRef.current + direction * SCROLL_STEP,
						),
					)
					if (next === scrollOffsetRef.current) return
					void flatListRef.current?.scrollToOffset({
						offset: next,
						animated: false,
					})
					scrollOffsetRef.current = next
					updateDropTarget(dragTranslationRef.current)
				}, 16)
			}
		},
		[stopAutoScroll, updateDropTarget],
	)

	const startDrag = useCallback(
		(index: number, translationY: number, touchY: number) => {
			if (dragRef.current || queueRef.current.length < 2) return
			const touchOffset = Math.max(0, Math.min(ROW_HEIGHT, touchY))
			const slot = index + (touchOffset >= ROW_HEIGHT / 2 ? 1 : 0)
			const next = { from: index, to: index, slot }
			dragRef.current = next
			setDrag(next)
			dragStartTranslationRef.current = translationY
			dragTranslationRef.current = translationY
			dragTouchOffsetRef.current = touchOffset
			dragOriginRef.current = index * ROW_HEIGHT - scrollOffsetRef.current
			ghostY.set(dragOriginRef.current)
			lineY.set(slot * ROW_HEIGHT - scrollOffsetRef.current - 1)
			void Haptics.performHaptics(Haptics.AndroidHaptics.Long_Press)
		},
		[ghostY, lineY],
	)

	const endDrag = useCallback(() => {
		stopAutoScroll()
		const active = dragRef.current
		dragRef.current = null
		setDrag(null)
		if (active && active.from !== active.to) {
			void Orpheus.moveTrack(active.from, active.to).catch((error: unknown) =>
				toastAndLogError('调整播放队列失败', error, 'Player.Queue'),
			)
		}
	}, [stopAutoScroll])

	const keyExtractor = useCallback((item: OrpheusTrack) => item.id, [])

	const renderItem = useCallback(
		({ item, index }: { item: OrpheusTrack; index: number }) => (
			<TrackItem
				track={item}
				onSwitchTrack={switchTrackHandler}
				onRemoveTrack={removeTrackHandler}
				index={index}
				onDragStart={startDrag}
				onDragUpdate={updateDrag}
				onDragEnd={endDrag}
				isDragging={drag?.from === index}
			/>
		),
		[
			switchTrackHandler,
			removeTrackHandler,
			startDrag,
			updateDrag,
			endDrag,
			drag,
		],
	)

	const scrollToCurrent = useCallback(() => {
		if (
			tab !== 'queue' ||
			currentIndex === -1 ||
			!queue.length ||
			didInitialScroll
		)
			return
		void flatListRef.current?.scrollToIndex({
			animated: false,
			index: currentIndex,
			viewPosition: 0.5,
		})
		setDidInitialScroll(true)
	}, [tab, currentIndex, queue.length, didInitialScroll])

	useEffect(() => {
		if (tab !== 'queue') return
		const frame = requestAnimationFrame(scrollToCurrent)
		return () => cancelAnimationFrame(frame)
	}, [tab, scrollToCurrent])

	const saveQueueToPlaylistHandler = useCallback(() => {
		if (queue.length === 0) return
		dismissWithAction(() =>
			useModalStore.getState().open('SaveQueueToPlaylist', {
				trackIds: queue.map((t) => t.id),
			}),
		)
	}, [queue, dismissWithAction])

	return (
		<TrueSheet
			name='playerQueueModal'
			ref={sheetRef}
			detents={[0.65, 0.95]}
			cornerRadius={24}
			backgroundColor={theme.colors.elevation.level1}
			style={{ flex: 1 }}
			scrollableRef={scrollableRef}
			onMount={scrollToCurrent}
			onDidPresent={() => {
				usePlayerQueueSheetStore.getState().setOpen(true)
			}}
			onDidDismiss={() => {
				stopAutoScroll()
				dragRef.current = null
				setDrag(null)
				usePlayerQueueSheetStore.getState().setOpen(false)
				setDidInitialScroll(false)
				runPendingAction()
			}}
			{...props}
		>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<View
					style={{
						flex: 1,
					}}
				>
					<View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
						<View
							style={{ flexDirection: 'row', justifyContent: 'space-between' }}
						>
							{(
								[
									['queue', '正在播放', queue.length],
									['history', '已播歌曲', historyEntries.length],
									['playlists', '已播歌单', playedPlaylists.length],
								] as const
							).map(([key, title, count]) => (
								<TouchableRipple
									key={key}
									onPress={() => {
										stopAutoScroll()
										dragRef.current = null
										setDrag(null)
										setTab(key)
										setDidInitialScroll(false)
									}}
									accessibilityRole='tab'
									accessibilityState={{ selected: tab === key }}
								>
									<View
										style={{
											paddingVertical: 12,
											borderBottomWidth: 2,
											borderBottomColor:
												tab === key ? theme.colors.onSurface : 'transparent',
										}}
									>
										<Text
											style={{
												fontSize: 16,
												color:
													tab === key
														? theme.colors.onSurface
														: theme.colors.onSurfaceVariant,
											}}
										>
											{title} <Text style={{ fontSize: 12 }}>{count}</Text>
										</Text>
									</View>
								</TouchableRipple>
							))}
						</View>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'space-between',
								flexWrap: 'wrap',
								paddingVertical: 8,
							}}
						>
							<View
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									flexShrink: 1,
								}}
							>
								<PlaybackModeButton showLabel />
								<TouchableRipple
									onPress={() => {
										stopAutoScroll()
										dragRef.current = null
										setDrag(null)
										setTab(tab === 'random' ? 'queue' : 'random')
										setDidInitialScroll(false)
									}}
									accessibilityLabel='查看随机播放历史'
								>
									<Text
										style={{
											padding: 8,
											fontSize: 13,
											color:
												tab === 'random'
													? '#20c997'
													: theme.colors.onSurfaceVariant,
										}}
									>
										随机历史 ›
									</Text>
								</TouchableRipple>
							</View>
							<View style={{ flexDirection: 'row' }}>
								<IconButton
									icon='download-outline'
									size={22}
									accessibilityLabel='下载队列歌曲'
									disabled={!queue.length}
									onPress={() =>
										dismissWithAction(() => {
											void requestDownloads(queue).catch((error: unknown) =>
												toastAndLogError('下载队列失败', error, 'Player.Queue'),
											)
										})
									}
								/>
								<IconButton
									icon='plus-box-outline'
									size={22}
									accessibilityLabel='将队列加入歌单'
									disabled={!queue.length}
									onPress={saveQueueToPlaylistHandler}
								/>
								<IconButton
									icon='trash-can-outline'
									size={22}
									accessibilityLabel='清空播放队列'
									disabled={clearing || !queue.length}
									onPress={clearQueue}
								/>
							</View>
						</View>
					</View>
					<View
						style={{
							flex: 1,
							minHeight: 2,
							overflow: 'hidden',
							paddingBottom: insets.bottom,
						}}
						onLayout={(event) => {
							listHeightRef.current = event.nativeEvent.layout.height
						}}
					>
						{tab !== 'queue' ? (
							<QueueHistoryPanel
								key={tab}
								mode={tab}
								listRef={flatListRef}
								dismissWithAction={dismissWithAction}
							/>
						) : (
							<LegendList
								ref={flatListRef}
								key='queue'
								data={queue}
								extraData={currentTrackId}
								ListEmptyComponent={
									<Text
										style={{
											textAlign: 'center',
											padding: 32,
											color: theme.colors.onSurfaceVariant,
										}}
									>
										队列为空，选择一首音乐开始播放
									</Text>
								}
								renderItem={renderItem}
								keyExtractor={keyExtractor}
								recycleItems
								showsVerticalScrollIndicator={false}
								nestedScrollEnabled
								scrollEnabled={drag === null}
								onScroll={(event) => {
									scrollOffsetRef.current = event.nativeEvent.contentOffset.y
									if (dragRef.current)
										updateDropTarget(dragTranslationRef.current)
								}}
								onContentSizeChange={(_width, height) => {
									contentHeightRef.current = height
								}}
							/>
						)}
						{drag && (
							<Animated.View
								pointerEvents='none'
								style={[
									{
										position: 'absolute',
										left: 16,
										right: 16,
										top: 0,
										height: 3,
										borderRadius: 2,
										backgroundColor: theme.colors.primary,
										zIndex: 1,
									},
									lineStyle,
								]}
							/>
						)}
						{drag && queue[drag.from] && (
							<Animated.View
								pointerEvents='none'
								style={[
									{
										position: 'absolute',
										left: 0,
										right: 0,
										top: 0,
										height: ROW_HEIGHT,
										justifyContent: 'center',
										paddingHorizontal: 16,
										backgroundColor: Color(theme.colors.elevation.level5)
											.alpha(0.82)
											.rgb()
											.string(),
										elevation: 8,
										zIndex: 2,
									},
									ghostStyle,
								]}
							>
								<Text
									variant='bodyMedium'
									numberOfLines={1}
								>
									{queue[drag.from].title}
								</Text>
								<Text
									variant='bodySmall'
									numberOfLines={1}
								>
									{queue[drag.from].artist ?? '未知作者'}
								</Text>
							</Animated.View>
						)}
					</View>
				</View>
			</GestureHandlerRootView>
		</TrueSheet>
	)
}

export default PlayerQueueModal
