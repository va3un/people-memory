// Request browser eviction protection once after data exists; never treat it as a backup.
import { db } from '../db/database'
import { requestPersistentStorage } from './storage'

export const PERSISTENCE_REQUEST_KEY = 'storage:initialPersistenceRequest'
export const readPersistenceRequest = () => db.deviceSettings.get(PERSISTENCE_REQUEST_KEY)

export async function requestInitialPersistence(): Promise<void> {
  if (!navigator.storage?.persist || !navigator.storage?.persisted) return
  if (await readPersistenceRequest()) return
  if (!(await db.people.filter((person) => !person.deleted).count())) return
  try {
    // A unique device-only claim prevents duplicate prompts across tabs/StrictMode. If interrupted,
    // Settings still reads the real browser status and offers a manual retry, never a false grant.
    await db.deviceSettings.add({
      key: PERSISTENCE_REQUEST_KEY,
      value: { state: 'attempting' },
      updated_at: new Date().toISOString(),
    })
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'ConstraintError') return
    throw cause
  }
  const status = await requestPersistentStorage()
  await db.deviceSettings.update(PERSISTENCE_REQUEST_KEY, {
    value: { state: 'finished', result: status.state },
    updated_at: new Date().toISOString(),
  })
}
