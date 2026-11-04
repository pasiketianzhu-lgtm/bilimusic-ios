import { Orpheus, RepeatMode } from '@bbplayer/orpheus'
import { useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { Text, TouchableRipple, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import IconButton from '@/components/common/IconButton'
import {
	setPlayerRepeatMode,
	setPlayerShuffleMode,
	usePlaybackOptions,
} from '@/hooks/player/usePlaybackOptions'
import { toastAndLogError } from '@/utils/error-handling'

export default function PlaybackModeButton({
	showLabel = false,
}: {
	showLabel?: boolean
}) {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const { shuffle, repeat } = usePlaybackOptions()
	const [visible, setVisible] = useState(false)
	const [pending, setPending] = useState(false)
	const label = shuffle
		? '随机播放'
		: repeat === RepeatMode.TRACK
			? '单曲循环'
			: repeat === RepeatMode.QUEUE
				? '列表循环'
				: '顺序播放'
	const icon = shuffle
		? 'shuffle-variant'
		: repeat === RepeatMode.TRACK
			? 'repeat-once'
			: repeat === RepeatMode.QUEUE
				? 'repeat'
				: 'arrow-right'
	const run = async (action: () => Promise<unknown>) => {
		setPending(true)
		try {
			await action()
		} catch (error) {
			toastAndLogError('修改播放方式失败', error, 'Player.Mode')
		} finally {
			setPending(false)
		}
	}
	const option = (
		title: string,
		selected: boolean,
		action: () => Promise<unknown>,
	) => (
		<TouchableRipple
			key={title}
			disabled={pending}
			onPress={() => void run(action)}
			accessibilityRole='radio'
			accessibilityState={{ checked: selected, disabled: pending }}
		>
			<View
				style={{
					paddingVertical: 15,
					paddingHorizontal: 24,
					flexDirection: 'row',
					justifyContent: 'space-between',
				}}
			>
				<Text
					style={{
						fontSize: 16,
						color: selected ? colors.primary : colors.onSurface,
					}}
				>
					{title}
				</Text>
				<Text style={{ color: colors.primary }}>{selected ? '✓' : ''}</Text>
			</View>
		</TouchableRipple>
	)
	return (
		<>
			{showLabel ? (
				<TouchableRipple
					onPress={() => setVisible(true)}
					accessibilityLabel={`播放方式，${label}`}
				>
					<View style={{ flexDirection: 'row', alignItems: 'center' }}>
						<IconButton
							icon={icon}
							size={22}
							onPress={() => setVisible(true)}
						/>
						<Text style={{ color: colors.onSurfaceVariant, fontSize: 14 }}>
							{label}
						</Text>
					</View>
				</TouchableRipple>
			) : (
				<IconButton
					icon={icon}
					size={26}
					accessibilityLabel={`播放方式，${label}`}
					onPress={() => setVisible(true)}
				/>
			)}
			<Modal
				visible={visible}
				transparent
				animationType='slide'
				onRequestClose={() => setVisible(false)}
			>
				<View style={{ flex: 1, justifyContent: 'flex-end' }}>
					<Pressable
						accessibilityLabel='关闭播放方式'
						onPress={() => setVisible(false)}
						style={{
							position: 'absolute',
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							backgroundColor: '#0008',
						}}
					/>
					<View
						accessibilityViewIsModal
						style={{
							backgroundColor: colors.elevation.level2,
							borderTopLeftRadius: 24,
							borderTopRightRadius: 24,
							paddingTop: 20,
							paddingBottom: Math.max(insets.bottom, 20),
						}}
					>
						<Text
							style={{
								fontSize: 19,
								fontWeight: '600',
								paddingHorizontal: 24,
								marginBottom: 12,
							}}
						>
							播放方式
						</Text>
						{option('顺序播放', !shuffle, () => setPlayerShuffleMode(false))}
						{option('随机播放', shuffle, () => setPlayerShuffleMode(true))}
						{option('倒序剩余歌曲', false, async () => {
							await setPlayerShuffleMode(false)
							await Orpheus.reverseRemainingQueue()
						})}
						<Text
							style={{
								marginHorizontal: 24,
								marginTop: 16,
								marginBottom: 4,
								color: colors.onSurfaceVariant,
							}}
						>
							循环方式
						</Text>
						{option('播完停止', repeat === RepeatMode.OFF, () =>
							setPlayerRepeatMode(RepeatMode.OFF),
						)}
						{option('列表循环', repeat === RepeatMode.QUEUE, () =>
							setPlayerRepeatMode(RepeatMode.QUEUE),
						)}
						{option('单曲循环', repeat === RepeatMode.TRACK, () =>
							setPlayerRepeatMode(RepeatMode.TRACK),
						)}
						<TouchableRipple onPress={() => setVisible(false)}>
							<Text
								style={{
									textAlign: 'center',
									padding: 16,
									color: colors.onSurfaceVariant,
								}}
							>
								完成
							</Text>
						</TouchableRipple>
					</View>
				</View>
			</Modal>
		</>
	)
}
