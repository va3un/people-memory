// Foreground-only triggers debounce edits, retry offline work and never start an unconfigured connection.
import { liveQuery } from 'dexie'
import { finishAuthorization } from './auth'
import { status } from './status'
import { syncNow } from './engine'
import { putSetting } from './store'
import { SyncError } from './http'
export function startSyncRuntime() {
  const callback = new URL(location.href)
  if (callback.searchParams.has('code') || callback.searchParams.has('error')) {
    history.replaceState(null, '', callback.origin + callback.pathname + '#/settings')
    dispatchEvent(new PopStateEvent('popstate'))
    void finishAuthorization(callback.href)
      .then(() =>
        putSetting(
          'sync:notice',
          'Dropbox authorization completed. Uploads are paused until you prepare recovery and explicitly enable sync.',
        ),
      )
      .catch(() =>
        putSetting(
          'sync:notice',
          'Dropbox sign-in did not complete. Check Appendix B and sign in again; local data was kept.',
        ),
      )
  }
  let timer: ReturnType<typeof setTimeout> | undefined,
    stopped = false,
    enabled = false,
    signature = '',
    generation = '',
    backoff = 30_000
  const schedule = (delay: number) => {
    clearTimeout(timer)
    if (stopped || !enabled) return
    timer = setTimeout(() => {
      if (document.visibilityState === 'hidden' || navigator.onLine === false) return
      void syncNow()
        .then(() => {
          backoff = 30_000
        })
        .catch((error) => {
          if (
            !stopped &&
            enabled &&
            error instanceof SyncError &&
            ['network', 'revision'].includes(error.kind)
          ) {
            schedule(backoff)
            backoff = Math.min(backoff * 2, 300_000)
          }
        })
    }, delay)
  }
  const subscription = liveQuery(status).subscribe({
    next: (value) => {
      const next = !!value.auth?.enabled,
        changed = value.auth?.generation !== generation
      if (next && (!enabled || changed)) scheduleAfter(true)
      else if (next && value.signature !== signature) scheduleAfter(false)
      if (!next) clearTimeout(timer)
      enabled = next
      generation = value.auth?.generation ?? ''
      signature = value.signature
      function scheduleAfter(open: boolean) {
        enabled = next
        schedule(open ? 0 : 5000)
      }
    },
    error: () => {
      clearTimeout(timer)
    },
  })
  const foreground = () => {
    if (document.visibilityState !== 'hidden') schedule(0)
  }
  addEventListener('online', foreground)
  addEventListener('focus', foreground)
  document.addEventListener('visibilitychange', foreground)
  return () => {
    stopped = true
    clearTimeout(timer)
    subscription.unsubscribe()
    removeEventListener('online', foreground)
    removeEventListener('focus', foreground)
    document.removeEventListener('visibilitychange', foreground)
  }
}
