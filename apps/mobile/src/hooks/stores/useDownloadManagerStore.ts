import type { DownloadState } from '@bbplayer/orpheus'
import { Orpheus } from '@bbplayer/orpheus'

import { orpheusQueryKeys } from '@/hooks/queries/orpheus'
import { queryClient } from '@/lib/config/queryClient'
import createStickyEmitter from '@/utils/sticky-mitt'

export type ProgressEvent = Record<
	`progress:${string}`,
	{
		current: number
		total: number
		percent: number
		state: DownloadState
	}
>
export const eventListner = createStickyEmitter<ProgressEvent>()
const states = new Map<string, DownloadState>()

// Dispatch event to each task
Orpheus.addListener('onDownloadUpdated', (event) => {
	if (states.get(event.id) !== event.state) {
		states.set(event.id, event.state)
		void queryClient.invalidateQueries({ queryKey: orpheusQueryKeys.all })
	}
	const eventKey = `progress:${event.id}` as const
	eventListner.emit(eventKey, {
		current: event.bytesDownloaded,
		total: event.contentLength,
		percent: event.percentDownloaded,
		state: event.state,
	})
})
