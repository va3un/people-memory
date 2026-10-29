// Saving a required local backup must not discard the active import preview.
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useUnsavedDraft } from './useUnsavedDraft'
function Draft() {
  useUnsavedDraft(true)
  return null
}
it('allows blob downloads while continuing to guard navigation away from the draft', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await act(async () => root.render(<Draft />))
  const link = document.createElement('a')
  link.href = 'blob:http://localhost/fictional'
  link.download = 'fictional.json'
  container.appendChild(link)
  // Prevent jsdom navigation after recording whether the capture guard cancelled the click.
  let cancelled = false
  link.addEventListener('click', (event) => {
    cancelled = event.defaultPrevented
    event.preventDefault()
  })
  link.click()
  expect(confirm).not.toHaveBeenCalled()
  expect(cancelled).toBe(false)
  link.removeAttribute('download')
  link.href = '#/browse'
  const navigation = new MouseEvent('click', { bubbles: true, cancelable: true })
  link.dispatchEvent(navigation)
  expect(confirm).toHaveBeenCalledOnce()
  expect(navigation.defaultPrevented).toBe(true)
  act(() => root.unmount())
  container.remove()
  confirm.mockRestore()
})
