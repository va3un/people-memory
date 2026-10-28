// Counts of every kind of record, used by the developer tools in Settings.
import type { Table } from 'dexie'
import { db } from './database'
import { buildSampleData, isSameSampleContent, sampleRecordIds } from './sampleData'
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
      const me = await db.people.filter((p) => p.is_me && !p.deleted).first()
      const skipped = new Set(
        sample.people.filter((p) => p.is_me && me && p.id !== me.id).map((p) => p.id),
      )
      // Loading fixtures must never create a second Me or links to an omitted fixture.
      sample.people = sample.people.filter((p) => !skipped.has(p.id))
      sample.memberships = sample.memberships.filter((m) => !skipped.has(m.person_id))
      sample.relationships = sample.relationships.filter(
        (r) => !skipped.has(r.person_id) && !skipped.has(r.relative_id),
      )
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
    if (!knownIds.has(existing.id) || !isSameSampleContent(existing, row)) continue
    const restored = { ...row, created_at: existing.created_at, updated_at: now, deleted: false }
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
      const sample = buildSampleData()
      const known = sampleRecordIds()
      // Preserve fixture endpoints used by new links or photos, and edited fixture rows.
      const protectedIds = new Set<string>()
      for (const photo of await db.photos.filter((row) => !row.deleted).toArray())
        protectedIds.add(photo.person_id)
      for (const link of await db.relationships.filter((row) => !row.deleted).toArray()) {
        const fixture = sample.relationships.find((row) => row.id === link.id)
        if (!known.has(link.id) || !fixture || !isSameSampleContent(link, fixture)) {
          protectedIds.add(link.person_id)
          protectedIds.add(link.relative_id)
        }
      }
      for (const link of await db.memberships.filter((row) => !row.deleted).toArray()) {
        const fixture = sample.memberships.find((row) => row.id === link.id)
        if (!known.has(link.id) || !fixture || !isSameSampleContent(link, fixture)) {
          protectedIds.add(link.person_id)
          protectedIds.add(link.context_id)
        }
      }
      for (const row of await db.people.toArray()) {
        const fixture = sample.people.find((person) => person.id === row.id)
        if (fixture && !isSameSampleContent(row, fixture)) protectedIds.add(row.id)
      }
      for (const row of await db.contexts.toArray()) {
        const fixture = sample.contexts.find((context) => context.id === row.id)
        if (fixture && !isSameSampleContent(row, fixture)) protectedIds.add(row.id)
      }
      await markSampleDeleted(db.people, sample.people, protectedIds, now)
      await markSampleDeleted(db.contexts, sample.contexts, protectedIds, now)
      await markSampleDeleted(db.memberships, sample.memberships, protectedIds, now)
      await markSampleDeleted(db.relationships, sample.relationships, protectedIds, now)
    },
  )
}

// Delete only unchanged, known fixtures; an ID prefix never establishes ownership.
async function markSampleDeleted<T extends BaseRecord>(
  table: Table<T, string>,
  fixtures: T[],
  protectedIds: Set<string>,
  now: string,
) {
  for (const fixture of fixtures) {
    const row = await table.get(fixture.id)
    if (!row || protectedIds.has(row.id) || !isSameSampleContent(row, fixture)) continue
    const endpoints = row as T & { person_id?: string; relative_id?: string; context_id?: string }
    if (
      [endpoints.person_id, endpoints.relative_id, endpoints.context_id].some(
        (id) => id && protectedIds.has(id),
      )
    )
      continue
    await table.put({ ...row, deleted: true, updated_at: now })
  }
}
