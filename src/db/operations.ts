// Counts of every kind of record, used by the developer tools in Settings.
import type { Table } from 'dexie'
import { db } from './database'
import { buildSampleData, isSameSampleContent, isSampleId, sampleRecordIds } from './sampleData'
import type { BaseRecord } from './schema'

export type RecordCounts = {
  people: number
  contexts: number
  memberships: number
  relationships: number
  photos: number
  captureBatches: number
}

export type CountLabels = { key: keyof RecordCounts; label: string }[]

export const COUNT_LABELS: CountLabels = [
  { key: 'people', label: 'People' },
  { key: 'contexts', label: 'Contexts' },
  { key: 'memberships', label: 'Memberships' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'photos', label: 'Photos' },
  { key: 'captureBatches', label: 'Capture batches' },
]

// Counts the records that are not marked as deleted.
export async function countRecords(): Promise<RecordCounts> {
  const [people, contexts, memberships, relationships, photos, captureBatches] = await Promise.all([
    db.people.filter((row) => !row.deleted).count(),
    db.contexts.filter((row) => !row.deleted).count(),
    db.memberships.filter((row) => !row.deleted).count(),
    db.relationships.filter((row) => !row.deleted).count(),
    db.photos.filter((row) => !row.deleted).count(),
    db.captureBatches.filter((row) => !row.deleted).count(),
  ])
  return { people, contexts, memberships, relationships, photos, captureBatches }
}

// Adds the fictional sample data. Existing records are left alone.
// A sample row whose id is already taken is skipped, so real records are
// never overwritten even if they happen to share a sample id.
export async function loadSampleData(): Promise<RecordCounts> {
  const sample = buildSampleData()
  const knownIds = sampleRecordIds()
  await db.transaction(
    'rw',
    [db.people, db.contexts, db.memberships, db.relationships],
    async () => {
      await putOnlyMissing(db.people, sample.people, knownIds)
      await putOnlyMissing(db.contexts, sample.contexts, knownIds)
      await putOnlyMissing(db.memberships, sample.memberships, knownIds)
      await putOnlyMissing(db.relationships, sample.relationships, knownIds)
    },
  )
  return countRecords()
}

// Puts rows that are not in the table yet. Rows with an id that already
// exists are left exactly as they are. A sample row that was deleted as test
// data is brought back, but only when the user has not changed its content.
async function putOnlyMissing<T extends BaseRecord>(
  table: Table<T, string>,
  rows: T[],
  knownIds: Set<string>,
) {
  const missing: T[] = []
  const restore: T[] = []
  const now = new Date().toISOString()

  for (const row of rows) {
    const existing = await table.get(row.id)
    if (!existing) {
      missing.push(row)
      continue
    }
    if (!existing.deleted) continue
    if (!knownIds.has(existing.id)) continue
    // A record the user has edited keeps its own content. An untouched one
    // is replaced by the fresh sample row, so new sample fields show up.
    const restored = isSameSampleContent(existing, row)
      ? { ...row, created_at: existing.created_at, updated_at: now, deleted: false }
      : { ...existing, updated_at: now, deleted: false }
    restore.push(restored)
  }

  if (missing.length > 0) await table.bulkPut(missing)
  if (restore.length > 0) await table.bulkPut(restore)
}

// Marks the fictional sample records as deleted. Real records are never
// touched. Records are kept so deletions can sync.
export async function softDeleteSampleData(): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction(
    'rw',
    [db.people, db.contexts, db.memberships, db.relationships, db.photos, db.captureBatches],
    async () => {
      await markSampleDeleted(db.people, now)
      await markSampleDeleted(db.contexts, now)
      await markSampleDeleted(db.memberships, now)
      await markSampleDeleted(db.relationships, now)
      await markSampleDeleted(db.photos, now)
      await markSampleDeleted(db.captureBatches, now)
    },
  )
}

// Marks only the records whose id shows they are fictional sample data.
async function markSampleDeleted<T extends BaseRecord>(table: Table<T, string>, now: string) {
  const sampleIds = (await table.toCollection().filter((row) => isSampleId(row.id)).primaryKeys())
  if (sampleIds.length === 0) return
  await table.where('id').anyOf(sampleIds).modify((row) => {
    row.deleted = true
    row.updated_at = now
  })
}
