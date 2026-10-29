// Snapshots contain all portable tables and tombstones, never device settings or credentials.
import { db } from '../db/database'
import type { Photo } from '../db/schema'
import { DATA_TABLES, MAX_TOTAL_PHOTO_BYTES, validateBackup, type PortableTables } from './schema'
import { checkPhoto, encodeBase64, readBlob, sha256 } from './codec'

export async function readDataset() {
  const [people, contexts, memberships, relationships, photos, captureBatches] = await Promise.all([
    db.people.toArray(),
    db.contexts.toArray(),
    db.memberships.toArray(),
    db.relationships.toArray(),
    db.photos.toArray(),
    db.captureBatches.toArray(),
  ])
  return {
    people,
    contexts,
    memberships,
    relationships,
    photos,
    captureBatches,
  }
}
export type Dataset = Awaited<ReturnType<typeof readDataset>>
export async function readSnapshot(): Promise<Dataset> {
  return db.transaction(
    'r',
    DATA_TABLES.map((table) => db.table(table)),
    async () => await readDataset(),
  )
}
export async function portableDataset(data: Dataset): Promise<PortableTables> {
  if (data.photos.reduce((sum, photo) => sum + photo.blob.size, 0) > MAX_TOTAL_PHOTO_BYTES)
    throw new Error('Photos exceed the 32 MB backup limit. No partial backup was created.')
  const photos: PortableTables['photos'] = []
  for (const photo of data.photos) {
    const bytes = new Uint8Array(await readBlob(photo.blob))
    const { blob: _blob, ...row } = photo
    photos.push({
      ...row,
      mime: row.mime as PortableTables['photos'][number]['mime'],
      data: encodeBase64(bytes),
      sha256: await sha256(bytes),
    })
  }
  const validated = validateBackup({
    format: 'people-memory',
    schema: 1,
    exported_at: new Date().toISOString(),
    tables: { ...data, photos },
  }).tables
  for (const photo of validated.photos) await checkPhoto(photo)
  return validated
}
export async function decodeDataset(tables: PortableTables): Promise<Dataset> {
  const photos: Photo[] = []
  for (const photo of tables.photos) photos.push(await checkPhoto(photo))
  return { ...tables, photos }
}
