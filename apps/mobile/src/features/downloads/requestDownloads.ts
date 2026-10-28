import { DownloadState, Orpheus, type Track } from '@bbplayer/orpheus'
import { Paths } from 'expo-file-system'

import { alert } from '@/components/modals/AlertModal'
import { isLongContent } from '@/lib/services/playlistRules'

import { useDownloadGroups } from './downloadGroups'
import { estimateAudioBytes, hasDownloadSpace } from './downloadPolicy'

export async function requestDownloads(
	input: Track[],
	group?: { id: number; title: string },
): Promise<boolean> {
	const existing = await Orpheus.getDownloads()
	const existingIds = new Set(
		existing.filter((t) => t.state !== DownloadState.FAILED).map((t) => t.id),
	)
	const tracks = [
		...new Map(input.map((track) => [track.id, track])).values(),
	].filter((track) => !existingIds.has(track.id))
	if (!tracks.length) {
		if (group)
			useDownloadGroups.getState().record({
				...group,
				trackIds: [...new Set(input.map((track) => track.id))],
			})
		return false
	}
	const longCount = tracks.filter((track) =>
		isLongContent(track.duration),
	).length
	if (tracks.length > 1 && longCount) {
		const proceed = await new Promise<boolean>((resolve) =>
			alert(
				'下载长内容',
				`本次包含 ${longCount} 个超过 30 分钟的条目，会占用较多空间，是否一起下载？`,
				[
					{ text: '取消', onPress: () => resolve(false) },
					{ text: '一起下载', onPress: () => resolve(true) },
				],
				{ cancelable: false },
			),
		)
		if (!proceed) return false
	}
	const requested = tracks.reduce(
		(bytes, track) => bytes + estimateAudioBytes(track.duration),
		0,
	)
	const pending = existing
		.filter(
			(task) =>
				task.state !== DownloadState.COMPLETED &&
				task.state !== DownloadState.FAILED,
		)
		.reduce(
			(bytes, task) =>
				bytes +
				Math.max(
					0,
					estimateAudioBytes(task.track?.duration) - task.bytesDownloaded,
				),
			0,
		)
	if (!hasDownloadSpace(Paths.availableDiskSpace, requested, pending)) {
		throw new Error(
			`空间不足：本次音轨预计需要 ${(requested / 1048576).toFixed(0)} MB，另需保留现有任务空间和 64 MB 余量。请清理后重试。`,
		)
	}
	await Orpheus.multiDownload(tracks)
	if (group)
		useDownloadGroups.getState().record({
			...group,
			trackIds: [...new Set(input.map((track) => track.id))],
		})
	return true
}
