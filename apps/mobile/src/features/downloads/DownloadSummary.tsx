import { DownloadState, Orpheus } from '@bbplayer/orpheus'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { Button, List, Text } from 'react-native-paper'

import { orpheusQueryKeys } from '@/hooks/queries/orpheus'
import { formatBytes } from '@/utils/format'

import { useDownloadGroups } from './downloadGroups'

export default function DownloadSummary() {
	const [expanded, setExpanded] = useState(false)
	const groups = useDownloadGroups((state) => state.groups)
	const { data: tasks = [] } = useQuery({
		queryKey: [...orpheusQueryKeys.all, 'download-summary'],
		queryFn: () => Orpheus.getDownloads(),
		networkMode: 'always',
		refetchInterval: (query) =>
			query.state.data?.some(
				(task) =>
					task.state === DownloadState.DOWNLOADING ||
					task.state === DownloadState.QUEUED,
			)
				? 2000
				: false,
	})
	const occupied = tasks
		.filter((task) => task.state === DownloadState.COMPLETED)
		.reduce((total, task) => total + task.bytesDownloaded, 0)
	const map = new Map(tasks.map((task) => [task.id, task]))
	return (
		<>
			<Text style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
				已下载占用 {formatBytes(occupied)}
			</Text>
			{groups.length > 1 && (
				<Button onPress={() => setExpanded(!expanded)}>
					{expanded ? '收起歌单下载' : `查看歌单下载（${groups.length}）`}
				</Button>
			)}
			<ScrollView style={{ maxHeight: expanded ? 160 : 72 }}>
				{(expanded ? groups : groups.slice(0, 1)).map((group) => {
					const completed = group.trackIds.filter(
						(id) => map.get(id)?.state === DownloadState.COMPLETED,
					).length
					const failed = group.trackIds.filter(
						(id) => map.get(id)?.state === DownloadState.FAILED,
					).length
					return (
						<List.Item
							key={group.id}
							title={group.title}
							description={`已完成 ${completed}/${group.trackIds.length}${failed ? ` · 失败 ${failed}` : ''}`}
							left={(props) => (
								<List.Icon
									{...props}
									icon='playlist-music'
								/>
							)}
						/>
					)
				})}
			</ScrollView>
		</>
	)
}
