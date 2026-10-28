// First-run setup creates Me without changing any previously saved person or link.
import { db } from './database'
import { savePerson } from './people'
import { personDefaults } from './typed'
import { writeMembership, type ContextChoice } from './contexts'

export async function readMe() {
  const people = await db.people.filter((p) => p.is_me && !p.deleted).toArray()
  if (people.length > 1)
    throw new Error('More than one Me profile exists. Existing data has been kept.')
  return people[0] ?? null
}

export async function createMe(name: string, contexts: ContextChoice[]) {
  return db.transaction(
    'rw',
    [db.people, db.photos, db.relationships, db.contexts, db.memberships],
    async () => {
      if (await readMe())
        throw new Error('A Me profile already exists. Your existing profile has been kept.')
      const me = await savePerson({ values: { ...personDefaults(name), is_me: true } })
      for (const context of contexts) await writeMembership(me.id, context)
      return me
    },
  )
}
