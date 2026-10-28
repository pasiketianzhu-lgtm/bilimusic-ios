import { useMutation, useQuery } from '@tanstack/react-query'
import { useTheme } from 'react-native-paper'

import IconButton from '@/components/common/IconButton'
import { playlistKeys } from '@/hooks/queries/db/playlist'
import { queryClient } from '@/lib/config/queryClient'
import {
	isTrackLiked,
	setTrackLiked,
} from '@/lib/services/likedPlaylistService'
import { toastAndLogError } from '@/utils/error-handling'

export default function LikeTrackButton({ trackId }: { trackId: number }) {
	const { colors } = useTheme()
	const key = [...playlistKeys.all, 'liked', trackId] as const
	const { data: liked = false, isPending } = useQuery({
		queryKey: key,
		queryFn: () => isTrackLiked(trackId),
		networkMode: 'always',
	})
	const toggle = useMutation({
		networkMode: 'always',
		mutationFn: () => setTrackLiked(trackId, !liked),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: playlistKeys.all }),
		onError: (error) =>
			toastAndLogError('更新我喜欢失败', error, 'Player.Like'),
	})
	return (
		<IconButton
			icon={liked ? 'heart' : 'heart-outline'}
			accessibilityLabel={liked ? '取消喜欢' : '加入我喜欢'}
			iconColor={liked ? colors.error : colors.onSurfaceVariant}
			disabled={isPending || toggle.isPending}
			onPress={() => toggle.mutate()}
		/>
	)
}
