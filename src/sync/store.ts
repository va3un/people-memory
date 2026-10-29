// Authentication, per-account baselines and recoverable copies live only in device settings.
import { z } from 'zod'
import { db } from '../db/database'
import { DROPBOX_APP_KEY } from '../config'
export const AUTH = 'sync:auth',
  CLIENT = 'sync:client',
  PENDING = 'sync:oauth'
const authSchema = z
  .object({
    generation: z.string(),
    appKey: z.string(),
    account: z.string().regex(/^dbid:[A-Za-z0-9_-]{1,150}$/),
    access: z.string().min(1).max(8192),
    refresh: z.string().min(1).max(8192),
    expires: z.number().finite(),
    enabled: z.boolean(),
  })
  .strict()
export type Auth = z.infer<typeof authSchema>
export type SyncState = {
  baseline: Record<string, string>
  lastSuccess?: string
  lastRevision?: string
  lastFingerprint?: string
  pending: boolean
  error?: string
}
export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.deviceSettings.get(key))?.value as T | undefined
}
export async function putSetting(key: string, value: unknown) {
  await db.deviceSettings.put({ key, value, updated_at: new Date().toISOString() })
}
export async function readAuth(): Promise<Auth | undefined> {
  const parsed = authSchema.safeParse(await getSetting(AUTH))
  return parsed.success ? parsed.data : undefined
}
export const namespace = (auth: Pick<Auth, 'appKey' | 'account'>) =>
  encodeURIComponent(auth.appKey) + '|' + encodeURIComponent(auth.account)
export const stateKey = (auth: Auth) => 'sync:state:' + namespace(auth)
export const snapshotKey = (auth: Auth) => 'sync:snapshot:' + namespace(auth)
const stateSchema = z
  .object({
    baseline: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
    lastSuccess: z.string().datetime().optional(),
    lastRevision: z.string().optional(),
    lastFingerprint: z.string().optional(),
    pending: z.boolean(),
    error: z.string().max(1000).optional(),
  })
  .strict()
export async function readState(auth: Auth): Promise<SyncState> {
  const parsed = stateSchema.safeParse(await getSetting(stateKey(auth)))
  return parsed.success ? parsed.data : { baseline: {}, pending: true }
}
export async function assertAuth(auth: Auth, enabled = true) {
  const current = await readAuth()
  if (!current || current.generation !== auth.generation || (enabled && !current.enabled))
    throw new Error('Dropbox permission changed. Sync stopped; local data was kept.')
  return current
}
export async function clientConfig() {
  return (
    (await getSetting<{ appKey: string; confirmed: boolean }>(CLIENT)) ?? {
      appKey: DROPBOX_APP_KEY,
      confirmed: false,
    }
  )
}
export async function saveClient(appKey: string, confirmed: boolean) {
  if (appKey && !/^[a-zA-Z0-9]{8,80}$/.test(appKey))
    throw new Error('Enter the public App key from Appendix B, not a token or App secret.')
  await db.transaction('rw', db.deviceSettings, async () => {
    if (await readAuth()) throw new Error('Disconnect Dropbox before changing its App key.')
    await putSetting(CLIENT, { appKey, confirmed })
    await db.deviceSettings.delete(PENDING)
  })
}
export async function disconnect() {
  await db.transaction('rw', db.deviceSettings, async () => {
    await db.deviceSettings.bulkDelete([AUTH, PENDING])
    await putSetting(
      'sync:notice',
      'Dropbox disconnected on this device. Local records and recovery copies are kept.',
    )
  })
}
