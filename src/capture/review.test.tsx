// Review interactions must require identity choices after edits and recover from preference-save failure.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { createPerson, personDefaults } from '../db/typed'
import { createMe } from '../db/me'
import { parseCapture } from './schema'
import { resolveCapture } from './resolver'
import { PersonReviewCard } from '../components/capture/PersonReviewCard'
import { CaptureSettings } from '../components/settings/CaptureSettings'
let root: Root | undefined
beforeEach(async () => {
  await Promise.all([db.people.clear(), db.deviceSettings.clear()])
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.restoreAllMocks()
})
async function render(element: React.ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root!.render(element))
  return container
}
async function waitFor(check: () => boolean) {
  for (let i = 0; i < 80; i++) {
    if (check()) return
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5))
    })
  }
  expect(check()).toBe(true)
}
it('an edited name rechecks local candidates and requires an explicit existing/new choice', async () => {
  await createMe('Fictional Me', [])
  const existing = await createPerson(personDefaults('Existing Fictional Person'))
  const review = await resolveCapture(
    parseCapture('{"schema":1,"people":[{"ref":"p1","full_name":"New Fictional Name"}]}'),
    'New Fictional Name',
  )
  const row = review.people[0]
  expect(row.selected).toBe('new')
  const container = await render(
    <PersonReviewCard row={row} allPeople={review.local.people} change={() => {}} />,
  )
  const input = container.querySelector<HTMLInputElement>('#p1-name')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      existing.full_name,
    )
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(row.selected).toBe('')
  expect(row.candidates.map((p) => p.id)).toContain(existing.id)
})
it('failed surname preference writes return to the persisted default and show an actionable error', async () => {
  const fail = () => {
    throw new Error('Fictional setting failure')
  }
  db.deviceSettings.hook('creating', fail)
  const container = await render(<CaptureSettings />),
    checkbox = container.querySelector<HTMLInputElement>('input')!
  await waitFor(() => !checkbox.disabled)
  await act(async () => checkbox.click())
  await waitFor(() => !!container.querySelector('[role="alert"]'))
  expect(checkbox.checked).toBe(false)
  expect(container.textContent).toContain('Could not save this preference')
  db.deviceSettings.hook('creating').unsubscribe(fail)
  await act(async () => checkbox.click())
  await waitFor(() => !checkbox.disabled)
  expect(checkbox.checked).toBe(true)
  expect((await db.deviceSettings.get('capture:surnameSuggestions'))!.value).toBe(true)
})
