interface PersistedAppState {
	state: Record<string, unknown>
	version?: number
}

export function splitAppState(value: string): {
	publicValue: string
	privateValue: string
} {
	const parsed = JSON.parse(value) as PersistedAppState
	const {
		bilibiliCookie = null,
		bbplayerToken = null,
		...publicState
	} = parsed.state
	return {
		publicValue: JSON.stringify({
			...parsed,
			state: { ...publicState, bilibiliCookie: null, bbplayerToken: null },
		}),
		privateValue: JSON.stringify({ bilibiliCookie, bbplayerToken }),
	}
}

export function mergeAppState(
	publicValue: string,
	privateValue: string,
): string {
	const parsed = JSON.parse(publicValue) as PersistedAppState
	const secrets = JSON.parse(privateValue) as {
		bilibiliCookie?: unknown
		bbplayerToken?: unknown
	}
	return JSON.stringify({
		...parsed,
		state: {
			...parsed.state,
			bilibiliCookie: secrets.bilibiliCookie ?? null,
			bbplayerToken: secrets.bbplayerToken ?? null,
		},
	})
}
