// Relative creation validates both endpoints and stores a single directional relationship.
import { db } from './database'
import { createRecord } from './records'
import { savePerson } from './people'
import { personDefaults } from './typed'
import { RELATIONSHIP_TYPES, reverseType } from '../domain/relationships'
import type { Gender, RelationshipType } from './schema'

export type RelativeChoice =
  | { personId: string; newPerson?: never }
  | { newPerson: { name: string; gender: Gender }; personId?: never }

export async function addRelative(
  targetId: string,
  choice: RelativeChoice,
  type: RelationshipType,
) {
  if (!RELATIONSHIP_TYPES.includes(type)) throw new Error('Choose a relationship type.')
  return db.transaction(
    'rw',
    [db.people, db.photos, db.relationships, db.contexts, db.memberships],
    async () => {
      const target = await db.people.get(targetId)
      if (!target || target.deleted) throw new Error('This person is no longer available.')
      const relative = choice.personId
        ? await db.people.get(choice.personId)
        : await savePerson({
            values: { ...personDefaults(choice.newPerson!.name), gender: choice.newPerson!.gender },
          })
      if (!relative || relative.deleted) throw new Error('Choose an available relative.')
      if (relative.id === targetId) throw new Error('Choose a different person.')
      const existing = await db.relationships
        .filter(
          (r) =>
            !r.deleted &&
            ((r.person_id === relative.id && r.relative_id === targetId && r.type === type) ||
              (r.person_id === targetId &&
                r.relative_id === relative.id &&
                r.type === reverseType(type))),
        )
        .first()
      return (
        existing ??
        createRecord(db.relationships, { person_id: relative.id, relative_id: targetId, type })
      )
    },
  )
}
