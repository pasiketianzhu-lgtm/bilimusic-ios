import { List } from 'react-native-paper'

import { subtitlesToLrc } from '@/features/player/utils/subtitleLrc'
import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { lyricsQueryKeys } from '@/hooks/queries/lyrics'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { queryClient } from '@/lib/config/queryClient'
import lyricService from '@/lib/services/lyricService'
import { toastAndLogError } from '@/utils/error-handling'

export default function VideoSubtitleAction({
	onAction,
}: {
	onAction: (action: () => void) => void
}) {
	const track = useCurrentTrack()
	if (track?.source !== 'bilibili') return null
	const video = track
	async function load() {
		try {
			let cid = video.bilibiliMetadata.cid
			if (!cid) {
				const pages = await bilibiliApi.getPageList({
					bvid: video.bilibiliMetadata.bvid,
				})
				if (pages.isErr()) throw pages.error
				cid = pages.value[0]?.cid
			}
			if (!cid) throw new Error('视频没有可用分 P')
			const info = await bilibiliApi.getWebPlayerInfo({
				bvid: video.bilibiliMetadata.bvid,
				cid,
			})
			if (info.isErr()) throw info.error
			const subtitles = info.value.subtitle?.subtitles ?? []
			const selected =
				subtitles.find(
					(item) => item.lan === 'zh-CN' || item.lan === 'ai-zh',
				) ?? subtitles[0]
			if (!selected) throw new Error('该视频没有可用字幕，仍可正常播放')
			const url = new URL(
				selected.subtitle_url.startsWith('//')
					? `https:${selected.subtitle_url}`
					: selected.subtitle_url,
			)
			if (
				url.protocol !== 'https:' ||
				!['hdslb.com', 'bilibili.com'].some(
					(host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
				)
			)
				throw new Error('字幕地址无效')
			const response = await fetch(url.href, {
				signal: AbortSignal.timeout(15000),
			})
			if (!response.ok) throw new Error(`字幕读取失败（${response.status}）`)
			const data = (await response.json()) as {
				body?: { from: number; content: string }[]
			}
			if (!Array.isArray(data.body)) throw new Error('字幕内容格式无效')
			const lrc = subtitlesToLrc(data.body)
			if (!lrc) throw new Error('字幕没有可显示的内容')
			const saved = await lyricService.saveLyricsToFile(
				{
					id: video.uniqueKey,
					updateTime: Date.now(),
					lrc,
					manualSkip: false,
					misc: { source: 'video-subtitle' },
				},
				video.uniqueKey,
			)
			if (saved.isErr()) throw saved.error
			await queryClient.invalidateQueries({
				queryKey: lyricsQueryKeys.smartFetchLyrics(video.uniqueKey),
			})
		} catch (error) {
			toastAndLogError('读取视频字幕失败', error, 'Lyrics.Subtitles')
		}
	}
	return (
		<List.Item
			title='使用视频字幕'
			description='将视频字幕作为歌词显示，可能包含对白'
			left={(props) => (
				<List.Icon
					{...props}
					icon='subtitles-outline'
				/>
			)}
			onPress={() =>
				onAction(() => {
					void load()
				})
			}
		/>
	)
}
