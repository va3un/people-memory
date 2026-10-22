// Tests for the Settings developer tools.
import { describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { HashRouter } from 'react-router-dom'
import { SettingsPage } from './SettingsPage'
import { db } from '../db/database'

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

// Finds a button by the words inside it.
function buttonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    (button.textContent ?? '').includes(text),
  )
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

  it('asks for the confirmation word before deleting everything', async () => {
    await clearDatabase()
    const { container, unmount } = await renderSettings()

    const button = buttonByText(container, 'Delete all data')
    await act(async () => {
      button?.click()
    })

    expect(container.textContent).toContain('Delete all data?')
    expect(container.textContent).toContain('Type DELETE to confirm')
    unmount()
  })

  it('does not delete anything until the confirmation word is typed', async () => {
    await clearDatabase()
    const { container, unmount } = await renderSettings()

    await act(async () => {
      buttonByText(container, 'Delete all data')?.click()
    })

    const deleteButton = buttonByText(container, 'Delete everything') as HTMLButtonElement
    expect(deleteButton.disabled).toBe(true)

    const input = container.querySelector('input[aria-label="Confirmation word"]') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(input, 'DELETE')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const enabledButton = buttonByText(container, 'Delete everything') as HTMLButtonElement
    expect(enabledButton.disabled).toBe(false)

    await act(async () => {
      enabledButton.click()
    })

    const people = await db.people.toArray()
    expect(people.length).toBe(0)
    unmount()
  })
})
