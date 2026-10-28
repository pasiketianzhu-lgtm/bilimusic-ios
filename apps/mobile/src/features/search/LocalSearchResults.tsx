import { useQuery } from '@tanstack/react-query'
import { like, or } from 'drizzle-orm'
import { useRouter } from 'expo-router'
import { ScrollView } from 'react-native'
import { List, Text } from 'react-native-paper'

import { useSearchPlaylists } from '@/hooks/queries/db/playlist'
import db from '@/lib/db/db'
import * as schema from '@/lib/db/schema'
import { trackService } from '@/lib/services/trackService'
import { addToQueue } from '@/utils/player'

export default function LocalSearchResults({ query }: { query: string }) {
	const router = useRouter()
	const term = query.trim()
	const playlists = useSearchPlaylists(term, Boolean(term))
	const tracks = useQuery({
		queryKey: ['db', 'local-search', term],
		networkMode: 'always',
		enabled: Boolean(term),
		queryFn: async () => {
			const authors = db
				.select({ id: schema.artists.id })
				.from(schema.artists)
				.where(like(schema.artists.name, `%${term}%`))
			const rows = await db.query.tracks.findMany({
				where: (track, { inArray }) =>
					or(like(track.title, `%${term}%`), inArray(track.artistId, authors)),
				with: { artist: true, bilibiliMetadata: true, localMetadata: true },
				limit: 20,
			})
			return rows
				.map((row) => trackService.formatTrack(row))
				.filter((track) => track !== null && track !== undefined)
		},
	})
	if (!term) return null
	return (
		<ScrollView
			style={{ maxHeight: 240 }}
			keyboardShouldPersistTaps='handled'
		>
			<Text variant='labelLarge'>本地音乐库</Text>
			{playlists.data?.slice(0, 5).map((playlist) => (
				<List.Item
					key={`p-${playlist.id}`}
					title={playlist.title}
					description='歌单'
					left={(props) => (
						<List.Icon
							{...props}
							icon='playlist-music'
						/>
					)}
					onPress={() => router.navigate(`/playlist/local/${playlist.id}`)}
				/>
			))}
			{tracks.data?.map((track) => (
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
							tracks: [track],
							clearQueue: true,
							playNow: true,
							playNext: false,
						})
					}}
				/>
			))}
			{tracks.data?.length === 0 && playlists.data?.length === 0 && (
				<Text>本地暂无匹配内容，可继续搜索 B 站</Text>
			)}
		</ScrollView>
	)
}
