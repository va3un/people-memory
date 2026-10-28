// Search UI integration verifies live index refresh, data preservation, history and accessible explanations.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { db } from '../db/database'
import { loadSampleData } from '../db/operations'
import { SAMPLE_IDS } from '../db/sampleData'
import { savePerson, deletePersonWithUndo, undoPersonDelete } from '../db/people'
import { personDefaults } from '../db/typed'
import { DirectoryProvider } from '../search/DirectoryProvider'
import { SearchPage } from './SearchPage'
import { PersonPage } from './PersonPage'
import { ContextPage } from './ContextPage'

let root: Root | undefined
beforeEach(async () => {
  await Promise.all([
    db.people.clear(),
    db.contexts.clear(),
    db.memberships.clear(),
    db.relationships.clear(),
    db.photos.clear(),
    db.deviceSettings.clear(),
  ])
  await loadSampleData()
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
})
async function waitFor(check: () => boolean | Promise<boolean>) {
  for (let i = 0; i < 150; i++) {
    if (await check()) return
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
  expect(await check()).toBe(true)
}
async function render() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root!.render(
      <MemoryRouter>
        <DirectoryProvider>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/people/:id" element={<PersonPage />} />
            <Route path="/contexts/:id" element={<ContextPage />} />
          </Routes>
        </DirectoryProvider>
      </MemoryRouter>,
    ),
  )
  await waitFor(() => !!container.querySelector('[aria-label="Recently added"]'))
  return container
}
async function query(container: HTMLElement, value: string) {
  const input = container.querySelector<HTMLInputElement>('input[name="search"]')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function click(element: HTMLElement) {
  await act(async () => element.click())
}
const resultText = (container: HTMLElement) =>
  container.querySelector('[aria-label="Search results"]')?.textContent ?? ''

it('shows ranked name and one-hop explanations, and querying never changes the stored records', async () => {
  const before = await db.people.toArray()
  const container = await render()
  await query(container, 'Meera')
  expect(resultText(container)).toContain('Matched name: Meera Joshi')
  expect(resultText(container)).toContain('Husband of Meera Joshi')
  expect(resultText(container)).toContain('Daughter of Meera Joshi')
  expect(container.querySelector('[aria-label="Search results"] li')?.textContent).toContain(
    'Meera Joshi',
  )
  await query(container, 'meera husband')
  expect(container.querySelectorAll('[aria-label="Search results"] li')).toHaveLength(1)
  expect(resultText(container)).toContain('Anil Joshi')
  expect(await db.people.toArray()).toEqual(before)
  expect(await db.deviceSettings.count()).toBe(0)
})
it('refreshes existing context and membership clues after committed changes', async () => {
  const container = await render()
  await query(container, 'Lionbridge')
  expect(container.querySelectorAll('[aria-label="Search results"] li')).toHaveLength(2)
  const membership = (await db.memberships.where('person_id').equals(SAMPLE_IDS.anil).first())!
  await act(async () => {
    await db.memberships.update(membership.id, { role: 'FictionalMentor' })
  })
  await waitFor(() => resultText(container).includes('FictionalMentor at Lionbridge'))
  await act(async () => {
    await db.contexts.update(SAMPLE_IDS.lionbridge, { name: 'FictionalOffice' })
  })
  await waitFor(() => resultText(container).includes('0 people found'))
  await query(container, 'fictionaloffice fictionalmentor')
  expect(resultText(container)).toContain('Anil Joshi')
})
it('refreshes names and related clues after edits, deletion and Undo', async () => {
  const container = await render()
  await query(container, 'Meera')
  const original = (await db.people.get(SAMPLE_IDS.meera))!
  let edited = original
  await act(async () => {
    edited = await savePerson({
      original,
      values: {
        ...original,
        full_name: 'Uniquely Renamed',
        display_name: 'Uniquely',
        nicknames: [],
      },
    })
  })
  await waitFor(() => resultText(container).includes('0 people found'))
  await query(container, 'Uniquely')
  expect(resultText(container)).toContain('Husband of Uniquely Renamed')
  let receipt: Awaited<ReturnType<typeof deletePersonWithUndo>>
  await act(async () => {
    receipt = await deletePersonWithUndo(edited)
  })
  await waitFor(() => resultText(container).includes('0 people found'))
  await act(async () => {
    await undoPersonDelete(receipt!)
  })
  await waitFor(() => resultText(container).includes('Husband of Uniquely Renamed'))
})
it('shows recently viewed people and context shortcuts without changing contact timestamps', async () => {
  const original = (await db.people.get(SAMPLE_IDS.meera))!
  const container = await render()
  const link = Array.from(
    container.querySelectorAll<HTMLAnchorElement>('[aria-label="Recently added"] a'),
  ).find((a) => a.textContent?.includes('Meera Joshi'))!
  await click(link)
  await waitFor(async () => !!(await db.people.get(SAMPLE_IDS.meera))?.last_viewed_at)
  await waitFor(() =>
    Array.from(container.querySelectorAll('a')).some(
      (a) => a.textContent?.trim() === 'Back to people',
    ),
  )
  const back = Array.from(container.querySelectorAll('a')).find(
    (a) => a.textContent?.trim() === 'Back to people',
  )!
  await click(back)
  await waitFor(
    () =>
      container
        .querySelector('[aria-label="Recently viewed"]')
        ?.textContent?.includes('Meera Joshi') ?? false,
  )
  expect((await db.people.get(SAMPLE_IDS.meera))?.updated_at).toBe(original.updated_at)
  const context = Array.from(container.querySelectorAll('a')).find(
    (a) => a.textContent === 'Lionbridge (2)',
  )!
  await click(context)
  await waitFor(() => container.querySelector('h1')?.textContent === 'Lionbridge')
  expect(container.textContent).toContain('Colleague')
})
it('paginates search results and the empty-query people list, and Clear restores recents', async () => {
  const now = new Date().toISOString()
  await db.people.bulkAdd(
    Array.from({ length: 65 }, (_, index) => ({
      ...personDefaults(`FictionalPagination ${index}`),
      created_at: now,
      updated_at: now,
      deleted: false,
    })),
  )
  const container = await render()
  await query(container, 'fictionalpagination')
  expect(resultText(container)).toContain('65 people found')
  expect(container.querySelectorAll('[aria-label="Search results"] li')).toHaveLength(50)
  await click(
    Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Show more results',
    )!,
  )
  expect(container.querySelectorAll('[aria-label="Search results"] li')).toHaveLength(65)
  await click(container.querySelector('[aria-label="Clear search"]')!)
  expect(container.querySelectorAll('[aria-label="Recently added"] li')).toHaveLength(12)
  await click(
    Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Show more people',
    )!,
  )
  expect(container.querySelectorAll('[aria-label="Recently added"] li')).toHaveLength(62)
})
it('renders user-controlled names as text and provides an actionable empty state', async () => {
  await savePerson({ values: personDefaults('FictionalHtml <img src=x onerror=alert(1)>') })
  const container = await render()
  await query(container, 'fictionalhtml')
  expect(resultText(container)).toContain('<img src=x onerror=alert(1)>')
  expect(container.querySelector('img[onerror]')).toBeNull()
  await query(container, 'nonexistentuniqueword')
  expect(resultText(container)).toContain('No people match these clues')
  expect(container.querySelector('[aria-label="Search results"] a')?.textContent).toBe(
    'Add a person',
  )
})
