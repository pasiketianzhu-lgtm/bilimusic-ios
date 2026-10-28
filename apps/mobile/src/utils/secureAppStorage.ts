import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import type { StateStorage } from 'zustand/middleware/persist'

import { splitAppState, mergeAppState } from './appStateSecrets'
import { mmkv } from './mmkv-instance'

const KEY = 'bilimusic.app.credentials'
const options = {
	keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
}

/** Keep account credentials out of the ordinary app-state persistence file. */
export const secureAppStorage: StateStorage = {
	getItem: (name) => {
		const existing = mmkv.getString(name) ?? null
		if (!existing || Platform.OS === 'web') return existing
		let credentials = SecureStore.getItem(KEY, options)
		if (!credentials) {
			const split = splitAppState(existing)
			// Write keychain first so a failed migration never erases the only copy.
			SecureStore.setItem(KEY, split.privateValue, options)
			mmkv.set(name, split.publicValue)
			credentials = split.privateValue
		}
		return mergeAppState(existing, credentials)
	},
	setItem: (name, value) => {
		if (Platform.OS === 'web') return mmkv.set(name, value)
		const split = splitAppState(value)
		SecureStore.setItem(KEY, split.privateValue, options)
		mmkv.set(name, split.publicValue)
	},
	removeItem: async (name) => {
		if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(KEY, options)
		mmkv.remove(name)
	},
}
