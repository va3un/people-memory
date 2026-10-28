// Record local-only viewing metadata without changing contact timestamps or reviving a deleted record.
import { db } from './database'
export async function recordPersonView(id: string): Promise<void> {
  await db.transaction('rw', db.people, async () => {
    const person = await db.people.get(id)
    if (person && !person.deleted && !person.is_me)
      await db.people.update(id, { last_viewed_at: new Date().toISOString() })
  })
}
