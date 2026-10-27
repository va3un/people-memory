import type { ReactNode } from 'react'
import { useModalFocus } from '../../lib/useModalFocus'

export type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  footer?: ReactNode
}

// A centred modal used for confirmations and short forms.
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const modalRef = useModalFocus(open, onClose)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-t-sheet bg-surface p-5 shadow-sheet sm:rounded-card"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3 text-base text-muted">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
