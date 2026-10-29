// Preview is read-only. Applying a bound, single-use preview rechecks the full dataset inside one transaction.
import Dexie, { type Transaction } from 'dexie'
import { db } from '../db/database'
import { normalizeName } from '../domain/names'
import { DATA_TABLES, validateReferences, type DataTable, type PortableTables } from './schema'
import { fingerprint, parseBackup } from './codec'
import { decodeDataset, portableDataset, readDataset, readSnapshot } from './snapshot'
import {
  checkBackupProof,
  prepareBackup,
  samePortableRecord,
  type BackupDownload,
} from './downloads'

export type ImportPreview = Readonly<{
  counts: {
    table: DataTable
    current: number
    incoming: number
    added: number
    identical: number
    conflicts: number
    deleted: number
  }[]
  conflicts: {
    table: DataTable
    id: string
    existing: string
    incoming: string
  }[]
  possibleDuplicates: { name: string; id: string }[]
  mergeProblem?: string
}>
type Plan = {
  localFingerprint: string
  incoming: PortableTables
  merged: PortableTables
  duplicatesRequired: boolean
  mergeProblem?: string
}
const plans = new WeakMap<ImportPreview, Plan>()
function description(row: { id: string; deleted: boolean; updated_at: string } & object): string {
  const named = row as { full_name?: string; name?: string }
  return `${named.full_name ?? named.name ?? row.id}${row.deleted ? ' (deleted)' : ''}; updated ${row.updated_at}`
}
export async function previewImport(file: Blob, signal?: AbortSignal): Promise<ImportPreview> {
  const incoming = (await parseBackup(file, signal)).tables
  const local = await portableDataset(await readSnapshot())
  const merged = structuredClone(local)
  const counts: ImportPreview['counts'] = [],
    conflicts: ImportPreview['conflicts'] = []
  for (const table of DATA_TABLES) {
    const byId = new Map(local[table].map((row) => [row.id, row]))
    let added = 0,
      identical = 0,
      conflictCount = 0
    for (const row of incoming[table]) {
      const existing = byId.get(row.id)
      if (!existing) {
        ;(merged[table] as unknown[]).push(row)
        added++
      } else if (samePortableRecord(existing, row)) identical++
      else {
        conflictCount++
        conflicts.push({
          table,
          id: row.id,
          existing: description(existing),
          incoming: description(row),
        })
      }
    }
    counts.push({
      table,
      current: local[table].length,
      incoming: incoming[table].length,
      added,
      identical,
      conflicts: conflictCount,
      deleted: incoming[table].filter((row) => row.deleted).length,
    })
  }
  const names = new Map<string, Set<string>>()
  for (const person of [...local.people, ...incoming.people].filter((p) => !p.deleted)) {
    const key = normalizeName(person.full_name),
      ids = names.get(key) ?? new Set<string>()
    ids.add(person.id)
    names.set(key, ids)
  }
  const possibleDuplicates = incoming.people
    .filter((p) => !p.deleted && (names.get(normalizeName(p.full_name))?.size ?? 0) > 1)
    .map((p) => ({ name: p.full_name, id: p.id }))
  let mergeProblem: string | undefined
  try {
    validateReferences(merged)
  } catch (error) {
    mergeProblem = error instanceof Error ? error.message : 'Merge is not valid.'
  }
  if (signal?.aborted) throw new Error('Operation cancelled. No records were changed.')
  const preview = Object.freeze({
    counts,
    conflicts,
    possibleDuplicates,
    mergeProblem,
  })
  plans.set(preview, {
    localFingerprint: await fingerprint(local),
    incoming,
    merged,
    duplicatesRequired: possibleDuplicates.length > 0,
    mergeProblem,
  })
  return preview
}
export async function prepareSafetyBackup(preview: ImportPreview): Promise<BackupDownload> {
  const plan = plans.get(preview)
  if (!plan) throw new Error('Refresh the import preview first.')
  const download = await prepareBackup()
  checkBackupProof(download, plan.localFingerprint, false)
  return download
}
export async function applyImport(
  preview: ImportPreview,
  options: {
    mode: 'merge' | 'replace'
    confirmation?: string
    backup?: BackupDownload
    duplicatesReviewed?: boolean
    signal?: AbortSignal
  },
): Promise<void> {
  const plan = plans.get(preview)
  if (!plan) throw new Error('Refresh the import preview before importing again.')
  if (!['merge', 'replace'].includes(options.mode)) throw new Error('Choose merge or replace.')
  if (plan.duplicatesRequired && !options.duplicatesReviewed)
    throw new Error('Review the possible duplicate names before importing.')
  if (options.mode === 'merge' && plan.mergeProblem) throw new Error(plan.mergeProblem)
  if (options.mode === 'replace') {
    if (options.confirmation !== 'REPLACE')
      throw new Error('Type REPLACE exactly to confirm replacement.')
    checkBackupProof(options.backup, plan.localFingerprint)
  }
  const assertNotAborted = () => {
    if (options.signal?.aborted) throw new Error('Import cancelled. No records were changed.')
  }
  assertNotAborted()
  const target = await decodeDataset(options.mode === 'replace' ? plan.incoming : plan.merged)
  let transaction: Transaction | undefined
  const abort = () => {
    try {
      transaction?.abort()
    } catch {
      /* A completed transaction cannot be cancelled retroactively. */
    }
  }
  options.signal?.addEventListener('abort', abort)
  try {
    await db.transaction(
      'rw',
      DATA_TABLES.map((table) => db.table(table)),
      async () => {
        transaction = Dexie.currentTransaction
        assertNotAborted()
        const current = await readDataset()
        const currentFingerprint = await Dexie.waitFor(
          (async () => fingerprint(await portableDataset(current)))(),
          60_000,
        )
        if (currentFingerprint !== plan.localFingerprint)
          throw new Error(
            'Data changed after the preview. Refresh the preview and make a fresh safety backup before replacing.',
          )
        assertNotAborted()
        for (const table of DATA_TABLES) {
          if (options.mode === 'replace') await db.table(table).clear()
          const existingIds = new Set(current[table].map((row) => row.id))
          const rows =
            options.mode === 'replace'
              ? target[table]
              : target[table].filter((row) => !existingIds.has(row.id))
          if (rows.length) await db.table(table).bulkPut(rows)
          assertNotAborted()
        }
      },
    )
    plans.delete(preview)
  } catch (error) {
    if (options.signal?.aborted) throw new Error('Import cancelled. No records were changed.')
    throw error
  } finally {
    options.signal?.removeEventListener('abort', abort)
  }
}
