import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { zustandStorage } from '@/utils/mmkv'

interface FailureState {
	failures: Record<string, { message: string; time: number }>
	record: (id: string, message: string) => void
	clear: (id: string) => void
}

export const usePlaybackFailureStore = create<FailureState>()(
	persist(
		(set) => ({
			failures: {},
			record: (id, message) =>
				set((state) => ({
					failures: Object.fromEntries(
						Object.entries({
							...state.failures,
							[id]: { message, time: Date.now() },
						})
							.sort((a, b) => b[1].time - a[1].time)
							.slice(0, 200),
					),
				})),
			clear: (id) =>
				set((state) => {
					const failures = { ...state.failures }
					delete failures[id]
					return { failures }
				}),
		}),
		{
			name: 'playback-failures',
			storage: createJSONStorage(() => zustandStorage),
			partialize: (state) => ({ failures: state.failures }),
		},
	),
)
