import type {
	NativeBottomTabNavigationEventMap,
	NativeBottomTabNavigationOptions,
} from '@bottom-tabs/react-navigation'
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation'
import Icon from '@react-native-vector-icons/material-design-icons'
import { withLayoutContext } from 'expo-router'
import type {
	ParamListBase,
	TabNavigationState,
} from 'expo-router/react-navigation'
import { useTheme } from 'react-native-paper'

import { PERSONAL_TABS } from '@/features/home/tabConfig'
import useSkinStore from '@/hooks/stores/useSkinStore'
import useActiveSkin from '@/hooks/theme/useActiveSkin'

const BottomTabNavigator = createNativeBottomTabNavigator().Navigator

const Tabs = withLayoutContext<
	NativeBottomTabNavigationOptions,
	typeof BottomTabNavigator,
	TabNavigationState<ParamListBase>,
	NativeBottomTabNavigationEventMap
>(BottomTabNavigator)

interface nonNullableIcon {
	uri: string
	scale: number
}

const searchIcon = Icon.getImageSourceSync('magnify', 24) as nonNullableIcon
const libraryIcon = Icon.getImageSourceSync('bookshelf', 24) as nonNullableIcon
const downloadIcon = Icon.getImageSourceSync(
	'download-box-outline',
	24,
) as nonNullableIcon
const profileIcon = Icon.getImageSourceSync('account', 24) as nonNullableIcon

export default function TabLayout() {
	const themes = useTheme().colors
	const activeSkin = useActiveSkin()
	const activeSkinIndex = useSkinStore((state) => state.activeSkinIndex)
	const skinIcons = activeSkin?.skins[activeSkinIndex]?.tabBar.icons
	const useSkinTabs = Boolean(
		skinIcons?.home.default &&
		skinIcons.home.selected &&
		skinIcons.library.default &&
		skinIcons.library.selected &&
		skinIcons.settings.default &&
		skinIcons.settings.selected,
	)

	return (
		<Tabs
			disablePageAnimations
			disableTintColor={useSkinTabs}
			iconSize={useSkinTabs ? 50 : undefined}
			tabBarActiveTintColor={themes.primary}
			activeIndicatorColor={
				useSkinTabs ? 'transparent' : themes.secondaryContainer
			}
			tabBarStyle={{ backgroundColor: themes.elevation.level1 }}
			initialRouteName='index'
		>
			<Tabs.Screen
				name={PERSONAL_TABS[0].name}
				options={{
					title: PERSONAL_TABS[0].label,
					tabBarIcon: ({ focused }) => {
						// 旧皮肤仍使用 home 作为第一个标签的图标槽位。
						const icon = focused
							? skinIcons?.home.selected
							: skinIcons?.home.default
						return icon ? { uri: icon, scale: 1 } : searchIcon
					},
					tabBarLabel: PERSONAL_TABS[0].label,
					lazy: true,
				}}
			/>
			<Tabs.Screen
				name={PERSONAL_TABS[1].name}
				options={{
					title: PERSONAL_TABS[1].label,
					tabBarIcon: ({ focused }) => {
						const icon = focused
							? skinIcons?.library.selected
							: skinIcons?.library.default
						return icon ? { uri: icon, scale: 1 } : libraryIcon
					},
					tabBarLabel: PERSONAL_TABS[1].label,
					lazy: true,
				}}
			/>
			<Tabs.Screen
				name={PERSONAL_TABS[2].name}
				options={{
					title: PERSONAL_TABS[2].label,
					tabBarIcon: () => downloadIcon,
					tabBarLabel: PERSONAL_TABS[2].label,
					lazy: true,
				}}
			/>
			<Tabs.Screen
				name={PERSONAL_TABS[3].name}
				options={{
					title: PERSONAL_TABS[3].label,
					tabBarIcon: ({ focused }) => {
						// 旧皮肤仍使用 settings 作为第三个标签的图标槽位。
						const icon = focused
							? skinIcons?.settings.selected
							: skinIcons?.settings.default
						return icon ? { uri: icon, scale: 1 } : profileIcon
					},
					tabBarLabel: PERSONAL_TABS[3].label,
					lazy: true,
				}}
			/>
		</Tabs>
	)
}
