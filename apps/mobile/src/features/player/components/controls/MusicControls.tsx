import {
	Orpheus,
	PlaybackState,
	useIsPlaying,
	usePlaybackState,
} from '@bbplayer/orpheus'
import { View } from 'react-native'
import { useTheme } from 'react-native-paper'

import ActivityIndicator from '@/components/common/ActivityIndicator'
import IconButton from '@/components/common/IconButton'
import { toastAndLogError } from '@/utils/error-handling'

import PlaybackModeButton from './PlaybackModeButton'

const run = (action: () => Promise<unknown>) => {
	void action().catch((error: unknown) =>
		toastAndLogError('播放操作失败', error, 'Player.Controls'),
	)
}

export function MusicControls({ onOpenQueue }: { onOpenQueue: () => void }) {
	const { colors } = useTheme()
	const playing = useIsPlaying()
	const state = usePlaybackState()

	return (
		<View
			style={{
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				paddingTop: 10,
				paddingBottom: 8,
			}}
		>
			<PlaybackModeButton />
			<IconButton
				icon='skip-previous'
				size={36}
				accessibilityLabel='上一首'
				onPress={() => run(() => Orpheus.skipToPrevious())}
				testID='player-prev'
			/>
			<View
				style={{
					width: 72,
					height: 72,
					borderRadius: 36,
					backgroundColor: colors.primary,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				{state === PlaybackState.BUFFERING ? (
					<ActivityIndicator
						size={32}
						color={colors.onPrimary}
					/>
				) : (
					<IconButton
						icon={playing ? 'pause' : 'play'}
						size={42}
						iconColor={colors.onPrimary}
						accessibilityLabel={playing ? '暂停' : '播放'}
						onPress={() =>
							run(() => (playing ? Orpheus.pause() : Orpheus.play()))
						}
						testID='player-play-pause'
					/>
				)}
			</View>
			<IconButton
				icon='skip-next'
				size={36}
				accessibilityLabel='下一首'
				onPress={() => run(() => Orpheus.skipToNext())}
				testID='player-next'
			/>
			<IconButton
				icon='playlist-play'
				size={28}
				accessibilityLabel='打开播放队列'
				onPress={onOpenQueue}
				testID='player-open-queue'
			/>
		</View>
	)
}
