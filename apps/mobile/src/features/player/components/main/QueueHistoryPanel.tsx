import { Orpheus, type Track } from '@bbplayer/orpheus'
import { LegendList, type LegendListRef } from '@legendapp/list/react-native'
import { useRouter } from 'expo-router'
import type { RefObject } from 'react'
import { View } from 'react-native'
import { Text, TouchableRipple, useTheme } from 'react-native-paper'

import { useListeningHistoryStore } from '@/hooks/stores/useListeningHistoryStore'
import { enqueueTracks } from '@/lib/player/playbackSession'
import { toastAndLogError } from '@/utils/error-handling'

const replay = async (track: Track) => {
	try {
		const queue = await Orpheus.getQueue()
		const index = queue.findIndex((item) => item.id === track.id)
		if (index >= 0) {
			await Orpheus.skipTo(index)
			await Orpheus.play()
		} else
			await enqueueTracks({
				tracks: [track],
				startFromKey: track.id,
				playNow: true,
			})
	} catch (error) {
		toastAndLogError('播放历史歌曲失败', error, 'Player.History')
	}
}

export default function QueueHistoryPanel({
	mode,
	listRef,
	dismissWithAction,
}: {
	mode: 'history' | 'random' | 'playlists'
	listRef: RefObject<LegendListRef | null>
	dismissWithAction: (action: () => void) => void
}) {
	const { colors } = useTheme()
	const entries = useListeningHistoryStore((state) => state.entries)
	const playlists = useListeningHistoryStore((state) => state.playlists)
	const router = useRouter()

	const empty = (
		<Text
			style={{
				textAlign: 'center',
				padding: 36,
				color: colors.onSurfaceVariant,
			}}
		>
			{mode === 'random'
				? '开启随机播放后，歌曲出现的顺序会记录在这里'
				: mode === 'playlists'
					? '从歌单开始播放后，会记录在这里'
					: '开始听歌后，会记录在这里'}
		</Text>
	)
	if (mode === 'playlists')
		return (
			<LegendList
				ref={listRef}
				data={playlists}
				keyExtractor={(item) => String(item.id)}
				ListEmptyComponent={empty}
				renderItem={({ item }) => (
					<TouchableRipple
						onPress={() =>
							dismissWithAction(() =>
								router.navigate({
									pathname: '/playlist/local/[id]',
									params: { id: item.id },
								}),
							)
						}
					>
						<View style={{ paddingHorizontal: 22, paddingVertical: 20 }}>
							<Text
								numberOfLines={1}
								style={{ fontSize: 17 }}
							>
								{item.title}
							</Text>
						</View>
					</TouchableRipple>
				)}
			/>
		)
	const data =
		mode === 'random'
			? entries.filter((entry) => entry.random)
			: entries.toReversed()
	return (
		<LegendList
			ref={listRef}
			data={data}
			keyExtractor={(entry) => entry.key}
			ListEmptyComponent={empty}
			renderItem={({ item, index }) => (
				<TouchableRipple
					onPress={() => void replay(item.track)}
					accessibilityLabel={`播放 ${item.track.title}`}
				>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							height: 52,
							paddingHorizontal: 20,
							gap: 12,
						}}
					>
						{mode === 'random' && (
							<Text
								style={{
									color: colors.onSurfaceVariant,
									fontSize: 12,
									minWidth: 24,
								}}
							>
								{index + 1}
							</Text>
						)}
						<Text
							numberOfLines={1}
							style={{ flex: 1, fontSize: 16 }}
						>
							{item.track.title}
							<Text style={{ color: colors.onSurfaceVariant, fontSize: 14 }}>
								{' '}
								- {item.track.artist ?? '未知作者'}
							</Text>
						</Text>
					</View>
				</TouchableRipple>
			)}
		/>
	)
}
