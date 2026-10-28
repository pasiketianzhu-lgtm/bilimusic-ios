export function subtitlesToLrc(
	body: readonly { from: number; content: string }[],
): string {
	return body
		.filter(
			(line) =>
				Number.isFinite(line.from) &&
				line.from >= 0 &&
				typeof line.content === 'string',
		)
		.toSorted((a, b) => a.from - b.from)
		.map((line) => {
			const total = Math.round(line.from * 100)
			const minutes = String(Math.floor(total / 6000)).padStart(2, '0')
			const seconds = String(Math.floor(total / 100) % 60).padStart(2, '0')
			return `[${minutes}:${seconds}.${String(total % 100).padStart(2, '0')}]${line.content.replace(/[\r\n]+/g, ' ')}`
		})
		.join('\n')
}
