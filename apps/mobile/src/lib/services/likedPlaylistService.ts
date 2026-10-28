import { and, eq, sql } from 'drizzle-orm'

import db from '@/lib/db/db'
import * as schema from '@/lib/db/schema'
import { playlistService } from '@/lib/services/playlistService'

let creating: Promise<number> | undefined

export async function findLikedPlaylist() {
	return db.query.playlists.findFirst({
		where: and(
			eq(schema.playlists.type, 'local'),
			eq(schema.playlists.systemKey, 'liked'),
		),
	})
}

export function ensureLikedPlaylist(): Promise<number> {
	if (creating) return creating
	creating = (async () => {
		const existing = await findLikedPlaylist()
		if (existing) return existing.id
		const result = await playlistService.createPlaylist({
			title: '我喜欢',
			type: 'local',
			systemKey: 'liked',
		})
		if (result.isErr()) throw result.error
		return result.value.id
	})().finally(() => {
		creating = undefined
	})
	return creating
}

export async function isTrackLiked(trackId: number): Promise<boolean> {
	const playlist = await findLikedPlaylist()
	if (!playlist) return false
	return Boolean(
		await db.query.playlistTracks.findFirst({
			where: and(
				eq(schema.playlistTracks.playlistId, playlist.id),
				eq(schema.playlistTracks.trackId, trackId),
			),
		}),
	)
}

export async function setTrackLiked(
	trackId: number,
	liked: boolean,
): Promise<void> {
	const playlistId = await ensureLikedPlaylist()
	if (liked) {
		const result = await playlistService.addManyTracksToLocalPlaylist(
			playlistId,
			[trackId],
		)
		if (result.isErr()) throw result.error
		return
	}
	await db.transaction(async (tx) => {
		const removed = await tx
			.delete(schema.playlistTracks)
			.where(
				and(
					eq(schema.playlistTracks.playlistId, playlistId),
					eq(schema.playlistTracks.trackId, trackId),
				),
			)
			.returning()
		if (removed.length)
			await tx
				.update(schema.playlists)
				.set({
					itemCount: sql`MAX(0, ${schema.playlists.itemCount} - ${removed.length})`,
				})
				.where(eq(schema.playlists.id, playlistId))
	})
}
