// Automatic eviction protection must not prompt twice, run on empty data or affect directory records.
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { createPerson, personDefaults } from '../db/typed'
import { PERSISTENCE_REQUEST_KEY, requestInitialPersistence } from './persistence'

beforeEach(async () => {
  await Promise.all([db.people.clear(), db.deviceSettings.clear()])
})
afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage')
  vi.restoreAllMocks()
})
function storage(granted = false) {
  let persisted = false
  const persist = vi.fn(async () => {
    persisted = granted
    return persisted
  })
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      persisted: async () => persisted,
      persist,
    },
  })
  return persist
}
it('waits for actual data, claims once under concurrent mounts, and leaves directory/settings intact', async () => {
  const persist = storage()
  await requestInitialPersistence()
  expect(persist).not.toHaveBeenCalled()
  expect(await db.deviceSettings.get(PERSISTENCE_REQUEST_KEY)).toBeUndefined()
  const person = await createPerson({ ...personDefaults('Fictional Persistence Me'), is_me: true })
  await db.deviceSettings.put({
    key: 'fictional-private-setting',
    value: 'unchanged',
    updated_at: person.updated_at,
  })
  await Promise.all(Array.from({ length: 5 }, () => requestInitialPersistence()))
  await requestInitialPersistence()
  expect(persist).toHaveBeenCalledTimes(1)
  expect((await db.deviceSettings.get(PERSISTENCE_REQUEST_KEY))?.value).toEqual({
    state: 'finished',
    result: 'denied',
  })
  expect(await db.people.get(person.id)).toEqual(person)
  expect((await db.deviceSettings.get('fictional-private-setting'))?.value).toBe('unchanged')
})
it('records a successful attempt without claiming a backup exists', async () => {
  const persist = storage(true)
  await createPerson(personDefaults('Fictional Kept'))
  await requestInitialPersistence()
  expect(persist).toHaveBeenCalledTimes(1)
  expect((await db.deviceSettings.get(PERSISTENCE_REQUEST_KEY))?.value).toEqual({
    state: 'finished',
    result: 'granted',
  })
  expect(await db.deviceSettings.get('backup:lastVerified')).toBeUndefined()
})
it('does not request for tombstones or an unsupported browser', async () => {
  const persist = storage()
  await createPerson({ ...personDefaults('Fictional Tombstone'), deleted: true })
  await requestInitialPersistence()
  expect(persist).not.toHaveBeenCalled()
  await createPerson(personDefaults('Fictional Unsupported'))
  Reflect.deleteProperty(navigator, 'storage')
  await requestInitialPersistence()
  expect(await db.deviceSettings.get(PERSISTENCE_REQUEST_KEY)).toBeUndefined()
})
it('does not auto-repeat an interrupted attempt; manual Settings retry remains available', async () => {
  const persist = storage()
  await createPerson(personDefaults('Fictional Interrupted'))
  await db.deviceSettings.put({
    key: PERSISTENCE_REQUEST_KEY,
    value: { state: 'attempting' },
    updated_at: new Date().toISOString(),
  })
  await requestInitialPersistence()
  expect(persist).not.toHaveBeenCalled()
})
it('contains native API failures, records denial and leaves people unchanged', async () => {
  storage()
  vi.spyOn(navigator.storage, 'persist').mockRejectedValue(new Error('Fictional denied permission'))
  const person = await createPerson(personDefaults('Fictional API Failure'))
  await expect(requestInitialPersistence()).resolves.toBeUndefined()
  expect((await db.deviceSettings.get(PERSISTENCE_REQUEST_KEY))?.value).toEqual({
    state: 'finished',
    result: 'denied',
  })
  expect(await db.people.get(person.id)).toEqual(person)
})
it('keeps permission request metadata out of portable backups and sync data', async () => {
  storage()
  await createPerson({ ...personDefaults('Fictional Portable Me'), is_me: true })
  await requestInitialPersistence()
  const { prepareBackup } = await import('../backup/downloads')
  const { readBlob } = await import('../backup/codec')
  const backup = await prepareBackup()
  const json = new TextDecoder().decode(await readBlob(backup.blob))
  expect(json).not.toContain(PERSISTENCE_REQUEST_KEY)
  const { portableDataset, readSnapshot } = await import('../backup/snapshot')
  expect(JSON.stringify(await portableDataset(await readSnapshot()))).not.toContain(
    PERSISTENCE_REQUEST_KEY,
  )
})
