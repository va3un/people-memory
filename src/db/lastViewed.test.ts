// Local view timestamps must never overwrite a contact edit, change sync timestamps or undo safety.
import { beforeEach, expect, it } from 'vitest'
import { db } from './database'
import { recordPersonView } from './lastViewed'
import { savePerson, deletePersonWithUndo, undoPersonDelete } from './people'
import { personDefaults } from './typed'
import { createMe } from './me'

beforeEach(async () => {
  await db.people.clear()
})
it('changes only last_viewed_at on an active ordinary person', async () => {
  const original = await savePerson({ values: personDefaults('Fictional Viewed') })
  await recordPersonView(original.id)
  const saved = (await db.people.get(original.id))!
  expect(saved.last_viewed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  const { last_viewed_at: _view, ...contact } = saved
  expect(contact).toEqual(original)
})
it('does not create missing people or revive deleted people, and ignores Me', async () => {
  const person = await savePerson({ values: personDefaults('Fictional Deleted') })
  await deletePersonWithUndo(person)
  const me = await createMe('Fictional Me', [])
  await recordPersonView('fictional-missing')
  await recordPersonView(person.id)
  await recordPersonView(me.id)
  expect(await db.people.count()).toBe(2)
  expect((await db.people.get(person.id))?.last_viewed_at).toBeUndefined()
  expect(await db.people.get(me.id)).toEqual(me)
})
it('allows an edit from an older view snapshot and preserves the latest local view', async () => {
  const original = await savePerson({ values: personDefaults('Fictional Editable') })
  await recordPersonView(original.id)
  const viewed = (await db.people.get(original.id))!
  const edited = await savePerson({ original, values: { ...original, city: 'Fictional City' } })
  expect(edited.city).toBe('Fictional City')
  expect(edited.last_viewed_at).toBe(viewed.last_viewed_at)
})
it('allows delete/Undo after a view while still protecting later contact changes', async () => {
  const original = await savePerson({ values: personDefaults('Fictional Undo') })
  await recordPersonView(original.id)
  const viewed = (await db.people.get(original.id))!
  const receipt = await deletePersonWithUndo(original)
  await undoPersonDelete(receipt)
  expect((await db.people.get(original.id))?.last_viewed_at).toBe(viewed.last_viewed_at)
  const current = (await db.people.get(original.id))!
  const next = await deletePersonWithUndo(current)
  await db.people.update(original.id, { notes: 'Later fictional edit' })
  await expect(undoPersonDelete(next)).rejects.toThrow('changed after deletion')
})
