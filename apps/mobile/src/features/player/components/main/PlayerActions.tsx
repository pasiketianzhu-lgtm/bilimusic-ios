import { useRouter } from 'expo-router'
import { View } from 'react-native'

import IconButton from '@/components/common/IconButton'
import { requestDownloads } from '@/features/downloads/requestDownloads'
import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { toastAndLogError } from '@/utils/error-handling'
import { convertToOrpheusTrack } from '@/utils/player'

export default function PlayerActions({
	onMorePress,
}: {
	onMorePress: () => void
}) {
	const track = useCurrentTrack()
	const router = useRouter()
	const open = useModalStore((state) => state.open)
	if (!track) return null
	const download = async () => {
		try {
			const converted = convertToOrpheusTrack(track)
			if (converted.isErr()) throw converted.error
			await requestDownloads([converted.value])
		} catch (error) {
			toastAndLogError('下载失败', error, 'Player.Download')
		}
	}
	return (
		<View
			style={{
				flexDirection: 'row',
				justifyContent: 'space-between',
				paddingHorizontal: 20,
				paddingTop: 12,
				paddingBottom: 10,
			}}
		>
			<IconButton
				icon='playlist-plus'
				size={25}
				accessibilityLabel='加入歌单'
				onPress={() => open('UpdateTrackLocalPlaylists', { track })}
			/>
			<IconButton
				icon='download-outline'
				size={25}
				accessibilityLabel='下载音轨'
				onPress={() => void download()}
			/>
			<IconButton
				icon='comment-text-outline'
				size={24}
				accessibilityLabel='查看评论'
				disabled={track.source !== 'bilibili'}
				onPress={() => {
					if (track.source === 'bilibili')
						router.navigate({
							pathname: '/comments/[bvid]',
							params: { bvid: track.bilibiliMetadata.bvid },
						})
				}}
			/>
			<IconButton
				icon='share-variant-outline'
				size={24}
				accessibilityLabel='分享歌曲'
				onPress={() => open('SongShare', undefined)}
			/>
			<IconButton
				icon='dots-vertical'
				size={26}
				accessibilityLabel='更多播放选项'
				onPress={onMorePress}
			/>
		</View>
	)
}
