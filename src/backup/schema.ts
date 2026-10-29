// Backup version 1 is strict: unknown fields or future versions are refused rather than discarded.
import { z } from 'zod'
import { RELATIONSHIP_TYPES } from '../domain/relationships'
import { CONTEXT_KINDS } from '../db/contexts'

export const MAX_FILE_BYTES = 64 * 1024 * 1024
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024
export const MAX_TOTAL_PHOTO_BYTES = 32 * 1024 * 1024
export const MAX_RECORDS = 50_000
export const DATA_TABLES = [
  'people',
  'contexts',
  'memberships',
  'relationships',
  'photos',
  'captureBatches',
] as const
export type DataTable = (typeof DATA_TABLES)[number]
const text = z.string().max(1_000_000)
const id = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value))
const iso = z.string().datetime({ offset: false })
const base = {
  id,
  created_at: iso,
  updated_at: iso,
  deleted: z.boolean(),
  source_batch_id: id.optional(),
}
export const personSchema = z
  .object({
    ...base,
    full_name: text.refine((s) => !!s.trim()),
    maiden_name: text.optional(),
    display_name: text,
    nicknames: z.array(text).max(1000),
    gender: z.enum(['male', 'female', 'other', 'unknown']),
    category: text.optional(),
    phones: z.array(text).max(1000),
    email: text.optional(),
    city: text.optional(),
    how_i_know: text.optional(),
    notes: text.optional(),
    birthday: z
      .object({
        month: z.number().int().min(1).max(12),
        day: z.number().int().min(1).max(31),
        year: z.number().int().min(1).max(9999).optional(),
      })
      .strict()
      .refine((b) => {
        const date = new Date(0)
        date.setUTCFullYear(b.year ?? 2000, b.month - 1, b.day)
        return date.getUTCMonth() === b.month - 1 && date.getUTCDate() === b.day
      })
      .optional(),
    is_me: z.boolean(),
    last_viewed_at: iso.optional(),
  })
  .strict()
const contextSchema = z
  .object({
    ...base,
    name: text.refine((s) => !!s.trim()),
    kind: z.enum(CONTEXT_KINDS),
    city: text.optional(),
    notes: text.optional(),
  })
  .strict()
const membershipSchema = z
  .object({
    ...base,
    person_id: id,
    context_id: id,
    role: text.optional(),
    period: text.optional(),
    notes: text.optional(),
  })
  .strict()
const relationshipSchema = z
  .object({
    ...base,
    person_id: id,
    relative_id: id,
    type: z.enum(RELATIONSHIP_TYPES),
    notes: text.optional(),
  })
  .strict()
export const photoSchema = z
  .object({
    ...base,
    person_id: id,
    mime: z.enum(['image/jpeg', 'image/png']),
    width: z.number().int().min(1).max(600),
    height: z.number().int().min(1).max(600),
    bytes: z.number().int().min(1).max(MAX_PHOTO_BYTES),
    data: z
      .string()
      .min(4)
      .max(Math.ceil(MAX_PHOTO_BYTES / 3) * 4),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
const snapshotSchemas = {
  people: personSchema.partial(),
  contexts: contextSchema.partial(),
  memberships: membershipSchema.partial(),
  relationships: relationshipSchema.partial(),
  photos: photoSchema.partial(),
}
const snapshotSchema = z
  .object({
    table: z.enum(['people', 'contexts', 'memberships', 'relationships', 'photos']),
    id,
    values: z.record(z.string(), z.unknown()),
  })
  .strict()
  .refine(
    (s) => snapshotSchemas[s.table].safeParse(s.values).success,
    'Unsupported snapshot fields',
  )
const createdIds = z
  .object({
    people: z.array(id).max(MAX_RECORDS).optional(),
    contexts: z.array(id).max(MAX_RECORDS).optional(),
    memberships: z.array(id).max(MAX_RECORDS).optional(),
    relationships: z.array(id).max(MAX_RECORDS).optional(),
    photos: z.array(id).max(MAX_RECORDS).optional(),
  })
  .strict()
const batchSchema = z
  .object({
    ...base,
    raw_text: text,
    created_ids: createdIds,
    before_snapshots: z.array(snapshotSchema).max(MAX_RECORDS),
    after_snapshots: z.array(snapshotSchema).max(MAX_RECORDS),
    status: z.enum(['saved', 'undone', 'undo_conflict']),
  })
  .strict()
export const tablesSchema = z
  .object({
    people: z.array(personSchema).max(MAX_RECORDS),
    contexts: z.array(contextSchema).max(MAX_RECORDS),
    memberships: z.array(membershipSchema).max(MAX_RECORDS),
    relationships: z.array(relationshipSchema).max(MAX_RECORDS),
    photos: z.array(photoSchema).max(MAX_RECORDS),
    captureBatches: z.array(batchSchema).max(MAX_RECORDS),
  })
  .strict()
export const backupSchema = z
  .object({
    format: z.literal('people-memory'),
    schema: z.literal(1),
    exported_at: iso,
    tables: tablesSchema,
  })
  .strict()
export type PortableTables = z.infer<typeof tablesSchema>
export type BackupFile = z.infer<typeof backupSchema>

export function checkStructure(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }]
  let nodes = 0
  while (stack.length) {
    const entry = stack.pop()!
    if (++nodes > 500_000 || entry.depth > 16)
      throw new Error('Backup structure is too large or deeply nested.')
    if (entry.value !== null && typeof entry.value === 'object') {
      if (!Array.isArray(entry.value) && Object.getPrototypeOf(entry.value) !== Object.prototype)
        throw new Error('Unsupported non-JSON data in backup.')
      for (const [key, child] of Object.entries(entry.value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key))
          throw new Error('Unsafe object key in backup.')
        stack.push({ value: child, depth: entry.depth + 1 })
      }
    } else if (
      entry.value !== null &&
      !['string', 'number', 'boolean', 'undefined'].includes(typeof entry.value)
    )
      throw new Error('Unsupported value in backup.')
  }
}
export function validateReferences(tables: PortableTables): void {
  if (DATA_TABLES.reduce((sum, table) => sum + tables[table].length, 0) > MAX_RECORDS)
    throw new Error('Too many records in this backup.')
  for (const table of DATA_TABLES) {
    if (new Set(tables[table].map((row) => row.id)).size !== tables[table].length)
      throw new Error(`Duplicate record ID in ${table}.`)
  }
  const people = new Set(tables.people.map((p) => p.id)),
    contexts = new Set(tables.contexts.map((c) => c.id))
  if (tables.people.filter((p) => p.is_me && !p.deleted).length > 1)
    throw new Error('This dataset would contain more than one active Me profile.')
  for (const row of tables.memberships)
    if (!people.has(row.person_id) || !contexts.has(row.context_id))
      throw new Error('A membership points to a missing person or context.')
  for (const row of tables.relationships)
    if (
      !people.has(row.person_id) ||
      !people.has(row.relative_id) ||
      row.person_id === row.relative_id
    )
      throw new Error('A relationship has a missing or identical endpoint.')
  for (const row of tables.photos)
    if (!people.has(row.person_id)) throw new Error('A photo points to a missing person.')
}
export function validateBackup(value: unknown): BackupFile {
  checkStructure(value)
  if (value && typeof value === 'object' && 'schema' in value && value.schema !== 1)
    throw new Error('Unsupported backup version. No records were changed.')
  const parsed = backupSchema.safeParse(value)
  if (!parsed.success)
    throw new Error(
      'Invalid backup fields or content. Device settings and unknown fields are not accepted.',
    )
  validateReferences(parsed.data.tables)
  return parsed.data
}
