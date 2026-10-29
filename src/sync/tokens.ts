// Refresh uses a separate cross-tab lock and can never recreate credentials after disconnect.
import { db } from '../db/database'
import { request, json, SyncError } from './http'
import { assertAuth, readAuth, putSetting, AUTH, type Auth } from './store'
export async function exchangeToken(body: URLSearchParams, signal?: AbortSignal) {
  const response = await request(
    'https://api.dropboxapi.com/oauth2/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
    signal,
  )
  if (!response.ok)
    throw new SyncError(
      'auth',
      'Dropbox token authorization failed. Sign in again; local records and recovery copies are kept.',
    )
  const value = await json(response, 64 * 1024, signal)
  if (
    typeof value?.access_token !== 'string' ||
    !/^[\x21-\x7e]{1,8192}$/.test(value.access_token) ||
    typeof value.expires_in !== 'number' ||
    value.expires_in <= 0 ||
    value.expires_in > 86400 ||
    value.token_type?.toLowerCase() !== 'bearer'
  )
    throw new SyncError('auth', 'Dropbox returned invalid authorization data. Sign in again.')
  return value
}
const refreshes = new Map<string, Promise<string>>()
export async function accessToken(
  auth: Auth,
  force = false,
  signal?: AbortSignal,
): Promise<string> {
  const current = await assertAuth(auth, false)
  if (!force && current.expires > Date.now() + 60_000) return current.access
  if (refreshes.has(auth.generation)) return refreshes.get(auth.generation)!
  const refreshFlight = (async () => {
    if (!navigator.locks)
      throw new SyncError(
        'auth',
        'Dropbox token refresh requires a current Chrome/Edge browser with Web Locks.',
      )
    return navigator.locks.request('people-memory-dropbox-token', async () => {
      const latest = await assertAuth(auth, false)
      if (latest.expires > Date.now() + 60_000 && (!force || latest.access !== current.access))
        return latest.access
      try {
        const value = await exchangeToken(
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: latest.refresh,
            client_id: latest.appKey,
          }),
          signal,
        )
        await db.transaction('rw', db.deviceSettings, async () => {
          const still = await assertAuth(auth, false)
          await putSetting(AUTH, {
            ...still,
            access: value.access_token,
            expires: Date.now() + value.expires_in * 1000,
          })
        })
        return value.access_token as string
      } catch (error) {
        if (error instanceof SyncError && error.kind === 'auth')
          await db.transaction('rw', db.deviceSettings, async () => {
            const still = await readAuth()
            if (still?.generation === auth.generation) {
              await db.deviceSettings.delete(AUTH)
              await putSetting(
                'sync:notice',
                'Dropbox authorization expired. Sign in again; local records and recovery copies are kept.',
              )
            }
          })
        throw error
      }
    })
  })()
  refreshes.set(auth.generation, refreshFlight)
  try {
    return await refreshFlight
  } finally {
    refreshes.delete(auth.generation)
  }
}
