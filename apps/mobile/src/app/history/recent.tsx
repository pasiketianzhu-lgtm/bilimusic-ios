import { useRouter } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { Appbar, useTheme } from 'react-native-paper'

import RecentTracks from '@/features/history/RecentTracks'
import { useNowPlayingBar } from '@/hooks/ui/useNowPlayingBar'

export default function RecentHistoryPage() {
	const router = useRouter()
	const { colors } = useTheme()
	useNowPlayingBar()
	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header>
				<Appbar.BackAction onPress={() => router.back()} />
				<Appbar.Content title='最近播放' />
			</Appbar.Header>
			<ScrollView
				contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
			>
				<RecentTracks />
			</ScrollView>
		</View>
	)
}
