// Browse projections exclude deleted endpoints and keep counts distinct across multiple roles.
import { beforeEach, expect, it } from 'vitest'
import { db } from './database'
import { savePerson } from './people'
import { personDefaults } from './typed'
import { createMe } from './me'
import { addToContext } from './contexts'
import { addRelative } from './relatives'
import { readBrowse, readContext, readConnections } from './views'

beforeEach(async () => {
  await Promise.all([
    db.people.clear(),
    db.photos.clear(),
    db.relationships.clear(),
    db.contexts.clear(),
    db.memberships.clear(),
  ])
})
it('counts each active context member once, includes Me, and ignores tombstones', async () => {
  const me = await createMe('Fictional Me', [])
  const person = await savePerson({ values: personDefaults('Fictional Member') })
  const first = await addToContext(person.id, {
    draft: { name: 'Fictional School', kind: 'school' },
    role: 'Teacher',
  })
  await addToContext(person.id, { contextId: first.context_id, role: 'Parent' })
  await addToContext(me.id, { contextId: first.context_id, role: 'Student' })
  expect((await readBrowse()).contexts[0].count).toBe(2)
  const detail = await readContext(first.context_id)
  expect(detail.people).toHaveLength(2)
  expect(detail.people.find((p) => p.person.id === person.id)?.memberships).toHaveLength(2)
  await db.people.update(person.id, { deleted: true })
  expect((await readBrowse()).contexts[0].count).toBe(1)
  await db.contexts.update(first.context_id, { deleted: true })
  expect((await readBrowse()).contexts).toHaveLength(0)
  expect((await readContext(first.context_id)).context).toBeUndefined()
})
it('groups assigned categories by normalized text and hides Me and deleted people', async () => {
  await savePerson({ values: { ...personDefaults('Fictional First'), category: 'Friend' } })
  await savePerson({ values: { ...personDefaults('Fictional Second'), category: ' friend ' } })
  await savePerson({
    values: { ...personDefaults('Fictional Deleted'), category: 'Friend', deleted: true },
  })
  await savePerson({
    values: { ...personDefaults('Fictional Me'), category: 'Friend', is_me: true },
  })
  expect((await readBrowse()).categories).toEqual([
    { key: 'friend', name: expect.stringMatching(/^friend$/i), count: 2 },
  ])
})
it('filters deleted memberships, contexts and relatives out of profile sections', async () => {
  const person = await savePerson({ values: personDefaults('Fictional Person') })
  const relative = await savePerson({ values: personDefaults('Fictional Relative') })
  const link = await addRelative(person.id, { personId: relative.id }, 'parent')
  const membership = await addToContext(person.id, {
    draft: { name: 'Fictional Place', kind: 'place' },
    role: 'Resident',
  })
  expect((await readConnections(person.id)).relatives[0].type).toBe('parent')
  await db.relationships.update(link.id, { deleted: true })
  await db.memberships.update(membership.id, { deleted: true })
  expect(await readConnections(person.id)).toEqual({ relatives: [], contexts: [] })
})
