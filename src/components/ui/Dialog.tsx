import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useModalFocus } from '../../lib/useModalFocus'

export type DialogProps = {
  theme?: 'light' | 'dark'
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  footer?: ReactNode
}

// A centred modal used for confirmations and short forms.
export function Dialog({ open, onClose, title, children, footer, theme }: DialogProps) {
  const modalRef = useModalFocus(open, onClose)

  if (!open) return null

  return createPortal(
    <div
      data-theme={theme}
      className="fixed inset-0 z-50 flex text-text items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Close backdrop"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-panel sheet-enter relative z-10 overflow-y-auto w-full max-w-md rounded-t-sheet bg-surface p-5 shadow-sheet sm:rounded-card"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 flex-1 self-center break-words text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full text-accent hover:bg-accent-soft"
          >
            <span aria-hidden="true" className="text-2xl">
              ×
            </span>
          </button>
        </div>
        <div className="mt-3 text-base text-muted">{children}</div>
        {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
