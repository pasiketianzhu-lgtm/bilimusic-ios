/** Tracks longer than this are treated as long-form content in playlist playback. */
export const LONG_CONTENT_THRESHOLD_SECONDS = 30 * 60

export function isLongContent(durationSeconds: number | null | undefined): boolean {
	return (
		durationSeconds != null &&
		Number.isFinite(durationSeconds) &&
		durationSeconds > LONG_CONTENT_THRESHOLD_SECONDS
	)
}

export function defaultRandomParticipation(
	durationSeconds: number | null | undefined,
): boolean {
	return !isLongContent(durationSeconds)
}

/** Preserve playlist order while removing duplicate track references. */
export function uniqueTrackIds(trackIds: readonly number[]): number[] {
	return [...new Set(trackIds)]
}
