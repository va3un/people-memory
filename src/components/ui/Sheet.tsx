import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalFocus } from '../../lib/useModalFocus'

export type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
}

// A bottom sheet, the preferred picker on phones (roadmap section 11.2).
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const modalRef = useModalFocus(open, onClose)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
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
        className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-sheet bg-surface p-5 shadow-sheet"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
