import type { UseIncomingShareResult } from 'expo-sharing'

// Receiving shares is disabled in the iOS config. Calling Expo's hook would
// synchronously request an App Group that this personal build does not have.
const emptyShare: UseIncomingShareResult = {
	sharedPayloads: [],
	resolvedSharedPayloads: [],
	clearSharedPayloads: () => {},
	isResolving: false,
	error: null,
	refreshSharePayloads: () => {},
}

export function useIncomingShare(): UseIncomingShareResult {
	return emptyShare
}
