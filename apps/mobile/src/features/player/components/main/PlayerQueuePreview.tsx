import { Orpheus } from '@bbplayer/orpheus'
import { LegendList } from '@legendapp/list/react-native'
import { StyleSheet, View } from 'react-native'
import { Divider, Surface, Text, useTheme } from 'react-native-paper'

import useCurrentTrackId from '@/hooks/player/useCurrentTrackId'
import { usePlayerQueueStore } from '@/hooks/stores/usePlayerQueueStore'

/** Compact queue used beside the player on wide iPad screens. */
export default function PlayerQueuePreview() {
	const { colors } = useTheme()
	const queue = usePlayerQueueStore((state) => state.tracks)
	const currentTrackId = useCurrentTrackId()

	return (
		<Surface style={[styles.container, { backgroundColor: colors.surface }]} elevation={1}>
			<Text variant='titleMedium' style={styles.title}>播放队列</Text>
			<LegendList
				data={queue}
				keyExtractor={(item) => item.id}
				renderItem={({ item, index }) => {
					const active = item.id === currentTrackId
					return (
						<>
							<Surface
								style={[styles.row, active && { backgroundColor: colors.secondaryContainer }]}
								elevation={0}
								onTouchEnd={() => void Orpheus.skipTo(index)}
							>
								<Text style={[styles.index, { color: colors.onSurfaceVariant }]}>{index + 1}</Text>
								<View style={styles.labels}>
									<Text numberOfLines={1} style={active && styles.active}>{item.title}</Text>
									<Text numberOfLines={1} variant='bodySmall' style={{ color: colors.onSurfaceVariant }}>
										{item.artist ?? '未知作者'}
									</Text>
								</View>
							</Surface>
							<Divider />
						</>
					)
				}}
				contentContainerStyle={styles.list}
				showsVerticalScrollIndicator={false}
			/>
		</Surface>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, minWidth: 220, maxWidth: 340, borderRadius: 16, overflow: 'hidden' },
	title: { fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
	list: { paddingBottom: 16 },
	row: { minHeight: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
	index: { width: 24, textAlign: 'center' },
	labels: { flex: 1 },
	active: { fontWeight: 'bold' },
})
