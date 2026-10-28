import { useObserve } from 'expo-observe'
import { useFocusEffect, useRouter } from 'expo-router'
import {
	type ComponentRef,
	useCallback,
	useDeferredValue,
	useEffect,
	useRef,
	useState,
} from 'react'
import {
	BackHandler,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	ToastAndroid,
	View,
} from 'react-native'
import { useMMKVObject } from 'react-native-mmkv'
import { List, Searchbar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ActivityIndicator from '@/components/common/ActivityIndicator'
import { alert } from '@/components/modals/AlertModal'
import SkinAppbarBackground from '@/components/navigation/SkinAppbarBackground'
import RecentTracks from '@/features/history/RecentTracks'
import { selectHomePlaylists } from '@/features/home/homePreview'
import LocalSearchResults from '@/features/search/LocalSearchResults'
import SearchHistory, {
	type SearchHistoryItem,
} from '@/features/search/SearchHistory'
import SearchSuggestions from '@/features/search/SearchSuggestions'
import { useIncomingShare } from '@/hooks/app/useIncomingShare'
import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { usePlaylistLists } from '@/hooks/queries/db/playlist'
import useSkinForegroundColor from '@/hooks/theme/useSkinForegroundColor'
import { useNowPlayingBar } from '@/hooks/ui/useNowPlayingBar'
import { markPerfInteractive } from '@/lib/performance'
import { ensureLikedPlaylist } from '@/lib/services/likedPlaylistService'
import { toastAndLogError } from '@/utils/error-handling'
import {
	matchSearchStrategies,
	navigateWithSearchStrategy,
} from '@/utils/search'

const SEARCH_HISTORY_KEY = 'bilibili_search_history'
const MAX_SEARCH_HISTORY = 10

export default function SearchPage() {
	useNowPlayingBar()
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const router = useRouter()
	const haveTrack = useCurrentTrack()
	const headerForegroundColor = useSkinForegroundColor()
	const [searchQuery, setSearchQuery] = useState('')
	const deferredSearchQuery = useDeferredValue(searchQuery)
	const [searchHistory, setSearchHistory] =
		useMMKVObject<SearchHistoryItem[]>(SEARCH_HISTORY_KEY)
	const [isLoading, setIsLoading] = useState(false)
	const [searchFocused, setSearchFocused] = useState(false)
	const suggestionsVisible =
		searchFocused &&
		searchQuery.trim().length > 0 &&
		deferredSearchQuery.trim().length > 0
	const searchBarRef = useRef<ComponentRef<typeof Searchbar>>(null)
	const dismissPanel = useCallback(() => {
		setSearchFocused(false)
		searchBarRef.current?.blur()
		Keyboard.dismiss()
	}, [])
	useFocusEffect(
		useCallback(() => {
			const backSubscription = BackHandler.addEventListener(
				'hardwareBackPress',
				() => {
					if (!searchFocused) return false
					dismissPanel()
					return true
				},
			)
			// Android 在输入法打开时会先由系统处理返回键，此时仍需收起面板。
			const keyboardSubscription = Keyboard.addListener(
				'keyboardDidHide',
				dismissPanel,
			)
			return () => {
				backSubscription.remove()
				keyboardSubscription.remove()
			}
		}, [dismissPanel, searchFocused]),
	)
	useFocusEffect(useCallback(() => () => dismissPanel(), [dismissPanel]))
	const [contentHeight, setContentHeight] = useState(0)
	const contentBottomPadding = haveTrack ? 86 : 24
	const { resolvedSharedPayloads, isResolving, clearSharedPayloads } =
		useIncomingShare()
	const { markInteractive } = useObserve()
	const { data: playlists = [] } = usePlaylistLists()
	const homePlaylists = selectHomePlaylists(playlists, 6)
	useEffect(() => {
		markInteractive()
		void markPerfInteractive()
	}, [markInteractive])

	const saveSearchHistory = useCallback(
		(history: SearchHistoryItem[]) => {
			try {
				setSearchHistory(history)
			} catch (error) {
				toastAndLogError('保存搜索历史失败', error, 'UI.Search')
			}
		},
		[setSearchHistory],
	)

	const addSearchHistory = useCallback(
		(query: string) => {
			if (!query.trim()) return

			const newItem: SearchHistoryItem = {
				id: `history_${Date.now()}`,
				text: query,
				timestamp: Date.now(),
			}

			const currentHistory = searchHistory ?? []
			const existingIndex = currentHistory.findIndex(
				(item) => item.text.toLowerCase() === query.toLowerCase(),
			)

			let newHistory: SearchHistoryItem[]

			if (existingIndex !== -1) {
				newHistory = [
					newItem,
					...currentHistory.filter(
						(item) => item.text.toLowerCase() !== query.toLowerCase(),
					),
				]
			} else {
				newHistory = [newItem, ...currentHistory]
			}

			if (newHistory.length > MAX_SEARCH_HISTORY) {
				newHistory = newHistory.slice(0, MAX_SEARCH_HISTORY)
			}

			saveSearchHistory(newHistory)
		},
		[searchHistory, saveSearchHistory],
	)

	const handleEnter = useCallback(
		async (query: string) => {
			if (!query.trim()) return
			dismissPanel()
			setIsLoading(true)
			try {
				const result = await matchSearchStrategies(query)
				if (navigateWithSearchStrategy(result, router) === 1) {
					addSearchHistory(query)
				}
				setSearchQuery('')
			} catch (error) {
				toastAndLogError('搜索失败，请重试', error, 'UI.Search')
			} finally {
				setIsLoading(false)
			}
		},
		[addSearchHistory, dismissPanel, router],
	)

	const handleSuggestionPress = useCallback(
		(query: string) => {
			void handleEnter(query)
		},
		[handleEnter],
	)

	const handleClearHistory = useCallback(() => {
		alert(
			'清空搜索历史？',
			'确定要清空吗？',
			[
				{ text: '取消' },
				{
					text: '确定',
					onPress: () => {
						setSearchHistory([])
					},
				},
			],
			{ cancelable: true },
		)
	}, [setSearchHistory])

	const handleRemoveHistoryItem = useCallback(
		(id: string) => {
			const item = searchHistory?.find((h) => h.id === id)
			if (!item) return
			alert(
				'删除搜索历史？',
				`确定要删除「${item.text}」吗？`,
				[
					{ text: '取消' },
					{
						text: '确定',
						onPress: () => {
							const newHistory = searchHistory?.filter((h) => h.id !== id)
							setSearchHistory(newHistory)
						},
					},
				],
				{ cancelable: true },
			)
		},
		[searchHistory, setSearchHistory],
	)

	useEffect(() => {
		if (resolvedSharedPayloads.length === 0) return
		if (resolvedSharedPayloads.length > 1) {
			if (Platform.OS === 'android') {
				ToastAndroid.show('收到多个共享内容，已忽略', ToastAndroid.SHORT)
			} else {
				alert(
					'收到多个共享内容，已忽略',
					'当前版本仅支持处理单个共享内容，已忽略其他内容',
					[{ text: '确定' }],
				)
			}
		}
		const data = resolvedSharedPayloads[0]
		let query: string | undefined
		if (data.shareType === 'text') {
			query = data.value
		}
		if (!query) {
			clearSharedPayloads()
			return
		}

		clearSharedPayloads()
		void handleEnter(query)
	}, [resolvedSharedPayloads, clearSharedPayloads, handleEnter])

	return (
		<KeyboardAvoidingView
			style={[styles.container, { backgroundColor: colors.background }]}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<SkinAppbarBackground height={insets.top + 100} />
			{searchFocused && (
				<Pressable
					style={StyleSheet.absoluteFill}
					onPress={dismissPanel}
					accessibilityLabel='收起搜索建议'
					testID='search-panel-backdrop'
				/>
			)}
			<View
				pointerEvents='none'
				style={[styles.header, { paddingTop: insets.top + 8 }]}
			>
				<Text
					variant='headlineSmall'
					style={[styles.title, { color: headerForegroundColor }]}
				>
					首页
				</Text>
			</View>
			<View
				pointerEvents='box-none'
				style={styles.searchbarContainer}
			>
				<Searchbar
					ref={searchBarRef}
					placeholder='关键词 / b23.tv / 视频链接 / av / BV'
					value={searchQuery}
					onChangeText={setSearchQuery}
					onSubmitEditing={() => void handleEnter(searchQuery)}
					onIconPress={() => void handleEnter(searchQuery)}
					onClearIconPress={() => setSearchQuery('')}
					onFocus={() => setSearchFocused(true)}
					onBlur={() => setSearchFocused(false)}
					loading={isLoading}
					editable={!isLoading}
					returnKeyType='search'
					elevation={0}
					mode='bar'
					style={[styles.searchbar, { backgroundColor: colors.surfaceVariant }]}
					testID='search-bar'
				/>
			</View>
			<View
				pointerEvents='box-none'
				style={[styles.content, { paddingBottom: contentBottomPadding }]}
				onLayout={({ nativeEvent }) =>
					setContentHeight(nativeEvent.layout.height)
				}
			>
				{!searchFocused && searchQuery.length === 0 && (
					<ScrollView
						contentContainerStyle={styles.homePreview}
						showsVerticalScrollIndicator={false}
					>
						<List.Item
							title='我喜欢'
							description='收藏的音乐，随时听'
							left={(props) => (
								<List.Icon
									{...props}
									icon='heart'
								/>
							)}
							onPress={() => {
								void ensureLikedPlaylist()
									.then((id) => router.navigate(`/playlist/local/${id}`))
									.catch((error: unknown) =>
										toastAndLogError('打开我喜欢失败', error, 'Home'),
									)
							}}
						/>
						<View style={styles.sectionHeader}>
							<Text
								variant='titleMedium'
								style={styles.sectionTitle}
							>
								我的歌单
							</Text>
							<Pressable onPress={() => router.navigate('/library/0')}>
								<Text style={{ color: colors.primary }}>查看全部</Text>
							</Pressable>
						</View>
						{homePlaylists.length === 0 ? (
							<List.Item
								title='创建你的第一个歌单'
								description='把喜欢的 B 站音乐整理到一起'
								left={(props) => (
									<List.Icon
										{...props}
										icon='playlist-plus'
									/>
								)}
								onPress={() => router.navigate('/library/0')}
							/>
						) : (
							homePlaylists.map((playlist) => (
								<List.Item
									key={playlist.id}
									title={playlist.title}
									description={`${playlist.itemCount} 首歌曲`}
									left={(props) => (
										<List.Icon
											{...props}
											icon={playlist.isPinned ? 'pin' : 'playlist-music'}
										/>
									)}
									right={(props) => (
										<List.Icon
											{...props}
											icon='chevron-right'
										/>
									)}
									onPress={() =>
										router.navigate(`/playlist/local/${playlist.id}`)
									}
								/>
							))
						)}
						<List.Item
							title='最近播放'
							description='继续上次的音乐'
							left={(props) => (
								<List.Icon
									{...props}
									icon='history'
								/>
							)}
							right={(props) => (
								<List.Icon
									{...props}
									icon='chevron-right'
								/>
							)}
							onPress={() => router.navigate('/history/recent')}
						/>
						<RecentTracks limit={3} />
					</ScrollView>
				)}
				{isResolving ? (
					<ActivityIndicator style={styles.resolving} />
				) : searchFocused ? (
					<>
						<SearchHistory
							searchHistory={searchHistory}
							onHistoryPress={handleSuggestionPress}
							onClearHistory={handleClearHistory}
							onRemoveHistoryItem={handleRemoveHistoryItem}
							onDismiss={dismissPanel}
							panelVisible={suggestionsVisible}
						/>
						<View
							pointerEvents='box-none'
							style={styles.suggestions}
						>
							<LocalSearchResults query={deferredSearchQuery} />
							<SearchSuggestions
								query={deferredSearchQuery}
								visible={suggestionsVisible}
								availableHeight={Math.max(
									100,
									contentHeight - contentBottomPadding - 240,
								)}
								onSuggestionPress={handleSuggestionPress}
							/>
						</View>
					</>
				) : null}
			</View>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: { paddingHorizontal: 16, paddingBottom: 16, minHeight: 56 },
	title: { fontWeight: 'bold' },
	searchbarContainer: { paddingHorizontal: 16, paddingBottom: 16 },
	searchbar: { borderRadius: 9999 },
	content: { flex: 1, paddingHorizontal: 16 },
	homePreview: { paddingBottom: 24 },
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	sectionTitle: { fontWeight: 'bold' },
	suggestions: { position: 'absolute', top: 0, left: 16, right: 16, zIndex: 1 },
	resolving: { flex: 1 },
})
