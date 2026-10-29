// Read-only projections hide deleted endpoints and count people once even with multiple roles.
import { db } from './database'
import { normalizeName } from '../domain/names'
import { reverseType } from '../domain/relationships'

export async function readBrowse() {
  const people = await db.people.filter((p) => !p.deleted).toArray()
  const contexts = await db.contexts.filter((c) => !c.deleted).toArray()
  const memberships = await db.memberships.filter((m) => !m.deleted).toArray()
  const active = new Set(people.map((p) => p.id))
  const categories = new Map<string, { key: string; name: string; count: number }>()
  for (const person of people.filter((p) => !p.is_me && p.category?.trim())) {
    const key = normalizeName(person.category!)
    const category = categories.get(key) ?? { key, name: person.category!.trim(), count: 0 }
    category.count += 1
    categories.set(key, category)
  }
  return {
    contexts: contexts
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((context) => ({
        context,
        count: new Set(
          memberships
            .filter((m) => m.context_id === context.id && active.has(m.person_id))
            .map((m) => m.person_id),
        ).size,
      })),
    categories: [...categories.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export async function readContext(id: string) {
  const context = await db.contexts.get(id)
  const links = await db.memberships
    .where('context_id')
    .equals(id)
    .filter((m) => !m.deleted)
    .toArray()
  const people = await db.people
    .filter((p) => !p.deleted && links.some((m) => m.person_id === p.id))
    .toArray()
  const photos = await db.photos.filter((p) => !p.deleted).toArray()
  return {
    context: context && !context.deleted ? context : undefined,
    people: people
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
      .map((person) => ({
        person,
        photo: photos.find((p) => p.person_id === person.id),
        memberships: links.filter((m) => m.person_id === person.id),
      })),
  }
}

export async function readConnections(personId: string) {
  const links = await db.relationships
    .filter((r) => !r.deleted && (r.person_id === personId || r.relative_id === personId))
    .toArray()
  const relatives = await Promise.all(
    links.map(async (link) => {
      const forward = link.relative_id === personId
      const relative = await db.people.get(forward ? link.person_id : link.relative_id)
      const photo =
        relative && !relative.deleted
          ? await db.photos
              .where('person_id')
              .equals(relative.id)
              .filter((photo) => !photo.deleted)
              .first()
          : undefined
      return relative && !relative.deleted
        ? { link, relative, photo, type: forward ? link.type : reverseType(link.type) }
        : undefined
    }),
  )
  const memberships = await db.memberships
    .where('person_id')
    .equals(personId)
    .filter((m) => !m.deleted)
    .toArray()
  const contexts = await Promise.all(
    memberships.map(async (membership) => {
      const context = await db.contexts.get(membership.context_id)
      return context && !context.deleted ? { membership, context } : undefined
    }),
  )
  return {
    relatives: relatives.filter((item) => item !== undefined),
    contexts: contexts.filter((item) => item !== undefined),
  }
}
