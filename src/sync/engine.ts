// A cycle validates before atomic local commit, then publishes by revision with three bounded retries.
import Dexie from 'dexie'
import { liveQuery } from 'dexie'
import { db } from '../db/database'
import { DATA_TABLES, MAX_FILE_BYTES } from '../backup/schema'
import {
  portableDataset,
  readSnapshot,
  decodeDataset,
  readDataset,
  type Dataset,
} from '../backup/snapshot'
import { canonical } from '../backup/codec'
import { assertAuth, readAuth, readState, putSetting, stateKey, type Auth } from './store'
import { createSnapshot, conflictEntry } from './recovery'
import { Dropbox } from './dropbox'
import { SyncError, safeMessage } from './http'
import { emptyTables, makeWire, parseWire, prepare, validateTables, type Prepared } from './model'
import { merge } from './merge'
import { hydrate, publishPhotos } from './photos'
function restoreHistory(target: Dataset, current: Dataset) {
  for (const person of target.people) {
    const local = current.people.find((p) => p.id === person.id)
    if (local?.last_viewed_at) person.last_viewed_at = local.last_viewed_at
  }
  for (const batch of target.captureBatches) {
    const local = current.captureBatches.find((b) => b.id === batch.id)
    if (!local) continue
    for (const kind of ['before_snapshots', 'after_snapshots'] as const)
      for (const row of batch[kind]) {
        const previous = local[kind].find((r) => r.id === row.id && r.table === row.table)
        if (row.table === 'people' && previous?.values.last_viewed_at)
          row.values.last_viewed_at = previous.values.last_viewed_at
      }
  }
}
async function commit(auth: Auth, local: Prepared, target: ReturnType<typeof merge>) {
  validateTables(target.tables)
  const decoded = await decodeDataset(target.tables),
    entries = await Promise.all(target.conflicts.map((conflict) => conflictEntry(auth, conflict)))
  await db.transaction(
    'rw',
    [...DATA_TABLES.map((t) => db.table(t)), db.deviceSettings],
    async () => {
      await assertAuth(auth)
      const current = await readDataset(),
        actual = await Dexie.waitFor((async () => prepare(await portableDataset(current)))())
      if (canonical(actual.hashes) !== canonical(local.hashes))
        throw new SyncError(
          'revision',
          'Local records changed during sync. Retry without discarding those edits.',
        )
      for (const entry of entries)
        if (!(await db.deviceSettings.get(entry.key))) await putSetting(entry.key, entry.value)
      restoreHistory(decoded, current)
      for (const table of DATA_TABLES)
        if (decoded[table].length) await db.table(table).bulkPut(decoded[table])
    },
  )
}
async function cycle(auth: Auth, signal: AbortSignal) {
  await createSnapshot(auth)
  const initial = await readState(auth)
  await putSetting(stateKey(auth), { ...initial, pending: true, error: undefined })
  const client = new Dropbox(auth, signal)
  for (let attempt = 0; attempt < 3; attempt++) {
    await assertAuth(auth)
    if (signal.aborted) throw new SyncError('network', 'Sync cancelled. Local data was kept.')
    const local = await prepare(await portableDataset(await readSnapshot())),
      state = await readState(auth)
    let remote = await prepare(emptyTables()),
      rev: string | undefined,
      remoteText: string | undefined
    try {
      const file = await client.download('/data.json', MAX_FILE_BYTES)
      let wire
      try {
        wire = parseWire(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(file.data)))
      } catch {
        throw new SyncError(
          'invalid',
          'Dropbox data.json is malformed or unsupported. Local records were kept; restore a known valid remote backup before retrying.',
        )
      }
      remoteText = canonical(wire)
      remote = await prepare(await hydrate(wire, local.tables, client))
      rev = file.meta.rev
    } catch (error) {
      if (!(error instanceof SyncError) || error.kind !== 'missing') throw error // Missing photo is not an empty directory.
      if (rev !== undefined || remoteText !== undefined)
        throw new SyncError(
          'invalid',
          'A referenced Dropbox photo is missing. Local data was kept; repair from the publishing device or a backup.',
        )
    }
    const target = merge(local, remote, state.baseline)
    try {
      validateTables(target.tables)
    } catch {
      throw new SyncError(
        'invalid',
        'Merged records have incompatible links or different Me identities. Sync paused; keep both backups and use the reviewed import/restore flow. No records were removed.',
      )
    }
    try {
      await commit(auth, local, target)
      const wire = canonical(makeWire(target.tables)),
        data = new TextEncoder().encode(wire)
      if (data.length > MAX_FILE_BYTES)
        throw new SyncError(
          'invalid',
          'Merged Dropbox data exceeds safe file limits. Local recovery copies were kept.',
        )
      const committedRev = wire === remoteText ? rev! : await client.upload('/data.json', data, rev)
      await publishPhotos(target.tables, client)
      const confirmed = await client.download('/data.json', MAX_FILE_BYTES)
      if (confirmed.meta.rev !== committedRev)
        throw new SyncError(
          'revision',
          'Another device changed Dropbox during publication. Retrying safely.',
        )
      const acknowledged = await prepare(target.tables)
      await db.transaction('rw', db.deviceSettings, async () => {
        await assertAuth(auth)
        await putSetting(stateKey(auth), {
          baseline: acknowledged.hashes,
          lastSuccess: new Date().toISOString(),
          lastRevision: committedRev,
          pending: false,
        })
      })
      return
    } catch (error) {
      if (error instanceof SyncError && error.kind === 'revision' && attempt < 2) continue
      throw error
    }
  }
}
let flight: Promise<void> | undefined
export function syncNow(): Promise<void> {
  if (flight) return flight
  flight = (async () => {
    const auth = await readAuth()
    if (!auth?.enabled) return
    if (navigator.onLine === false) {
      await putSetting(stateKey(auth), {
        ...(await readState(auth)),
        pending: true,
        error: 'Offline. Local changes are kept and will retry when online.',
      })
      return
    }
    if (!navigator.locks)
      throw new SyncError(
        'network',
        'Sync needs a current Chrome/Edge browser with Web Locks. Local features remain available.',
      )
    await navigator.locks.request(
      'people-memory-dropbox-sync',
      { ifAvailable: true },
      async (lock) => {
        if (!lock) return
        const controller = new AbortController(),
          subscription = liveQuery(readAuth).subscribe({
            next: (current) => {
              if (!current || !current.enabled || current.generation !== auth.generation)
                controller.abort()
            },
            error: () => controller.abort(),
          })
        try {
          await cycle(auth, controller.signal)
        } catch (error) {
          const current = await readAuth()
          if (current?.generation === auth.generation)
            await putSetting(stateKey(auth), {
              ...(await readState(auth)),
              pending: true,
              error: safeMessage(error),
            })
          throw error
        } finally {
          subscription.unsubscribe()
        }
      },
    )
  })().finally(() => {
    flight = undefined
  })
  return flight
}
