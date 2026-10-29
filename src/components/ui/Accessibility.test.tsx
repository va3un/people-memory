// Verify keyboard operation and assistive descriptions rather than CSS class names.
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'
import { Input } from './Input'
import { Sheet } from './Sheet'
import { Dialog } from './Dialog'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
})
function mount(content: React.ReactNode) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() => root.render(content))
  dispose = () => {
    act(() => root.unmount())
    host.remove()
  }
  return host
}

it('associates unnamed fields with unique labels and both existing and hint descriptions', () => {
  const host = mount(
    <>
      <p id="external">Additional explanation</p>
      <Input label="First example" hint="First hint" aria-describedby="external" />
      <Input label="Second example" hint="Second hint" />
    </>,
  )
  const inputs = [...host.querySelectorAll('input')]
  expect(inputs[0].id).not.toBe(inputs[1].id)
  expect(host.querySelector('label')?.htmlFor).toBe(inputs[0].id)
  const descriptions = inputs[0].getAttribute('aria-describedby')!.split(' ')
  expect(descriptions.map((id) => document.getElementById(id)?.textContent)).toEqual([
    'Additional explanation',
    'First hint',
  ])
})

for (const Modal of [Sheet, Dialog]) {
  it(`${Modal.name} traps Tab, closes with Escape, restores focus and releases the scroll lock`, () => {
    function Demo() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open example</button>
          <Modal title="Example picker" open={open} onClose={() => setOpen(false)}>
            <button>Last control</button>
          </Modal>
        </>
      )
    }
    const host = mount(<Demo />)
    const opener = host.querySelector('button')!
    opener.focus()
    act(() => opener.click())
    const modal = document.querySelector('[role="dialog"]')!
    const close = modal.querySelector<HTMLButtonElement>('[aria-label="Close"]')!
    const last = modal.querySelectorAll('button')[1]
    expect(document.activeElement).toBe(last)
    close.focus()
    expect(document.body.style.overflow).toBe('hidden')
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
      ),
    )
    expect(document.activeElement).toBe(last)
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })))
    expect(document.activeElement).toBe(close)
    act(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe('')
  })
}
