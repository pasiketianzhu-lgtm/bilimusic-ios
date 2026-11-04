import { parseAndMergeLyrics } from '@bbplayer/splash'
import { useEffect, useMemo, useState } from 'react'
import { Text, TouchableRipple, useTheme } from 'react-native-paper'

import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { useSmartFetchLyrics } from '@/hooks/queries/lyrics'
import playerProgressEmitter from '@/lib/player/progressListener'

export default function PlayerLyricPreview({
	onPress,
}: {
	onPress: () => void
}) {
	const { colors } = useTheme()
	const track = useCurrentTrack()
	const { data: lyrics } = useSmartFetchLyrics(true, track ?? undefined)
	const [position, setPosition] = useState(0)
	useEffect(() => {
		setPosition(0)
		return playerProgressEmitter.subscribe('progress', (event) =>
			setPosition(Math.floor(event.position)),
		)
	}, [track?.uniqueKey])
	const lines = useMemo(() => {
		if (!lyrics?.lrc) return []
		try {
			return parseAndMergeLyrics({
				lrc: lyrics.lrc,
				tlyric: lyrics.tlyric,
				romalrc: lyrics.romalrc,
			})
		} catch {
			return []
		}
	}, [lyrics])
	const time = position - (lyrics?.misc?.userOffset ?? 0)
	const current = lines.findLast((line) => line.startTime / 1000 <= time)
	return (
		<TouchableRipple
			onPress={onPress}
			accessibilityLabel='查看完整歌词'
			style={{ marginTop: 12, paddingVertical: 10 }}
		>
			<Text
				numberOfLines={1}
				style={{ color: colors.onSurfaceVariant, fontSize: 15, lineHeight: 24 }}
			>
				{current?.content ||
					(lines.length ? '轻触查看完整歌词' : '暂无歌词 · 点击搜索歌词')}
			</Text>
		</TouchableRipple>
	)
}
