// Connected UI tests preserve Phase 3 people while adding Me, contexts and relatives.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { App } from '../App'
import { savePerson } from '../db/people'
import { personDefaults } from '../db/typed'
import { createMe } from '../db/me'
import { addToContext } from '../db/contexts'

let root: Root | undefined
beforeEach(async () => {
  await Promise.all([
    db.people.clear(),
    db.photos.clear(),
    db.contexts.clear(),
    db.memberships.clear(),
    db.relationships.clear(),
  ])
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.restoreAllMocks()
})
async function waitFor(check: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (check()) return
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
  expect(check()).toBe(true)
}
async function render(path = '/') {
  const container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root!.render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    ),
  )
  await waitFor(() => !!container.querySelector('input[name="me_name"], nav'))
  return container
}
function button(text: string, scope: ParentNode = document) {
  return Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === text,
  )!
}
async function click(element: HTMLElement) {
  await act(async () => element.click())
}
async function type(name: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(`[name="${name}"]`)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
it('requires a fictional Me name on upgrade, preserves the old person, and skips optional contexts', async () => {
  const old = await savePerson({ values: personDefaults('Fictional Phase Three') })
  const container = await render()
  expect(container.textContent).toContain('Existing people, photos and links will be kept')
  await type('me_name', '  ')
  expect(button('Continue').disabled).toBe(true)
  await type('me_name', 'Fictional Me')
  await click(button('Continue'))
  await waitFor(() => !!container.querySelector('nav'))
  expect(await db.people.get(old.id)).toEqual(old)
  expect(await db.people.filter((p) => p.is_me && !p.deleted).count()).toBe(1)
  expect(await db.memberships.count()).toBe(0)
})
it('defers context creation until the enclosing person save and cancels without writing', async () => {
  await createMe('Fictional Me', [])
  const container = await render('/add?form=1')
  await click(button('Choose a context', container))
  await click(button('Create context'))
  await type('context_name', 'Fictional Draft School')
  expect(await db.contexts.count()).toBe(0)
  await click(button('Cancel', document.querySelector('[role="dialog"]')!))
  expect(await db.contexts.count()).toBe(0)
  expect(document.querySelector('[role="dialog"]')).toBeNull()
})
it('creates a relative in a bottom sheet and shows the reciprocal link', async () => {
  await createMe('Fictional Me', [])
  const person = await savePerson({ values: personDefaults('Fictional Parent') })
  const container = await render(`/people/${person.id}`)
  await waitFor(() => !!button('Add relative', container))
  await click(button('Add relative', container))
  await click(button('Create person'))
  await type('relative_name', 'Fictional Child')
  const select = document.querySelector<HTMLSelectElement>('#relative_type')!
  await act(async () => {
    select.value = 'child'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const saveButton = button('Save relationship')
  await act(async () => {
    saveButton.click()
    saveButton.click()
  })
  await waitFor(() => !document.querySelector('[role="dialog"]'))
  await waitFor(() => container.textContent!.includes('Child: Fictional Child'))
  expect(await db.relationships.count()).toBe(1)
  expect(await db.people.count()).toBe(3)
})
it('opens a context with role labels and a preselected Add person here form', async () => {
  const me = await createMe('Fictional Me', [])
  const membership = await addToContext(me.id, {
    draft: { name: 'Fictional School', kind: 'school' },
    role: 'Student',
  })
  const container = await render(`/contexts/${membership.context_id}`)
  await waitFor(() => container.textContent!.includes('Fictional School'))
  expect(container.textContent).toContain('Student')
  const link = Array.from(container.querySelectorAll('a')).find(
    (a) => a.textContent === 'Add person here',
  )!
  await click(link)
  await waitFor(() => !!container.querySelector('[name="full_name"]'))
  await type('full_name', 'Fictional New Member')
  await click(button('Save', container))
  await waitFor(() => container.textContent!.includes('View saved person'))
  const person = await db.people.filter((p) => p.full_name === 'Fictional New Member').first()
  expect((await db.memberships.where('person_id').equals(person!.id).first())?.context_id).toBe(
    membership.context_id,
  )
})
