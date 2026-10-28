// Atomic Phase 3 writes. Image decoding happens before entering IndexedDB transactions.
import { db } from './database'
import { samePersonRevision } from './personRevision'
import { writeMembership, type ContextChoice } from './contexts'
import { createRecord, nowIso, softDeleteRecord, updateRecord } from './records'
import { personDefaults, type NewPerson } from './typed'
import { collapseSpaces } from '../domain/names'
import { RELATIONSHIP_TYPES } from '../domain/relationships'
import type { Person, RelationshipType } from './schema'
import { shrinkImage } from '../lib/image'

export type PersonSave = {
  values: NewPerson
  original?: Person
  photo?: File | null
  removePhoto?: boolean
  relativeId?: string
  relationshipType?: RelationshipType
  contextChoice?: ContextChoice
}

export async function savePerson(input: PersonSave): Promise<Person> {
  const name = collapseSpaces(input.values.full_name)
  if (!name) throw new Error('Enter a name before saving.')
  const birthday = input.values.birthday
  if (birthday) {
    const year = birthday.year ?? 2000
    const date = new Date(0)
    date.setUTCFullYear(year, birthday.month - 1, birthday.day)
    if (
      !Number.isInteger(year) ||
      year < 1 ||
      year > 9999 ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== birthday.month - 1 ||
      date.getUTCDate() !== birthday.day
    ) {
      throw new Error('Enter a valid birthday, or leave it blank.')
    }
  }
  if (input.relativeId && !RELATIONSHIP_TYPES.includes(input.relationshipType!)) {
    throw new Error('Choose a relationship type.')
  }
  const image = input.photo ? await shrinkImage(input.photo) : undefined
  return db.transaction(
    'rw',
    [db.people, db.photos, db.relationships, db.contexts, db.memberships],
    async () => {
      const original = input.original
      const current = original ? await db.people.get(original.id) : undefined
      if (original) {
        if (!current || current.deleted || !samePersonRevision(current, original)) {
          throw new Error('This person changed elsewhere. Reopen the profile before editing again.')
        }
      }
      if (original && input.values.is_me !== original.is_me)
        throw new Error('The Me identity cannot be changed in this form.')
      if (
        input.values.is_me &&
        (await db.people.filter((p) => p.is_me && !p.deleted && p.id !== original?.id).first())
      ) {
        throw new Error('A Me profile already exists. Your existing profile has been kept.')
      }
      if (input.relativeId) {
        const relative = await db.people.get(input.relativeId)
        if (!relative || relative.deleted || relative.id === original?.id) {
          throw new Error('The related person is no longer available. Choose someone else.')
        }
      }
      if (!original && input.values.id && (await db.people.get(input.values.id))) {
        throw new Error('This record already exists. Reopen the profile before saving again.')
      }
      const values = {
        ...input.values,
        full_name: name,
        ...(original ? { last_viewed_at: current?.last_viewed_at } : {}),
      }
      const person = original
        ? await updateRecord(db.people, original.id, values)
        : await createRecord(db.people, { ...personDefaults(name), ...values })
      if (!person) throw new Error('This person is no longer available.')
      if (image || input.removePhoto) {
        const photos = await db.photos.where('person_id').equals(person.id).toArray()
        for (const photo of photos) {
          if (!photo.deleted) await softDeleteRecord(db.photos, photo.id)
        }
        if (image) {
          // Keep the existing schema and IDs. Reuse an existing photo row when replacing it.
          const old = photos[0]
          if (old) await updateRecord(db.photos, old.id, { ...image, deleted: false })
          else await createRecord(db.photos, { person_id: person.id, ...image })
        }
      }
      if (input.relativeId) {
        await createRecord(db.relationships, {
          person_id: person.id,
          relative_id: input.relativeId,
          type: input.relationshipType!,
        })
      }
      if (input.contextChoice) await writeMembership(person.id, input.contextChoice)
      return person
    },
  )
}

export type DeleteReceipt = { person: Person; deleted: Person; expiresAt: number }

export async function deletePersonWithUndo(original: Person): Promise<DeleteReceipt> {
  if (original.is_me) throw new Error('Keep your Me profile. You can edit it in Settings.')
  return db.transaction('rw', db.people, async () => {
    const current = await db.people.get(original.id)
    if (!current || current.deleted || !samePersonRevision(current, original)) {
      throw new Error('This person changed elsewhere. Reopen the profile before deleting.')
    }
    const deleted = (await softDeleteRecord(db.people, original.id))!
    // Keep photos and links intact. Views exclude deleted endpoints; Undo restores the whole profile.
    return { person: current, deleted, expiresAt: Date.now() + 10_000 }
  })
}

export async function undoPersonDelete(receipt: DeleteReceipt): Promise<void> {
  await db.transaction('rw', db.people, async () => {
    if (Date.now() >= receipt.expiresAt) throw new Error('The 10-second Undo period has ended.')
    const current = await db.people.get(receipt.person.id)
    if (!samePersonRevision(current, receipt.deleted)) {
      throw new Error(
        'This person changed after deletion. Undo was stopped to protect those changes.',
      )
    }
    await db.people.put({
      ...receipt.person,
      last_viewed_at: current?.last_viewed_at,
      updated_at: nowIso(),
    })
  })
}
