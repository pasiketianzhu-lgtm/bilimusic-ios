import { Orpheus } from '@bbplayer/orpheus'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Platform } from 'react-native'
import { List, SegmentedButtons } from 'react-native-paper'

import { queryClient } from '@/lib/config/queryClient'
import { toastAndLogError } from '@/utils/error-handling'

const key = ['download-quality'] as const

export default function DownloadQualitySetting() {
	const setting = useQuery({
		queryKey: key,
		queryFn: () => Orpheus.getDownloadQuality(),
		enabled: Platform.OS === 'ios',
		networkMode: 'always',
	})
	const update = useMutation({
		networkMode: 'always',
		mutationFn: (quality: number) => Orpheus.setDownloadQuality(quality),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
		onError: (error) =>
			toastAndLogError('更新下载音质失败', error, 'Downloads.Quality'),
	})
	if (Platform.OS !== 'ios') return null
	return (
		<>
			<List.Item
				title='下载音质'
				description='影响之后的下载；若音源无此档位，使用最高可用音质。'
			/>
			<SegmentedButtons
				value={String(setting.data ?? 0)}
				onValueChange={(value) => update.mutate(Number(value))}
				buttons={[
					{ value: '0', label: '最高可用', disabled: update.isPending },
					{ value: '30232', label: '均衡', disabled: update.isPending },
					{ value: '30216', label: '节省空间', disabled: update.isPending },
				]}
			/>
		</>
	)
}
