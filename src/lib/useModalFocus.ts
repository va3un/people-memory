// Keep keyboard focus inside a modal and return it to the opener when closed.
import { useEffect, useRef } from 'react'

export function useModalFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open || !ref.current) return
    const panel = ref.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const opener = document.activeElement as HTMLElement | null
    const controls = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      )
    // Keep the first form field / safe Cancel action focused when a close icon is added.
    const focusFirst = () =>
      (
        controls().find((item) => item.getAttribute('aria-label') !== 'Close') ??
        controls()[0] ??
        panel
      ).focus()
    focusFirst()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = controls()
      const first = items[0] ?? panel,
        last = items.at(-1) ?? panel
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === panel)
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    const focus = (event: FocusEvent) => {
      if (!panel.contains(event.target as Node)) focusFirst()
    }
    document.addEventListener('keydown', keydown)
    document.addEventListener('focusin', focus)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('focusin', focus)
      if (opener?.isConnected) opener.focus()
    }
  }, [open])
  return ref
}
