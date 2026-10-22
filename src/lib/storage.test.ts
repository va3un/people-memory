// Tests for the browser storage promise helper.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatBytes, getStorageEstimate, getStorageStatus, requestPersistentStorage } from './storage'

type StorageStub = {
  persist: () => Promise<boolean>
  persisted: () => Promise<boolean>
  estimate: () => Promise<{ usage?: number; quota?: number }>
}

function stubStorage(value: Partial<StorageStub>): StorageStub {
  return {
    persist: value.persist ?? (async () => true),
    persisted: value.persisted ?? (async () => false),
    estimate: value.estimate ?? (async () => ({ usage: 0, quota: 0 })),
  }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, 'storage')
  vi.restoreAllMocks()
})

describe('requestPersistentStorage', () => {
  it('says granted when the browser keeps the data', async () => {
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: stubStorage({ persist: async () => true, persisted: async () => false }),
    })

    const status = await requestPersistentStorage()
    expect(status.state).toBe('granted')
    expect(status.persisted).toBe(true)
  })

  it('says denied when the browser says no', async () => {
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: stubStorage({ persist: async () => false, persisted: async () => false }),
    })

    const status = await requestPersistentStorage()
    expect(status.state).toBe('denied')
    expect(status.persisted).toBe(false)
  })

  it('does not ask again when the data is already kept', async () => {
    const persist = vi.fn(async () => false)
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: stubStorage({ persist, persisted: async () => true }),
    })

    const status = await requestPersistentStorage()
    expect(status.persisted).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('says unsupported when the browser has no storage promise', async () => {
    const status = await requestPersistentStorage()
    expect(status.state).toBe('unsupported')
  })
})

describe('getStorageStatus', () => {
  it('reports the current state without asking', async () => {
    const persist = vi.fn(async () => true)
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: stubStorage({ persist, persisted: async () => true }),
    })

    const status = await getStorageStatus()
    expect(status.persisted).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })
})

describe('getStorageEstimate', () => {
  it('gives the used space and the total space', async () => {
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: stubStorage({ estimate: async () => ({ usage: 2048, quota: 1024 * 1024 }) }),
    })

    const estimate = await getStorageEstimate()
    expect(estimate?.usage).toBe(2048)
    expect(estimate?.quota).toBe(1024 * 1024)
  })

  it('gives nothing back when the browser cannot say', async () => {
    expect(await getStorageEstimate()).toBeNull()
  })

  it('gives nothing back when the browser throws', async () => {
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: stubStorage({
        estimate: async () => {
          throw new Error('not allowed')
        },
      }),
    })

    expect(await getStorageEstimate()).toBeNull()
  })
})

describe('formatBytes', () => {
  it('shows kilobytes, megabytes and gigabytes', () => {
    expect(formatBytes(0)).toBe('0 KB')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB')
  })
})
