// Contexts and memberships use existing tables; callers can compose these writes in a transaction.
import { db } from './database'
import { createRecord } from './records'
import { collapseSpaces, normalizeName } from '../domain/names'
import type { Context, ContextKind, Membership } from './schema'

export const CONTEXT_KINDS: ContextKind[] = [
  'organization',
  'school',
  'college',
  'society',
  'group',
  'place',
]
export const CONTEXT_LABELS: Record<ContextKind, string> = {
  organization: 'Organization',
  school: 'School',
  college: 'College',
  society: 'Society',
  group: 'Group',
  place: 'Place',
}
export type ContextDraft = Pick<Context, 'name' | 'kind' | 'city' | 'notes'>
export type ContextChoice = (
  | { contextId: string; draft?: never }
  | { draft: ContextDraft; contextId?: never }
) & {
  role?: string
  period?: string
}

export async function listContexts(): Promise<Context[]> {
  return (await db.contexts.filter((c) => !c.deleted).toArray()).sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  )
}

export async function resolveContext(choice: ContextChoice): Promise<Context> {
  if (choice.contextId) {
    const context = await db.contexts.get(choice.contextId)
    if (!context || context.deleted)
      throw new Error('This context is no longer available. Choose another context.')
    return context
  }
  const draft = choice.draft
  if (!draft || !CONTEXT_KINDS.includes(draft.kind) || !collapseSpaces(draft.name)) {
    throw new Error('Enter a context name and choose its kind.')
  }
  const name = collapseSpaces(draft.name),
    city = collapseSpaces(draft.city ?? '')
  // Reuse only an exact normalized name/kind/city match. Never merge fuzzy identities.
  const existing = await db.contexts
    .filter(
      (c) =>
        !c.deleted &&
        c.kind === draft.kind &&
        normalizeName(c.name) === normalizeName(name) &&
        normalizeName(c.city ?? '') === normalizeName(city),
    )
    .first()
  return (
    existing ??
    createRecord(db.contexts, {
      name,
      kind: draft.kind,
      city: city || undefined,
      notes: draft.notes,
    })
  )
}

export async function writeMembership(
  personId: string,
  choice: ContextChoice,
): Promise<Membership> {
  const person = await db.people.get(personId)
  if (!person || person.deleted) throw new Error('This person is no longer available.')
  const context = await resolveContext(choice)
  const role = collapseSpaces(choice.role ?? ''),
    period = collapseSpaces(choice.period ?? '')
  const existing = await db.memberships
    .where('person_id')
    .equals(personId)
    .filter(
      (m) =>
        !m.deleted &&
        m.context_id === context.id &&
        normalizeName(m.role ?? '') === normalizeName(role) &&
        normalizeName(m.period ?? '') === normalizeName(period),
    )
    .first()
  return (
    existing ??
    createRecord(db.memberships, {
      person_id: personId,
      context_id: context.id,
      role: role || undefined,
      period: period || undefined,
    })
  )
}

export async function addToContext(personId: string, choice: ContextChoice): Promise<Membership> {
  return db.transaction(
    'rw',
    [db.people, db.contexts, db.memberships],
    async () => await writeMembership(personId, choice),
  )
}
