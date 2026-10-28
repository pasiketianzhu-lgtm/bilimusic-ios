import { Orpheus } from '@bbplayer/orpheus'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Platform } from 'react-native'
import { List, Switch } from 'react-native-paper'

import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { queryClient } from '@/lib/config/queryClient'
import { toastAndLogError } from '@/utils/error-handling'

export default function TrackBehaviorSettings() {
	const track = useCurrentTrack()
	const key = ['track-behavior', track?.uniqueKey] as const
	const settings = useQuery({
		queryKey: key,
		enabled: Platform.OS === 'ios' && Boolean(track),
		networkMode: 'always',
		queryFn: () =>
			Orpheus.getTrackBehavior(track!.uniqueKey, track!.duration ?? 0),
	})
	const update = useMutation({
		networkMode: 'always',
		mutationFn: async (value: { random: boolean; resume: boolean }) => {
			if (!track) return
			await Orpheus.setTrackBehavior(
				track.uniqueKey,
				value.random,
				value.resume,
			)
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
		onError: (error) =>
			toastAndLogError('保存播放规则失败', error, 'Player.Behavior'),
	})
	if (Platform.OS !== 'ios' || !settings.data) return null
	const value = settings.data
	return (
		<>
			<List.Item
				title='参与随机播放'
				description='超过 30 分钟默认关闭，可为当前条目单独设置'
				right={() => (
					<Switch
						value={value.random}
						disabled={update.isPending}
						onValueChange={(random) => update.mutate({ ...value, random })}
					/>
				)}
			/>
			<List.Item
				title='记住播放位置'
				description='再次播放时从上次中断的位置继续'
				right={() => (
					<Switch
						value={value.resume}
						disabled={update.isPending}
						onValueChange={(resume) => update.mutate({ ...value, resume })}
					/>
				)}
			/>
		</>
	)
}
