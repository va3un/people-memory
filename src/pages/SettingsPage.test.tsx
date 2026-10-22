// Tests for the Settings developer tools.
import { describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { HashRouter } from 'react-router-dom'
import { SettingsPage } from './SettingsPage'
import { db } from '../db/database'
import { createPerson } from '../db/typed'

// Renders the Settings screen into a detached element so it can be checked.
async function renderSettings() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <HashRouter>
        <SettingsPage />
      </HashRouter>,
    )
  })

  return {
    container,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

// Finds a button by the words inside it. Use exact when the same words
// appear on more than one button, such as the trigger and the dialog button.
function buttonByText(
  container: HTMLElement,
  text: string,
  exact = false,
): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((button) => {
    const label = (button.textContent ?? '').trim()
    return exact ? label === text : label.includes(text)
  })
}

// Finds a button inside the open dialog only.
function dialogButton(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  const dialog = container.querySelector('[role="dialog"]')
  if (!dialog) return undefined
  return Array.from(dialog.querySelectorAll('button')).find(
    (button) => (button.textContent ?? '').trim() === text,
  )
}

// Waits until a check passes, so a button that is busy for a moment is not
// tapped too early.
async function waitFor(check: () => boolean | Promise<boolean>, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    if (await check()) return true
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
  return await check()
}

// Types the confirmation word into the box in the dialog.
async function typeConfirmationWord(container: HTMLElement) {
  const input = container.querySelector('input[aria-label="Confirmation word"]') as HTMLInputElement
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set
    setter?.call(input, 'DELETE')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clearDatabase() {
  await db.open()
  await db.people.clear()
  await db.contexts.clear()
  await db.memberships.clear()
  await db.relationships.clear()
}

describe('settings developer tools', () => {
  it('shows the developer section marked as test data only', async () => {
    await clearDatabase()
    const { container, unmount } = await renderSettings()

    expect(container.textContent).toContain('Developer tools')
    expect(container.textContent).toContain('Test data only')
    expect(buttonByText(container, 'Load sample data')).toBeDefined()
    unmount()
  })

  it('shows the counts of records', async () => {
    await clearDatabase()
    const { container, unmount } = await renderSettings()

    expect(container.textContent).toContain('People')
    expect(container.textContent).toContain('Relationships')
    unmount()
  })

  it('loads the sample data when the button is tapped', async () => {
    await clearDatabase()
    const { container, unmount } = await renderSettings()

    const button = buttonByText(container, 'Load sample data')
    await act(async () => {
      button?.click()
    })

    const people = await db.people.toArray()
    expect(people.length).toBe(8)
    unmount()
  })

  it('asks for the confirmation word before deleting the sample data', async () => {
    await clearDatabase()
    const { container, unmount } = await renderSettings()

    const button = buttonByText(container, 'Delete sample data')
    await act(async () => {
      button?.click()
    })

    expect(container.textContent).toContain('Delete sample data?')
    expect(container.textContent).toContain('Type DELETE to confirm')
    unmount()
  })

  it('does not delete anything until the confirmation word is typed', async () => {
    await clearDatabase()
    const { container, unmount } = await renderSettings()

    await act(async () => {
      buttonByText(container, 'Delete sample data')?.click()
    })

    const deleteButton = dialogButton(container, 'Delete sample data') as HTMLButtonElement
    expect(deleteButton.disabled).toBe(true)

    await typeConfirmationWord(container)

    const enabledButton = dialogButton(container, 'Delete sample data') as HTMLButtonElement
    expect(enabledButton.disabled).toBe(false)

    await act(async () => {
      enabledButton.click()
    })

    const people = await db.people.toArray()
    expect(people.length).toBe(0)
    unmount()
  })

  it('keeps a real person when the sample data is deleted', async () => {
    await clearDatabase()
    const real = await createPerson({
      full_name: 'Real Person',
      display_name: 'Real',
      nicknames: [],
      phones: [],
      gender: 'unknown',
      is_me: false,
    })
    const { container, unmount } = await renderSettings()

    await act(async () => {
      buttonByText(container, 'Load sample data')?.click()
    })
    await waitFor(() => buttonByText(container, 'Delete sample data')?.disabled === false)

    await act(async () => {
      buttonByText(container, 'Delete sample data')?.click()
    })
    await typeConfirmationWord(container)
    await act(async () => {
      ;(dialogButton(container, 'Delete sample data') as HTMLButtonElement).click()
    })

    const saved = await db.people.get(real.id)
    expect(saved?.deleted).toBe(false)
    expect(saved?.full_name).toBe('Real Person')
    const sample = await db.people.get('sample-person-anil')
    expect(sample?.deleted).toBe(true)
    unmount()
  })
})
