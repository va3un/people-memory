// Verify the Phase 3 list, profile and editor as connected user flows.
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { db } from '../db/database'
import { savePerson } from '../db/people'
import { personDefaults } from '../db/typed'
import { DirectoryProvider } from '../search/DirectoryProvider'
import { SearchPage } from './SearchPage'
import { PersonPage } from './PersonPage'
import { EditPersonPage } from './EditPersonPage'

async function render(path: string) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <DirectoryProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/people/:id" element={<PersonPage />} />
            <Route path="/people/:id/edit" element={<EditPersonPage />} />
          </Routes>
        </MemoryRouter>
      </DirectoryProvider>,
    )
  })
  for (let attempt = 0; attempt < 100 && container.querySelector('[role="status"]'); attempt++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
  return {
    container,
    close: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}
beforeEach(async () => {
  await Promise.all([db.people.clear(), db.photos.clear(), db.relationships.clear()])
})
afterEach(() => {
  window.location.hash = ''
})

it('shows all active ordinary people in creation order and excludes deleted people and Me', async () => {
  await savePerson({
    values: {
      ...personDefaults('Fictional Older'),
      created_at: '2020-01-01T00:00:00.000Z',
      updated_at: '2030-01-01T00:00:00.000Z',
    },
  })
  await savePerson({
    values: { ...personDefaults('Fictional Newer'), created_at: '2021-01-01T00:00:00.000Z' },
  })
  await savePerson({ values: { ...personDefaults('Fictional Hidden'), deleted: true } })
  await savePerson({ values: { ...personDefaults('Fictional Me'), is_me: true } })
  const { container, close } = await render('/')
  const text = container.textContent ?? ''
  expect(text.indexOf('Fictional Newer')).toBeLessThan(text.indexOf('Fictional Older'))
  expect(text).not.toContain('Fictional Hidden')
  expect(text).not.toContain('Fictional Me')
  close()
})
it('shows the correct reciprocal gender labels with a single stored relationship', async () => {
  const mother = await savePerson({
    values: { ...personDefaults('Fictional Mother'), gender: 'female' },
  })
  const son = await savePerson({
    values: { ...personDefaults('Fictional Son'), gender: 'male' },
    relativeId: mother.id,
    relationshipType: 'child',
  })
  const first = await render(`/people/${mother.id}`)
  expect(first.container.textContent).toContain('Son: Fictional Son')
  first.close()
  const second = await render(`/people/${son.id}`)
  expect(second.container.textContent).toContain('Mother: Fictional Mother')
  second.close()
  expect(await db.relationships.count()).toBe(1)
})
it('loads existing values into the editor and hides deleted relatives', async () => {
  const relative = await savePerson({
    values: { ...personDefaults('Fictional Deleted Relative'), deleted: true },
  })
  const person = await savePerson({
    values: { ...personDefaults('Fictional Editor'), notes: 'Fictional notes', city: 'Test City' },
  })
  await db.relationships.put({
    id: 'fictional-link',
    created_at: person.created_at,
    updated_at: person.updated_at,
    deleted: false,
    person_id: person.id,
    relative_id: relative.id,
    type: 'friend',
  })
  const profile = await render(`/people/${person.id}`)
  expect(profile.container.textContent).toContain('Fictional notes')
  expect(profile.container.textContent).not.toContain('Fictional Deleted Relative')
  profile.close()
  const edit = await render(`/people/${person.id}/edit`)
  expect((edit.container.querySelector('[name="full_name"]') as HTMLInputElement).value).toBe(
    'Fictional Editor',
  )
  expect((edit.container.querySelector('[name="city"]') as HTMLInputElement).value).toBe(
    'Test City',
  )
  edit.close()
})
