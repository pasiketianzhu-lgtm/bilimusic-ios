const SPACE_RESERVE_BYTES = 64 * 1024 * 1024

/** Conservative AAC estimate (320 kbit/s); unknown duration reserves ten minutes. */
export function estimateAudioBytes(duration?: number | null): number {
	const seconds =
		duration != null && Number.isFinite(duration) && duration > 0
			? duration
			: 600
	return Math.ceil(seconds * 40_000)
}

export function hasDownloadSpace(
	available: number,
	requested: number,
	pending = 0,
): boolean {
	return (
		Number.isFinite(available) &&
		available >= requested + pending + SPACE_RESERVE_BYTES
	)
}
