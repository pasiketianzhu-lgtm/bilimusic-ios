import { Orpheus } from '@bbplayer/orpheus'
import { Platform } from 'react-native'

import IconButton from '@/components/common/IconButton'
import { alert } from '@/components/modals/AlertModal'
import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { queryClient } from '@/lib/config/queryClient'
import { toastAndLogError } from '@/utils/error-handling'

export default function DislikeTrackButton() {
	const track = useCurrentTrack()
	if (!track || Platform.OS !== 'ios') return null
	const exclude = async () => {
		try {
			const behavior = await Orpheus.getTrackBehavior(
				track.uniqueKey,
				track.duration ?? 0,
			)
			await Orpheus.setTrackBehavior(track.uniqueKey, false, behavior.resume)
			await queryClient.invalidateQueries({
				queryKey: ['track-behavior', track.uniqueKey],
			})
			const current = await Orpheus.getCurrentTrack()
			if (current?.id === track.uniqueKey) await Orpheus.skipToNext()
		} catch (error) {
			toastAndLogError('跳过歌曲失败', error, 'Player.Dislike')
		}
	}
	return (
		<IconButton
			icon='heart-off-outline'
			size={26}
			accessibilityLabel='不喜欢这首歌'
			onPress={() =>
				alert(
					'不喜欢这首歌',
					'跳过并关闭它的随机播放资格。可在更多选项中重新开启“参与随机播放”。',
					[
						{ text: '取消' },
						{ text: '跳过并排除', onPress: () => void exclude() },
					],
				)
			}
		/>
	)
}
