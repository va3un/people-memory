// Capture saves new records and conservative fills together with their reversible audit history.
import { db } from '../db/database'
import { createRecord, newId } from '../db/records'
import { personDefaults } from '../db/typed'
import type { Person, RecordSnapshot } from '../db/schema'
import { normalizeName } from '../domain/names'
import { reverseType } from '../domain/relationships'
import { canonical } from '../backup/codec'
import { captureSchema } from './schema'
import { captureSnapshot, checkReview, type Review } from './resolver'
export const CAPTURE_TABLES = ['people', 'contexts', 'memberships', 'relationships'] as const
export type CaptureTable = (typeof CAPTURE_TABLES)[number]
export const fields = [
  'full_name',
  'maiden_name',
  'display_name',
  'nicknames',
  'gender',
  'category',
  'phones',
  'city',
  'how_i_know',
  'notes',
] as const
export function nextTime(previous: string): string {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString()
}
export function proposedPerson(row: Review['people'][number], existing?: Person): Person {
  const value = row.value
  const candidate = {
    ...personDefaults(value.full_name),
    maiden_name: row.approveMaiden ? value.maiden_name || undefined : undefined,
    gender: value.gender,
    category: value.category || undefined,
    nicknames: value.nicknames.filter((n) => n.trim()),
    phones: value.phones.filter((p) => p.trim()),
    how_i_know: value.how_i_know || undefined,
    city: value.city || undefined,
    notes: row.appendNotes ? value.notes || undefined : undefined,
  }
  const result = { ...existing } as Person
  if (!existing) return { ...candidate, created_at: '', updated_at: '', deleted: false }
  for (const field of fields) {
    if (field === 'notes') continue
    const prior = existing[field]
    if (
      prior === undefined ||
      prior === '' ||
      (Array.isArray(prior) && !prior.length) ||
      (field === 'gender' && prior === 'unknown')
    ) {
      Object.assign(result, { [field]: candidate[field] })
    }
  }
  if (row.appendNotes && value.notes.trim() && !existing.notes?.includes(value.notes.trim()))
    result.notes = [existing.notes, value.notes.trim()].filter(Boolean).join('\n')
  return result
}
const pending = new WeakSet<Review>(),
  saved = new WeakSet<Review>()
