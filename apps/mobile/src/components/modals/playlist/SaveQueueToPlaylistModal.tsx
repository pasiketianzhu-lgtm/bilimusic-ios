import { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { Dialog, RadioButton, TextInput } from 'react-native-paper'

import Button from '@/components/common/Button'
import { playlistKeys, usePlaylistLists } from '@/hooks/queries/db/playlist'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { queryClient } from '@/lib/config/queryClient'
import { playlistFacade } from '@/lib/facades/playlist'
import type { ModalPropsMap } from '@/types/navigation'
import { toastAndLogError } from '@/utils/error-handling'
import Log from '@/utils/log'
import toast from '@/utils/toast'

const logger = Log.extend('SaveQueueToPlaylistModal')

export default function SaveQueueToPlaylistModal({
	trackIds,
}: ModalPropsMap['SaveQueueToPlaylist']) {
	const [name, setName] = useState('')
	const [target, setTarget] = useState('new')
	const { data: playlists = [] } = usePlaylistLists()
	const [loading, setLoading] = useState(false)
	const close = useModalStore((state) => state.close)

	const handleSave = async () => {
		if (loading || (target === 'new' && !name.trim())) return
		setLoading(true)

		const res = await playlistFacade.saveQueueAsPlaylist(
			name,
			trackIds,
			target === 'new' ? undefined : Number(target),
		)

		if (res.isErr()) {
			toastAndLogError(
				'保存播放列表失败',
				res.error,
				'SaveQueueToPlaylistModal',
			)
			setLoading(false)
			return
		}

		logger.info('保存队列到播放列表成功', res.value)
		toast.success('保存队列到播放列表成功')
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: playlistKeys.playlistLists(),
			}),
			queryClient.invalidateQueries({
				queryKey: playlistKeys.playlistContents(res.value),
			}),
			queryClient.invalidateQueries({
				queryKey: playlistKeys.playlistMetadata(res.value),
			}),
		])
		setLoading(false)
		close('SaveQueueToPlaylist')
	}

	return (
		<>
			<Dialog.Title>将队列加入歌单</Dialog.Title>
			<Dialog.Content>
				<ScrollView style={{ maxHeight: 220 }}>
					<RadioButton.Group
						value={target}
						onValueChange={setTarget}
					>
						<RadioButton.Item
							label='新建歌单'
							value='new'
							disabled={loading}
						/>
						{playlists
							.filter(
								(playlist) => playlist.type === 'local' && !playlist.shareId,
							)
							.map((playlist) => (
								<RadioButton.Item
									key={playlist.id}
									label={playlist.title}
									value={String(playlist.id)}
									disabled={loading}
								/>
							))}
					</RadioButton.Group>
				</ScrollView>
				{target === 'new' && (
					<TextInput
						label='播放列表名称'
						value={name}
						onChangeText={setName}
						mode='outlined'
						style={styles.textInput}
					/>
				)}
			</Dialog.Content>
			<Dialog.Actions>
				<Button
					onPress={() => close('SaveQueueToPlaylist')}
					disabled={loading}
				>
					取消
				</Button>
				<Button
					onPress={handleSave}
					loading={loading}
					disabled={loading}
				>
					保存
				</Button>
			</Dialog.Actions>
		</>
	)
}

const styles = StyleSheet.create({
	textInput: {
		backgroundColor: 'transparent',
	},
})
