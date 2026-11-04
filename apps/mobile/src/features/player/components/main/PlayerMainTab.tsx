import { Show } from '@legendapp/state/react'
import type { ImageRef } from 'expo-image'
import { useRouter } from 'expo-router'
import { memo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PlayerControls } from '@/features/player/components/controls/PlayerControls'
import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { playbackContextStore$ } from '@/hooks/stores/playbackContextStore'
import { usePlayerQueueSheetStore } from '@/hooks/stores/usePlayerQueueSheetStore'
import * as Haptics from '@/utils/haptics'

import PlayerActions from './PlayerActions'
import { PlayerSlider } from './PlayerSlider'
import { TrackInfo } from './PlayerTrackInfo'

interface PlayerMainTabProps {
	jumpTo: (key: string) => void
	imageRef: ImageRef | null
	onPresent: () => void
	onMorePress: () => void
}

const PlayerMainTab = memo(function PlayerMainTab({
	jumpTo,
	imageRef,
	onPresent,
	onMorePress,
}: PlayerMainTabProps) {
	const [viewportHeight, setViewportHeight] = useState(700)
	const router = useRouter()
	const insets = useSafeAreaInsets()
	const currentTrack = useCurrentTrack()

	if (!currentTrack) return null
	return (
		<Show if={playbackContextStore$.ready}>
			<ScrollView
				onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
				contentContainerStyle={styles.container}
				showsVerticalScrollIndicator={false}
			>
				<TrackInfo
					maxCoverSize={Math.max(150, viewportHeight - 340)}
					onArtistPress={() =>
						currentTrack.artist?.remoteId
							? router.navigate({
									pathname: '/playlist/remote/uploader/[mid]',
									params: { mid: currentTrack.artist?.remoteId },
								})
							: void 0
					}
					onPressCover={() => {
						void Haptics.performHaptics(Haptics.AndroidHaptics.Context_Click)
						jumpTo('lyrics')
					}}
					coverRef={imageRef}
				/>

				<View
					style={[
						{ paddingBottom: Math.max(insets.bottom + 8, 20) },
						styles.controlsContainer,
					]}
				>
					<PlayerActions onMorePress={onMorePress} />
					<PlayerSlider />
					<PlayerControls
						onOpenQueue={() => {
							onPresent()
							void usePlayerQueueSheetStore.getState().open()
						}}
					/>
				</View>
			</ScrollView>
		</Show>
	)
})

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		justifyContent: 'space-between',
	},
	controlsContainer: {
		paddingHorizontal: 24,
	},
})

PlayerMainTab.displayName = 'PlayerMainTab'
export default PlayerMainTab
