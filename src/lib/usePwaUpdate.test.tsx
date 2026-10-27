// Updating the app must ask before discarding an active person draft.
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { usePwaUpdate } from './usePwaUpdate'
const mocks = vi.hoisted(() => ({ register: vi.fn(), toast: vi.fn(), update: vi.fn() }))
vi.mock('virtual:pwa-register', () => ({ registerSW: mocks.register }))
vi.mock('../components/ui/Toast', () => ({ showToast: mocks.toast }))
function Consumer() {
  usePwaUpdate()
  return <form data-unsaved="true" />
}
it('keeps a waiting update inactive when the user retains an unsaved draft', async () => {
  mocks.register.mockReturnValue(mocks.update)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(<Consumer />))
  await act(async () => mocks.register.mock.calls[0][0].onNeedRefresh())
  const action = mocks.toast.mock.calls.at(-1)![0].action
  action.onClick()
  expect(confirm).toHaveBeenCalled()
  expect(mocks.update).not.toHaveBeenCalled()
  confirm.mockReturnValue(true)
  action.onClick()
  expect(mocks.update).toHaveBeenCalledWith(true)
  act(() => root.unmount())
  container.remove()
  confirm.mockRestore()
})
