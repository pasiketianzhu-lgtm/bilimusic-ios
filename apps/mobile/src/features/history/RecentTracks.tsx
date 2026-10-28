import { useQuery } from '@tanstack/react-query'
import { desc, eq, inArray, max } from 'drizzle-orm'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { List, Text } from 'react-native-paper'

import { trackKeys } from '@/hooks/queries/db/track'
import db from '@/lib/db/db'
import * as schema from '@/lib/db/schema'
import { trackService } from '@/lib/services/trackService'
import { addToQueue } from '@/utils/player'

export default function RecentTracks({ limit = 50 }: { limit?: number }) {
	const {
		data: tracks = [],
		refetch,
		isError,
	} = useQuery({
		queryKey: [...trackKeys.history(), 'recent', limit],
		networkMode: 'always',
		queryFn: async () => {
			const ids = await db
				.select({
					id: schema.playHistory.trackId,
					last: max(schema.playHistory.startTime),
				})
				.from(schema.playHistory)
				.innerJoin(
					schema.tracks,
					eq(schema.tracks.id, schema.playHistory.trackId),
				)
				.groupBy(schema.playHistory.trackId)
				.orderBy(desc(max(schema.playHistory.startTime)))
				.limit(limit)
			if (!ids.length) return []
			const rows = await db.query.tracks.findMany({
				where: inArray(
					schema.tracks.id,
					ids.map((item) => item.id),
				),
				with: { artist: true, bilibiliMetadata: true, localMetadata: true },
			})
			return ids
				.map((item) => rows.find((row) => row.id === item.id))
				.flatMap((row) => {
					const track = row ? trackService.formatTrack(row) : null
					return track ? [track] : []
				})
		},
	})
	useFocusEffect(
		useCallback(() => {
			void refetch()
		}, [refetch]),
	)
	return (
		<>
			{tracks.map((track) => (
				<List.Item
					key={track.uniqueKey}
					title={track.title}
					description={track.artist?.name}
					left={(props) => (
						<List.Icon
							{...props}
							icon='music-note'
						/>
					)}
					onPress={() => {
						void addToQueue({
							tracks,
							clearQueue: true,
							startFromKey: track.uniqueKey,
							playNow: true,
							playNext: false,
						})
					}}
				/>
			))}
			{!tracks.length && (
				<Text>
					{isError
						? '读取最近播放失败，请重新进入页面'
						: '播放过的音乐会出现在这里'}
				</Text>
			)}
		</>
	)
}
