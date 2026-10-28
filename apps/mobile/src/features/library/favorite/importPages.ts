export interface ImportSummary<T> {
	added: number
	skipped: number
	failures: { item: T; message: string }[]
	cancelled: boolean
}

/** Page fetch errors propagate; individual item errors never discard other imports. */
export async function importPages<T>(options: {
	load: (page: number) => Promise<{ items: T[]; hasMore: boolean }>
	key: (item: T) => string
	selected: (item: T) => boolean
	save: (item: T) => Promise<'added' | 'skipped'>
	cancelled: () => boolean
	onProgress?: (summary: ImportSummary<T>) => void
}): Promise<ImportSummary<T>> {
	const result: ImportSummary<T> = {
		added: 0,
		skipped: 0,
		failures: [],
		cancelled: false,
	}
	const seen = new Set<string>()
	let page = 1
	while (!options.cancelled()) {
		const data = await options.load(page)
		for (const item of data.items) {
			if (options.cancelled()) {
				result.cancelled = true
				return result
			}
			const key = options.key(item)
			if (seen.has(key) || !options.selected(item)) continue
			seen.add(key)
			try {
				result[await options.save(item)]++
			} catch (error) {
				result.failures.push({
					item,
					message: error instanceof Error ? error.message : '导入失败',
				})
			}
			options.onProgress?.({ ...result, failures: [...result.failures] })
		}
		if (!data.hasMore) return result
		if (!data.items.length) throw new Error('收藏夹分页数据异常，请重试')
		page++
	}
	result.cancelled = true
	return result
}
