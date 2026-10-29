// Foreground and edit triggers are deterministic, bounded and silent for unconfigured/offline devices.
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SyncError } from './http'
const mocks = vi.hoisted(() => ({
  next: undefined as undefined | ((value: any) => void),
  unsubscribe: vi.fn(),
  sync: vi.fn(),
  finish: vi.fn(),
  put: vi.fn(),
}))
vi.mock('dexie', () => ({
  liveQuery: () => ({
    subscribe: (observer: any) => {
      mocks.next = observer.next
      return { unsubscribe: mocks.unsubscribe }
    },
  }),
}))
vi.mock('./engine', () => ({ syncNow: mocks.sync }))
vi.mock('./status', () => ({ status: vi.fn() }))
vi.mock('./auth', () => ({ finishAuthorization: mocks.finish }))
vi.mock('./store', () => ({ putSetting: mocks.put }))
import { startSyncRuntime } from './runtime'
let cleanup: (() => void) | undefined,
  online = true,
  visible = 'visible'
beforeEach(() => {
  vi.useFakeTimers()
  mocks.sync.mockResolvedValue(undefined)
  mocks.finish.mockResolvedValue('dbid:fictional')
  mocks.put.mockResolvedValue(undefined)
  online = true
  visible = 'visible'
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
    () => visible as DocumentVisibilityState,
  )
})
afterEach(() => {
  cleanup?.()
  cleanup = undefined
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.clearAllMocks()
  history.replaceState(null, '', '/')
})
const emit = (signature = 'A', enabled = true) =>
  mocks.next!({ auth: { generation: 'fixture', enabled }, signature })
it('does nothing while disconnected/paused, runs on open, and debounces real record changes for five seconds', async () => {
  cleanup = startSyncRuntime()
  mocks.next!({ auth: undefined, signature: '' })
  await vi.advanceTimersByTimeAsync(6000)
  expect(mocks.sync).not.toHaveBeenCalled()
  emit('A', false)
  await vi.advanceTimersByTimeAsync(6000)
  expect(mocks.sync).not.toHaveBeenCalled()
  emit()
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.sync).toHaveBeenCalledTimes(1)
  emit()
  await vi.advanceTimersByTimeAsync(6000)
  expect(mocks.sync).toHaveBeenCalledTimes(1)
  emit('B')
  await vi.advanceTimersByTimeAsync(3000)
  emit('C')
  await vi.advanceTimersByTimeAsync(4999)
  expect(mocks.sync).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(mocks.sync).toHaveBeenCalledTimes(2)
})
it('skips quietly offline/hidden and retries on online/foreground without requests after cleanup', async () => {
  online = false
  cleanup = startSyncRuntime()
  emit()
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.sync).not.toHaveBeenCalled()
  online = true
  dispatchEvent(new Event('online'))
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.sync).toHaveBeenCalledTimes(1)
  visible = 'hidden'
  dispatchEvent(new Event('focus'))
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.sync).toHaveBeenCalledTimes(1)
  visible = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.sync).toHaveBeenCalledTimes(2)
  cleanup()
  cleanup = undefined
  dispatchEvent(new Event('online'))
  await vi.advanceTimersByTimeAsync(10000)
  expect(mocks.sync).toHaveBeenCalledTimes(2)
  expect(mocks.unsubscribe).toHaveBeenCalled()
})
it('backs off transient failures but does not repeatedly retry malformed remote data', async () => {
  mocks.sync.mockRejectedValueOnce(new SyncError('network', 'fictional offline'))
  cleanup = startSyncRuntime()
  emit()
  await vi.advanceTimersByTimeAsync(0)
  await vi.advanceTimersByTimeAsync(29999)
  expect(mocks.sync).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(mocks.sync).toHaveBeenCalledTimes(2)
  mocks.sync.mockRejectedValueOnce(new SyncError('invalid', 'fictional bad data'))
  dispatchEvent(new Event('focus'))
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.sync).toHaveBeenCalledTimes(3)
  await vi.advanceTimersByTimeAsync(600000)
  expect(mocks.sync).toHaveBeenCalledTimes(3)
})
it('removes OAuth codes from the URL and signals the hash router before asynchronously exchanging them', async () => {
  history.replaceState(null, '', '/?code=fictional-code&state=fictional-state')
  const dispatch = vi.spyOn(window, 'dispatchEvent')
  cleanup = startSyncRuntime()
  expect(location.search).toBe('')
  expect(location.hash).toBe('#/settings')
  expect(dispatch).toHaveBeenCalledWith(expect.any(PopStateEvent))
  expect(mocks.finish).toHaveBeenCalledWith(expect.stringContaining('code=fictional-code'))
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.put).toHaveBeenCalledWith(
    'sync:notice',
    expect.stringContaining('Uploads are paused'),
  )
})
