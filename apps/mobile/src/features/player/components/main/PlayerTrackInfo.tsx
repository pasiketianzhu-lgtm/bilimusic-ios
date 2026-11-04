import { useIsPlaying } from '@bbplayer/orpheus'
import type { ImageRef } from 'expo-image'
import { Image } from 'expo-image'
import { useIsFocused } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text, TouchableRipple, useTheme } from 'react-native-paper'
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'

import DislikeTrackButton from '@/features/player/components/controls/DislikeTrackButton'
import LikeTrackButton from '@/features/player/components/controls/LikeTrackButton'
import useCurrentTrack from '@/hooks/player/useCurrentTrack'

import PlayerLyricPreview from './PlayerLyricPreview'

export function TrackInfo({
	onArtistPress,
	onPressCover,
	coverRef,
	maxCoverSize = 460,
}: {
	onArtistPress: () => void
	onPressCover: () => void
	coverRef: ImageRef | null
	maxCoverSize?: number
}) {
	const { colors } = useTheme()
	const track = useCurrentTrack()
	const playing = useIsPlaying()
	const focused = useIsFocused()
	const [width, setWidth] = useState(320)
	const [expanded, setExpanded] = useState(false)
	const rotation = useSharedValue(0)
	const arm = useSharedValue(-22)
	useEffect(() => {
		if (playing && focused)
			rotation.set(
				withRepeat(
					withTiming(rotation.value + 360, {
						duration: 22000,
						easing: Easing.linear,
					}),
					-1,
					false,
					undefined,
					ReduceMotion.System,
				),
			)
		else cancelAnimation(rotation)
		arm.set(
			withTiming(playing ? 0 : -22, {
				duration: 450,
				reduceMotion: ReduceMotion.System,
			}),
		)
		return () => cancelAnimation(rotation)
	}, [playing, focused, rotation, arm])
	useEffect(() => setExpanded(false), [track?.uniqueKey])
	const discStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}))
	const armStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${arm.value}deg` }],
	}))
	if (!track) return null
	const size = Math.min(460, width * 0.94, maxCoverSize)
	return (
		<View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
			<Pressable
				onPress={onPressCover}
				accessibilityRole='button'
				accessibilityLabel='查看完整歌词'
				style={[styles.artwork, { height: size + 32 }]}
				testID='player-cover'
			>
				<Animated.View
					style={[
						{
							width: size,
							height: size,
							borderRadius: size / 2,
							overflow: 'hidden',
							backgroundColor: '#161725',
						},
						discStyle,
					]}
				>
					<Svg
						width={size}
						height={size}
						viewBox='0 0 400 400'
						style={StyleSheet.absoluteFill}
					>
						<Defs>
							<LinearGradient
								id='vinyl'
								x1='0'
								y1='0'
								x2='1'
								y2='1'
							>
								<Stop
									offset='0'
									stopColor='#171823'
								/>
								<Stop
									offset='.46'
									stopColor='#424367'
								/>
								<Stop
									offset='.64'
									stopColor='#202133'
								/>
								<Stop
									offset='1'
									stopColor='#0d1019'
								/>
							</LinearGradient>
						</Defs>
						<Circle
							cx='200'
							cy='200'
							r='199'
							fill='url(#vinyl)'
							stroke='#6967a3'
							strokeOpacity='.4'
						/>
						{Array.from({ length: 28 }, (_, index) => (
							<Circle
								key={index}
								cx='200'
								cy='200'
								r={108 + index * 3.15}
								fill='none'
								stroke={index % 3 === 0 ? '#9b9bce' : '#080a15'}
								strokeOpacity={index % 3 === 0 ? 0.14 : 0.3}
								strokeWidth='.7'
							/>
						))}
						<Path
							d='M 65 70 Q 200 4 335 70 M 52 325 Q 200 394 348 325'
							fill='none'
							stroke='#b3b2de'
							strokeOpacity='.15'
							strokeWidth='14'
						/>
					</Svg>
					<View
						style={[
							styles.label,
							{
								width: size * 0.53,
								height: size * 0.53,
								borderRadius: size,
								backgroundColor: colors.primaryContainer,
							},
						]}
					>
						{coverRef ? (
							<Image
								source={coverRef}
								style={StyleSheet.absoluteFill}
								contentFit='cover'
								recyclingKey={track.uniqueKey}
							/>
						) : (
							<Text
								style={{
									fontSize: size * 0.14,
									color: colors.onPrimaryContainer,
								}}
							>
								{track.title.charAt(0)}
							</Text>
						)}
					</View>
				</Animated.View>
				<Animated.View
					pointerEvents='none'
					style={[
						styles.arm,
						{ width: size * 0.26, height: size * 0.8 },
						armStyle,
					]}
				>
					<Svg
						width='100%'
						height='100%'
						viewBox='0 0 100 320'
					>
						<Path
							d='M60 30 L60 173 Q60 205 36 232 L11 265'
							fill='none'
							stroke='#101117'
							strokeWidth='17'
						/>
						<Path
							d='M60 30 L60 173 Q60 205 36 232 L11 265'
							fill='none'
							stroke='#77769f'
							strokeWidth='9'
						/>
						<Circle
							cx='60'
							cy='33'
							r='24'
							fill='#60608e'
						/>
						<Circle
							cx='60'
							cy='33'
							r='11'
							fill='#6d6b9a'
						/>
						<Path
							d='M3 258 L21 272 L7 298 L-10 283 Z'
							fill='#8a87bb'
						/>
					</Svg>
				</Animated.View>
			</Pressable>
			<View style={styles.metadata}>
				<View style={styles.titleRow}>
					<TouchableRipple
						style={{ flex: 1 }}
						onPress={() => setExpanded(!expanded)}
						accessibilityLabel='展开歌曲标题'
					>
						<Text
							numberOfLines={expanded ? undefined : 2}
							style={[styles.title, { color: colors.onSurface }]}
						>
							{track.title}
						</Text>
					</TouchableRipple>
					<DislikeTrackButton />
					<LikeTrackButton trackId={track.id} />
				</View>
				<TouchableRipple
					onPress={onArtistPress}
					style={{ alignSelf: 'flex-start' }}
				>
					<Text
						numberOfLines={1}
						style={{
							color: colors.onSurfaceVariant,
							fontSize: 15,
							lineHeight: 28,
						}}
					>
						{track.artist?.name ?? '未知作者'} ›
					</Text>
				</TouchableRipple>
				<PlayerLyricPreview onPress={onPressCover} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	artwork: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
	label: {
		position: 'absolute',
		alignSelf: 'center',
		top: '23.5%',
		overflow: 'hidden',
		alignItems: 'center',
		justifyContent: 'center',
	},
	arm: { position: 'absolute', right: 4, top: 0, transformOrigin: '60% 10%' },
	metadata: { paddingHorizontal: 28 },
	titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	title: { fontSize: 25, lineHeight: 33, fontWeight: '700' },
})
