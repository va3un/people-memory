import { Toaster as SonnerToaster, toast } from 'sonner'

export type ToastAction = {
  label: string
  onClick: () => void
}

export type ToastProps = {
  duration?: number
  message: string
  description?: string
  action?: ToastAction
}

// A small helper so screens do not import the toast library directly.
export function showToast({ message, description, action, duration }: ToastProps) {
  toast(message, {
    description,
    duration,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
  })
}

// The app-wide toast host, styled to match the design tokens.
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors={false}
      closeButton
      toastOptions={{
        classNames: {
          actionButton: 'min-h-12 px-3 text-base',
          closeButton: 'min-h-12 min-w-12',
          toast: 'rounded-2xl border border-border bg-surface text-text',
        },
      }}
    />
  )
}
