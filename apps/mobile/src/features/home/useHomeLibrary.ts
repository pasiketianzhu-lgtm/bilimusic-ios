import { useQuery } from '@tanstack/react-query'
import { inArray } from 'drizzle-orm'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

import { playlistKeys } from '@/hooks/queries/db/playlist'
import db from '@/lib/db/db'
import * as schema from '@/lib/db/schema'
import { trackService } from '@/lib/services/trackService'

export function useHomeLibrary() {
	const query = useQuery({
		queryKey: [...playlistKeys.all, 'home-library'],
		networkMode: 'always',
		queryFn: async () => {
			const rows = await db.query.tracks.findMany({
				where: inArray(
					schema.tracks.id,
					db
						.select({ id: schema.playlistTracks.trackId })
						.from(schema.playlistTracks),
				),
				with: { artist: true, bilibiliMetadata: true, localMetadata: true },
			})
			return rows.flatMap((row) => {
				const track = trackService.formatTrack(row)
				return track ? [track] : []
			})
		},
	})
	const { refetch } = query
	useFocusEffect(
		useCallback(() => {
			void refetch()
		}, [refetch]),
	)
	return query
}
