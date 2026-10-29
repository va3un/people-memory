// Recoverable snapshots and conflict variants never overwrite records without a current-version check.
import Dexie from 'dexie'
import { db } from '../db/database'
import { DATA_TABLES, type PortableTables } from '../backup/schema'
import { readSnapshot, portableDataset, decodeDataset, readDataset } from '../backup/snapshot'
import { fingerprint, canonical, sha256 } from '../backup/codec'
import {
  getSetting,
  putSetting,
  snapshotKey,
  assertAuth,
  namespace,
  AUTH,
  type Auth,
} from './store'
import { project, prepare, validateTables, rowKey } from './model'
import type { Conflict } from './merge'
export type StoredConflict = Conflict & { account: string; resolved: boolean; created_at: string }
export type Snapshot = {
  format: 'people-memory'
  schema: 1
  exported_at: string
  tables: PortableTables
}
export async function createSnapshot(auth: Auth) {
  const existing = await getSetting<Snapshot>(snapshotKey(auth))
  if (existing) return existing
  const tables = await portableDataset(await readSnapshot()),
    snapshot: Snapshot = {
      format: 'people-memory',
      schema: 1,
      exported_at: new Date().toISOString(),
      tables,
    }
  await db.transaction('rw', db.deviceSettings, async () => {
    await assertAuth(auth, false)
    if (!(await getSetting(snapshotKey(auth)))) await putSetting(snapshotKey(auth), snapshot)
  })
  return (await getSetting<Snapshot>(snapshotKey(auth)))!
}
export async function enableSync(auth: Auth, confirmation: string) {
  if (confirmation !== 'SYNC')
    throw new Error('Type SYNC exactly to enable uploads to this Dropbox account.')
  await createSnapshot(auth)
  await db.transaction('rw', db.deviceSettings, async () => {
    const current = await assertAuth(auth, false)
    if (!(await getSetting(snapshotKey(auth))))
      throw new Error('Create a recovery snapshot before enabling sync.')
    await putSetting(AUTH, { ...current, enabled: true })
  })
}
export async function pauseSync(auth: Auth) {
  await db.transaction('rw', db.deviceSettings, async () => {
    const current = await assertAuth(auth, false)
    await putSetting(AUTH, { ...current, enabled: false })
  })
}
export async function conflictEntry(auth: Auth, conflict: Conflict, resolved = false) {
  const pair = [conflict.winnerHash, conflict.loserHash].sort().join('|')
  const key =
    'sync:conflict:' +
    (await sha256(
      new TextEncoder().encode(
        namespace(auth) + '|' + rowKey(conflict.table, conflict.id) + '|' + pair,
      ),
    ))
  return {
    key,
    value: {
      ...conflict,
      account: namespace(auth),
      resolved,
      created_at: new Date().toISOString(),
    } satisfies StoredConflict,
  }
}
export async function conflicts() {
  return (
    await db.deviceSettings.filter((row) => row.key.startsWith('sync:conflict:')).toArray()
  ).map((row) => ({ key: row.key, value: row.value as StoredConflict }))
}
export async function recoverySnapshots() {
  return (
    await db.deviceSettings.filter((row) => row.key.startsWith('sync:snapshot:')).toArray()
  ).map((row) => ({ key: row.key, value: row.value as Snapshot }))
}
export async function archiveConflict(key: string) {
  await db.transaction('rw', db.deviceSettings, async () => {
    const value = await getSetting<StoredConflict>(key)
    if (value) await putSetting(key, { ...value, resolved: true })
  })
}
export async function recoverConflict(key: string) {
  const conflict = await getSetting<StoredConflict>(key)
  if (!conflict) throw new Error('Recovery copy is unavailable.')
  const before = await portableDataset(await readSnapshot()),
    prepared = await prepare(before),
    current = (before[conflict.table] as { id: string; updated_at: string }[]).find(
      (r) => r.id === conflict.id,
    )
  if (!current || prepared.hashes[rowKey(conflict.table, conflict.id)] !== conflict.winnerHash)
    throw new Error(
      'This record changed after the conflict. Download both versions and review manually; current data was kept.',
    )
  const replacement = {
    ...conflict.loser,
    updated_at: new Date(
      Math.max(
        Date.now(),
        Date.parse(current.updated_at) + 1,
        Date.parse(String(conflict.loser.updated_at)) + 1,
      ),
    ).toISOString(),
  }
  const target = structuredClone(before)
  ;(target[conflict.table] as unknown[]) = (target[conflict.table] as { id: string }[]).map((r) =>
    r.id === conflict.id ? replacement : r,
  )
  validateTables(target)
  const decoded = await decodeDataset(target),
    expected = await fingerprint(before)
  await db.transaction(
    'rw',
    [...DATA_TABLES.map((t) => db.table(t)), db.deviceSettings],
    async () => {
      const actual = await readDataset()
      if (
        (await Dexie.waitFor((async () => fingerprint(await portableDataset(actual)))())) !==
        expected
      )
        throw new Error('Data changed while preparing recovery. Retry after reviewing it.')
      const row = decoded[conflict.table].find((r) => r.id === conflict.id)!
      if (conflict.table === 'people')
        Object.assign(row, {
          last_viewed_at: actual.people.find((p) => p.id === conflict.id)?.last_viewed_at,
        })
      const backupKey =
        'sync:conflict:recovered:' +
        (await Dexie.waitFor(sha256(new TextEncoder().encode(key + canonical(replacement)))))
      await putSetting(backupKey, {
        ...conflict,
        winner: replacement,
        loser: project(before)[conflict.table].find((r) => r.id === conflict.id),
        winnerHash: (await Dexie.waitFor(prepare(target))).hashes[
          rowKey(conflict.table, conflict.id)
        ],
        loserHash: conflict.winnerHash,
        resolved: true,
        created_at: new Date().toISOString(),
      })
      await db.table(conflict.table).put(row)
      await putSetting(key, { ...conflict, resolved: true })
    },
  )
}
