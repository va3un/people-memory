// Persistent storage. Browsers can clear site data, so we ask the browser to
// keep this app's data and we tell Varun what the browser answered.

export type StorageStatus = {
  // 'granted' means the browser promises to keep the data.
  // 'denied' means the browser may clear it at any time.
  // 'unsupported' means this browser has no such promise.
  state: 'granted' | 'denied' | 'unsupported'
  persisted: boolean
  message: string
}

// Asks the browser to keep the app's data. Safe to call more than once.
export async function requestPersistentStorage(): Promise<StorageStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return {
      state: 'unsupported',
      persisted: false,
      message: 'This browser cannot promise to keep the data. Keep a verified JSON backup from Settings. Use fictional data for testing.',
    }
  }

  try {
    const already = await navigator.storage.persisted()
    const persisted = already || (await navigator.storage.persist())
    return {
      state: persisted ? 'granted' : 'denied',
      persisted,
      message: persisted
        ? 'Protected against automatic storage cleanup. Clearing site data or losing this device still loses these records. Keep a verified JSON backup from Settings. Use fictional data for testing.'
        : 'The browser may clear this app data. Keep a verified JSON backup from Settings. Use fictional data for testing.',
    }
  } catch {
    return {
      state: 'denied',
      persisted: false,
      message: 'The browser would not promise to keep the data. Keep a verified JSON backup from Settings. Use fictional data for testing.',
    }
  }
}

// Reads the current storage status without asking for anything.
export async function getStorageStatus(): Promise<StorageStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return {
      state: 'unsupported',
      persisted: false,
      message: 'This browser cannot promise to keep the data. Keep a verified JSON backup from Settings. Use fictional data for testing.',
    }
  }
  try {
    const persisted = await navigator.storage.persisted()
    return {
      state: persisted ? 'granted' : 'denied',
      persisted,
      message: persisted
        ? 'Protected against automatic storage cleanup. Clearing site data or losing this device still loses these records. Keep a verified JSON backup from Settings. Use fictional data for testing.'
        : 'The browser may clear this app data. Keep a verified JSON backup from Settings. Use fictional data for testing.',
    }
  } catch {
    return {
      state: 'denied',
      persisted: false,
      message: 'The browser would not promise to keep the data. Keep a verified JSON backup from Settings. Use fictional data for testing.',
    }
  }
}

// How much space the app is using, in bytes, when the browser tells us.
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  try {
    const estimate = await navigator.storage.estimate()
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
  } catch {
    return null
  }
}

// Turns a number of bytes into a short readable size, such as "1.2 MB".
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
