// Project active records into one-hop search documents; nothing here writes to storage.
import type { Context, Membership, Person, Relationship } from '../db/schema'
import { relationshipDescription, reverseType, RELATIONSHIP_TYPES } from '../domain/relationships'
import { normalizeName, normalizePhone, normalizeText } from '../domain/names'

export type SearchSource = {
  people: Person[]
  contexts: Context[]
  memberships: Membership[]
  relationships: Relationship[]
}
export const SEARCH_FIELDS = [
  'name',
  'aliases',
  'related',
  'contexts',
  'phones',
  'details',
  'notes',
] as const
export type SearchField = (typeof SEARCH_FIELDS)[number]
export type SearchClue = { field: SearchField; text: string; label: string }
export type SearchDocument = Record<SearchField, string> & {
  id: string
  person: Person
  clues: SearchClue[]
}
export function searchTokens(text: string): string[] {
  return normalizeText(text)
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter(Boolean)
}

function contextDescription(context: Context, role?: string) {
  if (
    (context.kind === 'society' || context.kind === 'place') &&
    normalizeName(role ?? '') === 'resident'
  ) {
    return `Lives in ${context.name} (${role})`
  }
  const label = role ? role[0].toUpperCase() + role.slice(1) : 'Member'
  return `${label} ${context.kind === 'group' ? 'in' : 'at'} ${context.name}`
}

export function buildDocuments(source: SearchSource): SearchDocument[] {
  const people = new Map(source.people.filter((p) => !p.deleted).map((p) => [p.id, p]))
  const contexts = new Map(source.contexts.filter((c) => !c.deleted).map((c) => [c.id, c]))
  const documents = new Map<string, SearchDocument>()
  for (const person of people.values()) {
    if (person.is_me) continue
    const clues: SearchClue[] = [
      {
        field: 'name',
        text: `${person.full_name} ${person.display_name}`,
        label: `Matched name: ${person.full_name}`,
      },
    ]
    for (const nickname of person.nicknames)
      clues.push({ field: 'aliases', text: nickname, label: `Matched nickname: ${nickname}` })
    if (person.maiden_name)
      clues.push({ field: 'aliases', text: person.maiden_name, label: `née ${person.maiden_name}` })
    for (const phone of person.phones)
      clues.push({ field: 'phones', text: normalizePhone(phone), label: 'Matched phone number' })
    if (person.city)
      clues.push({ field: 'details', text: person.city, label: `City: ${person.city}` })
    if (person.category)
      clues.push({ field: 'details', text: person.category, label: `Category: ${person.category}` })
    if (person.how_i_know)
      clues.push({ field: 'details', text: person.how_i_know, label: person.how_i_know })
    if (person.notes) clues.push({ field: 'notes', text: person.notes, label: 'Matched notes' })
    documents.set(person.id, {
      id: person.id,
      person,
      clues,
      name: '',
      aliases: '',
      related: '',
      contexts: '',
      phones: '',
      details: '',
      notes: '',
    })
  }
  for (const membership of source.memberships) {
    const context = contexts.get(membership.context_id),
      doc = documents.get(membership.person_id)
    if (membership.deleted || !context || !doc) continue
    doc.clues.push({
      field: 'contexts',
      text: `${context.name} ${membership.role ?? ''}`,
      label: contextDescription(context, membership.role),
    })
  }
  const addRelativeClue = (ownerId: string, otherId: string, type: Relationship['type']) => {
    const doc = documents.get(ownerId),
      other = people.get(otherId)
    if (!doc || !other) return
    const label = relationshipDescription(type, doc.person.gender, other.full_name)
    doc.clues.push({
      field: 'related',
      label,
      text: `${label} ${other.display_name} ${other.nicknames.join(' ')} ${other.maiden_name ?? ''}`,
    })
  }
  for (const link of source.relationships) {
    if (link.deleted || !RELATIONSHIP_TYPES.includes(link.type)) continue
    addRelativeClue(link.person_id, link.relative_id, link.type)
    addRelativeClue(link.relative_id, link.person_id, reverseType(link.type))
  }
  for (const doc of documents.values()) {
    for (const field of SEARCH_FIELDS)
      doc[field] = doc.clues
        .filter((clue) => clue.field === field)
        .map((clue) => clue.text)
        .join(' ')
  }
  return [...documents.values()]
}
