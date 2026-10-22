// Counts of every kind of record, used by the developer tools in Settings.
import { db } from './database'
import { buildSampleData } from './sampleData'

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
export async function loadSampleData(): Promise<RecordCounts> {
  const sample = buildSampleData()
  await db.transaction(
    'rw',
    [db.people, db.contexts, db.memberships, db.relationships],
    async () => {
      await db.people.bulkPut(sample.people)
      await db.contexts.bulkPut(sample.contexts)
      await db.memberships.bulkPut(sample.memberships)
      await db.relationships.bulkPut(sample.relationships)
    },
  )
  return countRecords()
}

// Marks every record as deleted. Records are kept so deletions can sync.
export async function softDeleteEverything(): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction(
    'rw',
    [db.people, db.contexts, db.memberships, db.relationships, db.photos, db.captureBatches],
    async () => {
      await db.people.toCollection().modify((row) => {
        row.deleted = true
        row.updated_at = now
      })
      await db.contexts.toCollection().modify((row) => {
        row.deleted = true
        row.updated_at = now
      })
      await db.memberships.toCollection().modify((row) => {
        row.deleted = true
        row.updated_at = now
      })
      await db.relationships.toCollection().modify((row) => {
        row.deleted = true
        row.updated_at = now
      })
      await db.photos.toCollection().modify((row) => {
        row.deleted = true
        row.updated_at = now
      })
      await db.captureBatches.toCollection().modify((row) => {
        row.deleted = true
        row.updated_at = now
      })
    },
  )
}
