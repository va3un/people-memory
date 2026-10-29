// AI answers are untrusted: bound their size, ignore unknown fields, and validate all references.
import { z } from 'zod'
import { RELATIONSHIP_TYPES } from '../domain/relationships'
import { CONTEXT_KINDS } from '../db/contexts'
const text = z.string().max(5000)
const ref = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/)
export const draftPersonSchema = z.object({
  ref: ref.refine((value) => value !== 'ME'),
  full_name: text.refine((value) => !!value.trim()),
  maiden_name: text.nullish().transform((value) => value ?? null),
  gender: z.enum(['male', 'female', 'other', 'unknown']).default('unknown'),
  gender_source: z.enum(['stated', 'unknown', 'guessed', 'inferred', 'name']).default('unknown'),
  nicknames: z.array(text).max(50).default([]),
  category: text.nullish().transform((value) => value ?? ''),
  how_i_know: text.default(''),
  notes: text.default(''),
  phones: z.array(text).max(30).default([]),
  city: text.nullish().transform((value) => value ?? null),
  assumed: z.array(text).max(50).default([]),
})
export const captureSchema = z
  .object({
    schema: z.literal(1),
    people: z.array(draftPersonSchema).min(1).max(100),
    contexts: z
      .array(
        z.object({
          ref,
          name: text.nullish().transform((value) => value ?? null),
          kind: z.enum(CONTEXT_KINDS),
          same_as_me: z.boolean().default(false),
        }),
      )
      .max(100)
      .default([]),
    memberships: z
      .array(
        z.object({
          person: ref,
          context: ref,
          role: text.nullish().transform((value) => value ?? ''),
          period: text.nullish().transform((value) => value ?? null),
        }),
      )
      .max(300)
      .default([]),
    relationships: z
      .array(z.object({ a: ref, b: ref, type: z.enum(RELATIONSHIP_TYPES) }))
      .max(300)
      .default([]),
    uncertain: z.array(text).max(100).default([]),
  })
  .superRefine((value, context) => {
    const people = new Set(value.people.map((p) => p.ref)),
      contexts = new Set(value.contexts.map((c) => c.ref))
    const fail = (message: string) => context.addIssue({ code: 'custom', message })
    if (
      people.size !== value.people.length ||
      contexts.size !== value.contexts.length ||
      contexts.has('ME')
    )
      fail('Duplicate or reserved draft references.')
    for (const row of value.memberships)
      if (!(people.has(row.person) || row.person === 'ME') || !contexts.has(row.context))
        fail('A membership has an unknown reference.')
    for (const row of value.relationships)
      if (
        !(people.has(row.a) || row.a === 'ME') ||
        !(people.has(row.b) || row.b === 'ME') ||
        row.a === row.b
      )
        fail('A relationship has an unknown or identical endpoint.')
  })
export type CaptureDraft = z.infer<typeof captureSchema>
export type DraftPerson = z.infer<typeof draftPersonSchema>
export function parseCapture(answer: string): CaptureDraft {
  if (new TextEncoder().encode(answer).length > 256 * 1024)
    throw new Error('The answer is too large. Use a shorter passage or answer.')
  // Find the first balanced JSON object while respecting quoted braces and escapes.
  const start = answer.indexOf('{')
  let depth = 0,
    quoted = false,
    escaped = false,
    end = -1
  for (let i = start; start >= 0 && i < answer.length; i++) {
    const ch = answer[i]
    if (quoted) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') quoted = false
    } else if (ch === '"') quoted = true
    else if (ch === '{' || ch === '[') {
      if (++depth > 12) throw new Error('The answer is too deeply nested.')
    } else if (ch === '}' || ch === ']') {
      if (--depth === 0) {
        end = i + 1
        break
      }
    }
  }
  try {
    if (start < 0 || end < 0) throw new Error()
    return captureSchema.parse(JSON.parse(answer.slice(start, end)))
  } catch {
    throw new Error(
      'Could not read this capture JSON. Check schema 1, names, relationship types and references, then paste the corrected answer. Nothing was saved.',
    )
  }
}
