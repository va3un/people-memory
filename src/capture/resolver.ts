// Resolve against a coherent local snapshot; uncertain identities always require a person's choice.
import { db } from '../db/database'
import { normalizeName } from '../domain/names'
import { canonical } from '../backup/codec'
import { captureSchema, type CaptureDraft, type DraftPerson } from './schema'
import type { Context, Person } from '../db/schema'
export async function captureSnapshot() {
  const [people, contexts, memberships, relationships] = await Promise.all([
    db.people.toArray(),
    db.contexts.toArray(),
    db.memberships.toArray(),
    db.relationships.toArray(),
  ])
  return { people, contexts, memberships, relationships }
}
export type LocalData = Awaited<ReturnType<typeof captureSnapshot>>
export function revision(data: LocalData): string {
  return canonical({
    ...data,
    people: data.people.map(({ last_viewed_at: _view, ...person }) => person),
  })
}
export type PersonReview = {
  value: DraftPerson
  include: boolean
  selected: string
  candidates: Person[]
  appendNotes: boolean
  approveName: boolean
  nameWarning: boolean
  approveMaiden: boolean
  originalName: string
  originalMaiden: string | null
  suggestion?: { name: string; maiden: string }
  suggestionApplied: boolean
}
export type ContextReview = {
  value: CaptureDraft['contexts'][number]
  include: boolean
  selected: string
  candidates: Context[]
  addToMe: boolean
  guessed: boolean
}
export type Review = {
  people: PersonReview[]
  contexts: ContextReview[]
  memberships: (CaptureDraft['memberships'][number] & { include: boolean })[]
  relationships: (CaptureDraft['relationships'][number] & { include: boolean })[]
  uncertain: string[]
  me: Person
  passage: string
  local: LocalData
}
const versions = new WeakMap<Review, string>()
export function checkReview(review: Review, local: LocalData): void {
  if (!versions.has(review) || versions.get(review) !== revision(local))
    throw new Error(
      'Saved data changed after review. Refresh review, then check your choices again. Nothing was saved.',
    )
}
function closeName(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false
  let i = 0,
    j = 0,
    edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length >= b.length) i++
    if (b.length >= a.length) j++
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}
export function personCandidates(value: DraftPerson, active: Person[]): Person[] {
  const names = [value.full_name, value.maiden_name, ...value.nicknames]
    .filter(Boolean)
    .map((name) => normalizeName(name!))
  return active.filter(
    (p) =>
      !p.deleted &&
      [p.full_name, p.maiden_name, ...p.nicknames]
        .filter(Boolean)
        .some((name) => names.some((n) => closeName(n, normalizeName(name!)))),
  )
}
export function reviewCounts(review?: Review) {
  if (!review) return { people: 0, links: 0 }
  const active = (ref: string) =>
    ref === 'ME' || review.people.some((p) => p.include && p.value.ref === ref)
  return {
    people: review.people.filter((p) => p.include).length,
    links:
      review.relationships.filter((r) => r.include && active(r.a) && active(r.b)).length +
      review.memberships.filter(
        (m) =>
          m.include &&
          active(m.person) &&
          review.contexts.some((c) => c.include && c.value.ref === m.context),
      ).length +
      review.contexts.filter(
        (c) =>
          c.include &&
          c.addToMe &&
          review.memberships.some(
            (m) => m.include && m.context === c.value.ref && active(m.person),
          ),
      ).length,
  }
}
export async function resolveCapture(
  draft: CaptureDraft,
  passage: string,
  surnameSuggestions = false,
): Promise<Review> {
  const parsed = captureSchema.parse(draft)
  if (!passage.trim() || passage.length > 5000)
    throw new Error('Keep the original passage between 1 and 5,000 characters.')
  const local = await db.transaction(
    'r',
    [db.people, db.contexts, db.memberships, db.relationships],
    captureSnapshot,
  )
  const active = local.people.filter((p) => !p.deleted),
    me = active.filter((p) => p.is_me)
  if (me.length !== 1) throw new Error('Set up exactly one Me profile before capture.')
  const people: PersonReview[] = parsed.people.map((value) => {
    const candidates = personCandidates(value, active)
    const nameWarning = !normalizeName(passage).includes(normalizeName(value.full_name))
    return {
      value,
      include: true,
      selected: candidates.length ? '' : 'new',
      candidates,
      appendNotes: true,
      approveName: false,
      nameWarning,
      approveMaiden: false,
      originalName: value.full_name,
      originalMaiden: value.maiden_name,
      suggestionApplied: false,
    }
  })
  if (surnameSuggestions)
    for (const link of parsed.relationships.filter((r) => r.type === 'spouse')) {
      const a = people.find((p) => p.value.ref === link.a),
        b = people.find((p) => p.value.ref === link.b)
      const wife = a?.value.gender === 'female' ? a : b?.value.gender === 'female' ? b : undefined
      const spouse = wife === a ? b : a
      if (!wife || !spouse || spouse.value.gender !== 'male') continue
      const words = wife.value.full_name.trim().split(/\s+/),
        other = spouse.value.full_name.trim().split(/\s+/)
      if (
        words.length > 1 &&
        other.length > 1 &&
        normalizeName(words.at(-1)!) !== normalizeName(other.at(-1)!)
      )
        wife.suggestion = {
          name: [...words.slice(0, -1), other.at(-1)!].join(' '),
          maiden: words.at(-1)!,
        }
    }
  const contexts = parsed.contexts.map((value) => {
    const candidates = local.contexts.filter(
      (c) =>
        !c.deleted &&
        c.kind === value.kind &&
        (value.same_as_me
          ? local.memberships.some(
              (m) => !m.deleted && m.person_id === me[0].id && m.context_id === c.id,
            )
          : !!value.name && normalizeName(c.name) === normalizeName(value.name)),
    )
    return {
      value,
      include: true,
      selected:
        candidates.length === 1
          ? candidates[0].id
          : candidates.length > 1 || !value.name
            ? ''
            : 'new',
      candidates,
      addToMe: false,
      guessed: value.same_as_me,
    }
  })
  const review: Review = {
    people,
    contexts,
    memberships: parsed.memberships.map((row) => ({ ...row, include: true })),
    relationships: parsed.relationships.map((row) => ({ ...row, include: true })),
    uncertain: parsed.uncertain,
    me: me[0],
    passage,
    local,
  }
  versions.set(review, revision(local))
  return review
}
