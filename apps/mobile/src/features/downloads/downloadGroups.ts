import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { zustandStorage } from '@/utils/mmkv'

export interface DownloadGroup {
	id: number
	title: string
	trackIds: string[]
}
export const useDownloadGroups = create<{
	groups: DownloadGroup[]
	record: (group: DownloadGroup) => void
}>()(
	persist(
		(set) => ({
			groups: [],
			record: (group) =>
				set((state) => ({
					groups: [
						group,
						...state.groups.filter((item) => item.id !== group.id),
					].slice(0, 30),
				})),
		}),
		{
			name: 'download-groups',
			storage: createJSONStorage(() => zustandStorage),
			partialize: (state) => ({ groups: state.groups }),
		},
	),
)
