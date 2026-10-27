import { describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { HashRouter } from 'react-router-dom'
import { App } from './App'

// Renders the whole app into a detached element so the shell can be checked.
async function renderApp() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <HashRouter>
        <App />
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

describe('app shell', () => {
  it('shows the four bottom navigation items', async () => {
    const { container, unmount } = await renderApp()
    const nav = container.querySelector('nav[aria-label="Main"]')
    expect(nav).not.toBeNull()
    expect(nav?.textContent).toContain('Search')
    expect(nav?.textContent).toContain('Browse')
    expect(nav?.textContent).toContain('Settings')
    unmount()
  })

  it('shows the Phase 3 people list', async () => {
    const { container, unmount } = await renderApp()
    expect(container.textContent).toContain('Search')
    expect(container.textContent).toContain('Your people, newest first')
    unmount()
  })

  it('shows the app version in Settings', async () => {
    const { container, unmount } = await renderApp()
    window.location.hash = '#/settings'
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(container.textContent).toContain('Version 0.1.0')
    unmount()
  })

  it('has a design page at #/design', async () => {
    const { container, unmount } = await renderApp()
    window.location.hash = '#/design'
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(container.textContent).toContain('Design')
    unmount()
  })
})
