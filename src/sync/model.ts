// The sync wire format carries validated records and a hash manifest, never device settings or view history.
import { z } from 'zod'
import {
  tablesSchema,
  photoSchema,
  validateBackup,
  checkStructure,
  type PortableTables,
  DATA_TABLES,
} from '../backup/schema'
import { canonical, sha256 } from '../backup/codec'
export const wireSchema = z
  .object({
    format: z.literal('people-memory-sync'),
    schema: z.literal(1),
    tables: tablesSchema
      .omit({ photos: true })
      .extend({ photos: z.array(photoSchema.omit({ data: true })).max(50_000) }),
  })
  .strict()
export type Wire = z.infer<typeof wireSchema>
export function project(tables: PortableTables): PortableTables {
  const copy = structuredClone(tables)
  for (const person of copy.people) delete person.last_viewed_at
  for (const batch of copy.captureBatches)
    for (const snapshot of [...batch.before_snapshots, ...batch.after_snapshots])
      if (snapshot.table === 'people') delete snapshot.values.last_viewed_at
  for (const table of DATA_TABLES)
    copy[table].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return copy
}
export function makeWire(tables: PortableTables): Wire {
  const data = project(tables)
  return wireSchema.parse({
    format: 'people-memory-sync',
    schema: 1,
    tables: { ...data, photos: data.photos.map(({ data: _data, ...photo }) => photo) },
  })
}
export function parseWire(value: unknown): Wire {
  try {
    checkStructure(value)
    const wire = wireSchema.parse(value)
    if (
      wire.tables.people.some((p) => p.last_viewed_at !== undefined) ||
      wire.tables.captureBatches.some((b) =>
        [...b.before_snapshots, ...b.after_snapshots].some(
          (s) => s.table === 'people' && Object.hasOwn(s.values, 'last_viewed_at'),
        ),
      )
    )
      throw new Error()
    return wire
  } catch {
    throw new Error(
      'Dropbox data has malformed, unknown, local-only or incompatible fields. Local records were kept. Restore a known backup or retry with a compatible app.',
    )
  }
}
export const rowKey = (table: string, id: string) => JSON.stringify([table, id])
export type Prepared = { tables: PortableTables; hashes: Record<string, string> }
export async function prepare(tables: PortableTables): Promise<Prepared> {
  const clean = project(tables),
    hashes: Record<string, string> = {}
  for (const table of DATA_TABLES)
    for (const row of clean[table])
      hashes[rowKey(table, row.id)] = await sha256(new TextEncoder().encode(canonical(row)))
  return { tables: clean, hashes }
}
export function validateTables(tables: PortableTables): PortableTables {
  return validateBackup({
    format: 'people-memory',
    schema: 1,
    exported_at: new Date().toISOString(),
    tables,
  }).tables
}
export const emptyTables = (): PortableTables => ({
  people: [],
  contexts: [],
  memberships: [],
  relationships: [],
  photos: [],
  captureBatches: [],
})
