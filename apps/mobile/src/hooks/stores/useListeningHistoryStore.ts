import type { Track } from '@bbplayer/orpheus'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { zustandStorage } from '@/utils/mmkv'

export interface ListeningEntry {
	key: string
	track: Track
	random: boolean
	startedAt: number
}

interface ListeningHistory {
	entries: ListeningEntry[]
	playlists: { id: number; title: string }[]
	recordTrack: (track: Track, random: boolean, startedAt: number) => void
	recordPlaylist: (id: number, title: string) => void
}

export const useListeningHistoryStore = create<ListeningHistory>()(
	persist(
		(set) => ({
			entries: [],
			playlists: [],
			recordTrack: (track, random, startedAt) =>
				set((state) => ({
					entries: [
						...state.entries,
						{
							key: `${startedAt}-${Math.random().toString(36).slice(2)}-${track.id}`,
							track,
							random,
							startedAt,
						},
					].slice(-2000),
				})),
			recordPlaylist: (id, title) =>
				set((state) => ({
					playlists: [
						{ id, title },
						...state.playlists.filter((item) => item.id !== id),
					].slice(0, 100),
				})),
		}),
		{
			name: 'listening-history-v1',
			storage: createJSONStorage(() => zustandStorage),
			partialize: ({ entries, playlists }) => ({ entries, playlists }),
		},
	),
)
