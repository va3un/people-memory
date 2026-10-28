// Fictional-data regressions cover onboarding preservation, atomic links and reciprocal duplicates.
import { beforeEach, expect, it } from 'vitest'
import { db } from './database'
import { createMe, readMe } from './me'
import { addRelative } from './relatives'
import { addToContext, type ContextChoice } from './contexts'
import { savePerson, deletePersonWithUndo } from './people'
import { personDefaults } from './typed'
import { loadSampleData } from './operations'
import { reverseType, relationshipLabel } from '../domain/relationships'

beforeEach(async () => {
  await Promise.all([db.people.clear(), db.photos.clear(), db.relationships.clear(), db.contexts.clear(), db.memberships.clear(), db.deviceSettings.clear()])
})
const school = (): ContextChoice => ({ draft: { name: 'Fictional School', kind: 'school' }, role: 'Student' })

it('preserves every Phase 3 record, photo and link during first-run setup', async () => {
  const person = await savePerson({ values: { ...personDefaults('Fictional Phase Three'), notes: 'Keep this unchanged' } })
  await db.photos.put({ id: 'fictional-photo', person_id: person.id, blob: new Blob(['fictional']), mime: 'image/jpeg', width: 1, height: 1, bytes: 9, created_at: person.created_at, updated_at: person.updated_at, deleted: false })
  const other = await savePerson({ values: personDefaults('Fictional Existing Relative'), relativeId: person.id, relationshipType: 'friend' })
  const links = await db.relationships.toArray()
  const me = await createMe('Fictional Me', [school()])
  expect(await db.people.get(person.id)).toEqual(person)
  expect(await db.people.get(other.id)).toEqual(other)
  expect(await db.relationships.toArray()).toEqual(links)
  expect((await db.photos.get('fictional-photo'))?.bytes).toBe(9)
  expect((await readMe())?.id).toBe(me.id)
  expect(await db.memberships.where('person_id').equals(me.id).count()).toBe(1)
})
it('allows skipping optional Me contexts and ignores deleted Me records', async () => {
  await db.people.put({ ...personDefaults('Fictional Old Me'), id: 'fictional-deleted-me', created_at: '2020-01-01T00:00:00.000Z', updated_at: '2020-01-01T00:00:00.000Z', is_me: true, deleted: true })
  await createMe('Fictional New Me', [])
  expect(await db.people.filter(p => p.is_me && !p.deleted).count()).toBe(1)
  expect(await db.memberships.count()).toBe(0)
  expect((await db.people.get('fictional-deleted-me'))?.deleted).toBe(true)
})
it('serializes concurrent onboarding so exactly one Me is saved', async () => {
  const results = await Promise.allSettled([createMe('Fictional First', []), createMe('Fictional Second', [])])
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  expect(await db.people.filter(p => p.is_me && !p.deleted).count()).toBe(1)
})
it('rolls back Me and every optional context if one choice is invalid', async () => {
  await expect(createMe('Fictional Me', [school(), { contextId: 'fictional-missing' }])).rejects.toThrow('no longer available')
  expect(await db.people.count()).toBe(0)
  expect(await db.contexts.count()).toBe(0)
  expect(await db.memberships.count()).toBe(0)
})
it('rejects blank Me names without touching existing ordinary people', async () => {
  const person = await savePerson({ values: personDefaults('Fictional Existing') })
  await expect(createMe('   ', [])).rejects.toThrow('Enter a name')
  expect(await db.people.toArray()).toEqual([person])
})
it('does not replace an existing Me or let fixture loading create another', async () => {
  const me = await createMe('Fictional Me', [])
  await expect(createMe('Fictional Other Me', [])).rejects.toThrow('already exists')
  await loadSampleData()
  expect(await db.people.filter(p => p.is_me && !p.deleted).count()).toBe(1)
  expect(await db.people.get(me.id)).toEqual(me)
  const people = new Set((await db.people.toArray()).map(p => p.id))
  expect((await db.memberships.toArray()).every(m => people.has(m.person_id))).toBe(true)
})
it('keeps Me editable but prevents deleting or reassigning the Me identity', async () => {
  const me = await createMe('Fictional Me', [])
  await expect(deletePersonWithUndo(me)).rejects.toThrow('Keep your Me profile')
  await expect(savePerson({ original: me, values: { ...me, is_me: false } })).rejects.toThrow('cannot be changed')
  const edited = await savePerson({ original: me, values: { ...me, full_name: 'Fictional Me Edited' } })
  expect(edited.id).toBe(me.id)
  expect(edited.is_me).toBe(true)
})
it('atomically saves a quick-add person, context and membership', async () => {
  const person = await savePerson({ values: personDefaults('Fictional Student'), contextChoice: school() })
  const membership = (await db.memberships.toArray())[0]
  expect(membership).toMatchObject({ person_id: person.id, role: 'Student' })
  expect((await db.contexts.get(membership.context_id))?.name).toBe('Fictional School')
})
it('rolls back a new person and relationship when context validation fails', async () => {
  const relative = await savePerson({ values: personDefaults('Fictional Relative') })
  await expect(savePerson({ values: personDefaults('Fictional Invalid'), relativeId: relative.id, relationshipType: 'friend', contextChoice: { draft: { name: ' ', kind: 'school' } } })).rejects.toThrow('context name')
  expect(await db.people.count()).toBe(1)
  expect(await db.relationships.count()).toBe(0)
})
it('reuses exact normalized context matches and repeated memberships without overwriting notes', async () => {
  const person = await savePerson({ values: personDefaults('Fictional Student') })
  const first = await addToContext(person.id, school())
  await db.contexts.update(first.context_id, { notes: 'Fictional preserved note' })
  const second = await addToContext(person.id, { draft: { name: '  FICTIONAL  SCHOOL ', kind: 'school' }, role: ' student ' })
  expect(second.id).toBe(first.id)
  expect(await db.contexts.count()).toBe(1)
  expect((await db.contexts.get(first.context_id))?.notes).toBe('Fictional preserved note')
})
it('keeps distinct cities and roles separate and excludes deleted contexts', async () => {
  const person = await savePerson({ values: personDefaults('Fictional Student') })
  const first = await addToContext(person.id, school())
  await addToContext(person.id, { contextId: first.context_id, role: 'Teacher' })
  await addToContext(person.id, { draft: { name: 'Fictional School', kind: 'school', city: 'Fictional City' } })
  expect(await db.contexts.count()).toBe(2)
  expect(await db.memberships.count()).toBe(3)
  await db.contexts.update(first.context_id, { deleted: true })
  await expect(addToContext(person.id, { contextId: first.context_id })).rejects.toThrow('no longer available')
})
it('rolls back a profile context and membership on storage failure and allows retry', async () => {
  const person = await savePerson({ values: personDefaults('Fictional Retry') })
  const fail = () => { throw new Error('Fictional storage failure') }
  db.memberships.hook('creating', fail)
  try { await expect(addToContext(person.id, school())).rejects.toThrow('storage failure') }
  finally { db.memberships.hook('creating').unsubscribe(fail) }
  expect(await db.contexts.count()).toBe(0)
  await addToContext(person.id, school())
  expect(await db.contexts.count()).toBe(1)
})
it('stores Anil spouse of Meera once and derives Husband and Wife in the proper directions', async () => {
  const anil = await savePerson({ values: { ...personDefaults('Anil Joshi'), gender: 'male' } })
  const meera = await savePerson({ values: { ...personDefaults('Meera Joshi'), gender: 'female' } })
  const link = await addRelative(meera.id, { personId: anil.id }, 'spouse')
  await addRelative(anil.id, { personId: meera.id }, 'spouse')
  expect(await db.relationships.count()).toBe(1)
  expect(link).toMatchObject({ person_id: anil.id, relative_id: meera.id, type: 'spouse' })
  expect(relationshipLabel(link.type, anil.gender)).toBe('Husband')
  expect(relationshipLabel(reverseType(link.type), meera.gender)).toBe('Wife')
})
it('recognizes an inverse parent/child link without creating another stored row', async () => {
  const parent = await savePerson({ values: personDefaults('Fictional Parent') })
  const child = await savePerson({ values: personDefaults('Fictional Child') })
  const link = await addRelative(child.id, { personId: parent.id }, 'parent')
  expect((await addRelative(parent.id, { personId: child.id }, 'child')).id).toBe(link.id)
})
it('creates a relative and link atomically without assuming gender or surname', async () => {
  const target = await savePerson({ values: personDefaults('Fictional Target') })
  const link = await addRelative(target.id, { newPerson: { name: 'Fictional', gender: 'unknown' } }, 'child')
  expect(await db.people.get(link.person_id)).toMatchObject({ full_name: 'Fictional', gender: 'unknown' })
  expect(await db.relationships.count()).toBe(1)
})
it('rolls back a newly created relative when saving its relationship fails', async () => {
  const target = await savePerson({ values: personDefaults('Fictional Target') })
  const fail = () => { throw new Error('Fictional link failure') }
  db.relationships.hook('creating', fail)
  try { await expect(addRelative(target.id, { newPerson: { name: 'Fictional New', gender: 'unknown' } }, 'sibling')).rejects.toThrow('link failure') }
  finally { db.relationships.hook('creating').unsubscribe(fail) }
  expect(await db.people.count()).toBe(1)
})
it('rejects self relationships and deleted endpoints without reviving data', async () => {
  const target = await savePerson({ values: personDefaults('Fictional Target') })
  await expect(addRelative(target.id, { personId: target.id }, 'friend')).rejects.toThrow('different person')
  await deletePersonWithUndo(target)
  await expect(addRelative(target.id, { newPerson: { name: 'Fictional New', gender: 'unknown' } }, 'friend')).rejects.toThrow('no longer available')
  expect(await db.people.count()).toBe(1)
})
