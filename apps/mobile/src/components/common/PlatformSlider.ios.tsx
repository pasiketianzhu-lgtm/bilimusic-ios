import { Host, Slider } from '@expo/ui/swift-ui'
import { disabled, tint } from '@expo/ui/swift-ui/modifiers'
import type { WavySliderProps } from 'expo-wavy-slider'
import { useCallback, useRef, useState } from 'react'
import { useAnimatedReaction } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

export default function PlatformSlider({
	style,
	progress,
	value = 0,
	min = 0,
	max = 1,
	lowerLimit,
	upperLimit,
	enabled = true,
	colors,
	onValueChange,
	onValueChangeFinished,
	onDragStateChange,
}: WavySliderProps) {
	const [displayValue, setDisplayValue] = useState(value)
	const editing = useRef(false)
	const latestValue = useRef(value)
	const updateProgress = useCallback((nextValue: number) => {
		if (editing.current) return
		latestValue.current = nextValue
		setDisplayValue(nextValue)
	}, [])

	useAnimatedReaction(
		() => Math.round((progress?.value ?? value) * 200) / 200,
		(nextValue, previousValue) => {
			if (nextValue !== previousValue) scheduleOnRN(updateProgress, nextValue)
		},
		[progress, value, updateProgress],
	)

	return (
		<Host
			style={style}
			matchContents={{ vertical: true }}
			ignoreSafeArea='all'
		>
			<Slider
				value={displayValue}
				min={min}
				max={max}
				lowerLimit={lowerLimit}
				upperLimit={upperLimit}
				modifiers={[
					disabled(!enabled),
					...(typeof colors?.activeTrackColor === 'string'
						? [tint(colors.activeTrackColor)]
						: []),
				]}
				onValueChange={(nextValue) => {
					latestValue.current = nextValue
					setDisplayValue(nextValue)
					onValueChange?.(nextValue)
				}}
				onEditingChanged={(isEditing) => {
					editing.current = isEditing
					if (!isEditing) onValueChangeFinished?.(latestValue.current)
					onDragStateChange?.(isEditing)
				}}
			/>
		</Host>
	)
}