export async function saveCapture(review: Review): Promise<string> {
  if (pending.has(review) || saved.has(review))
    throw new Error('This capture is already saving or saved. Read a new draft to save again.')
  pending.add(review)
  try {
    const parsed = captureSchema.parse({
      schema: 1,
      people: review.people.map((row) => row.value),
      contexts: review.contexts.map((row) => row.value),
      memberships: review.memberships,
      relationships: review.relationships,
      uncertain: review.uncertain,
    })
    if (!review.people.some((row) => row.include)) throw new Error('Include at least one person.')
    if (!review.passage.trim() || review.passage.length > 5000)
      throw new Error('The original passage is missing or too long.')
    const result = await db.transaction(
      'rw',
      [db.people, db.contexts, db.memberships, db.relationships, db.captureBatches],
      async () => {
        const local = await captureSnapshot()
        checkReview(review, local)
        const me = local.people.find((p) => p.is_me && !p.deleted)!
        const batchId = newId(),
          created_ids: Record<string, string[]> = {},
          before_snapshots: RecordSnapshot[] = [],
          after_snapshots: RecordSnapshot[] = []
        const trackNew = async (table: CaptureTable, value: object) => {
          const record = await createRecord(db.table(table), { ...value, source_batch_id: batchId })
          ;(created_ids[table] ??= []).push(record.id)
          after_snapshots.push({ table, id: record.id, values: structuredClone(record) })
          return record.id as string
        }
        const people = new Map<string, string>([['ME', me.id]])
        for (const row of review.people.filter((row) => row.include)) {
          if (!row.selected)
            throw new Error(`Choose use existing or create new for ${row.value.full_name}.`)
          if ((row.nameWarning || row.suggestionApplied) && !row.approveName)
            throw new Error(
              `Confirm the assumed name for ${row.value.full_name}, or edit/revert it.`,
            )
          const existing =
            row.selected === 'new'
              ? undefined
              : local.people.find((p) => p.id === row.selected && !p.deleted)
          if (row.selected !== 'new' && !existing)
            throw new Error('Choose an available existing person.')
          const proposed = proposedPerson(row, existing)
          let personId: string
          if (!existing) {
            const { created_at: _created, updated_at: _updated, ...values } = proposed
            personId = await trackNew('people', values)
          } else {
            personId = existing.id
            if (canonical(proposed) !== canonical(existing)) {
              const next = { ...proposed, updated_at: nextTime(existing.updated_at) }
              before_snapshots.push({
                table: 'people',
                id: existing.id,
                values: structuredClone(existing),
              })
              after_snapshots.push({
                table: 'people',
                id: existing.id,
                values: structuredClone(next),
              })
              await db.people.put(next)
            }
          }
          if ([...people.entries()].some(([ref, id]) => ref !== 'ME' && id === personId))
            throw new Error(
              'Two draft people use the same existing identity. Skip one card or choose distinct people.',
            )
          people.set(row.value.ref, personId)
        }
        const contexts = new Map<string, string>()
        const membership = async (
          person_id: string,
          context_id: string,
          role = '',
          period: string | null = null,
        ) => {
          const existing = await db.memberships
            .filter(
              (m) =>
                !m.deleted &&
                m.person_id === person_id &&
                m.context_id === context_id &&
                normalizeName(m.role ?? '') === normalizeName(role) &&
                normalizeName(m.period ?? '') === normalizeName(period ?? ''),
            )
            .first()
          if (!existing)
            await trackNew('memberships', {
              person_id,
              context_id,
              role: role.trim() || undefined,
              period: period?.trim() || undefined,
            })
        }
        for (const row of review.contexts.filter((row) => row.include)) {
          // Unused contexts must not create orphan records when people or memberships are skipped.
          if (
            !review.memberships.some(
              (m) => m.include && m.context === row.value.ref && people.has(m.person),
            )
          )
            continue
          if (!row.selected || (row.selected === 'new' && !row.value.name?.trim()))
            throw new Error('Choose or name each included context.')
          let contextId = row.selected
          if (contextId === 'new') {
            const name = row.value.name!.trim()
            const exact = (await db.contexts.toArray()).filter(
              (c) =>
                !c.deleted &&
                c.kind === row.value.kind &&
                normalizeName(c.name) === normalizeName(name),
            )
            if (exact.some((c) => c.source_batch_id !== batchId))
              throw new Error('A context with that name already exists. Choose its existing entry.')
            contextId = exact[0]?.id ?? (await trackNew('contexts', { name, kind: row.value.kind }))
          } else if (
            !local.contexts.some(
              (c) => c.id === contextId && !c.deleted && c.kind === row.value.kind,
            )
          )
            throw new Error('Choose an available context of the correct kind.')
          contexts.set(row.value.ref, contextId)
          if (row.addToMe) await membership(me.id, contextId)
        }
        for (const row of review.memberships.filter((row) => row.include)) {
          const personId = people.get(row.person),
            contextId = contexts.get(row.context)
          if (personId && contextId) await membership(personId, contextId, row.role, row.period)
        }
        for (const row of parsed.relationships.filter(
          (_, index) => review.relationships[index].include,
        )) {
          const a = people.get(row.a),
            b = people.get(row.b)
          if (!a || !b) continue
          if (a === b)
            throw new Error(
              'A relationship cannot link a person to themselves. Review the identity choices.',
            )
          const existing = await db.relationships
            .filter(
              (r) =>
                !r.deleted &&
                ((r.person_id === a && r.relative_id === b && r.type === row.type) ||
                  (r.person_id === b && r.relative_id === a && r.type === reverseType(row.type))),
            )
            .first()
          if (!existing)
            await trackNew('relationships', { person_id: a, relative_id: b, type: row.type })
        }
        await createRecord(db.captureBatches, {
          id: batchId,
          raw_text: review.passage,
          created_ids,
          before_snapshots,
          after_snapshots,
          status: 'saved',
        })
        return batchId
      },
    )
    saved.add(review)
    return result
  } finally {
    pending.delete(review)
  }
}
