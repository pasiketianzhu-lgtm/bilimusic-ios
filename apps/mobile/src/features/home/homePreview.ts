export interface HomePlaylistPreview {
	id: number
	title: string
	isPinned: boolean
	updatedAt: Date
}

export function selectHomePlaylists<T extends HomePlaylistPreview>(
	playlists: readonly T[],
	limit = 6,
): T[] {
	return [...playlists]
		.sort((a, b) => {
			if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
			return b.updatedAt.getTime() - a.updatedAt.getTime()
		})
		.slice(0, limit)
}
