import { DownloadPage } from '@/app/download'
import { useNowPlayingBar } from '@/hooks/ui/useNowPlayingBar'

export default function DownloadsTab() {
	useNowPlayingBar()
	return <DownloadPage embedded />
}
