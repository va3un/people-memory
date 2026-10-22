import { Toaster as SonnerToaster, toast } from 'sonner'

export type ToastAction = {
  label: string
  onClick: () => void
}

export type ToastProps = {
  message: string
  description?: string
  action?: ToastAction
}

// A small helper so screens do not import the toast library directly.
export function showToast({ message, description, action }: ToastProps) {
  toast(message, {
    description,
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
          toast: 'rounded-2xl border border-border bg-surface text-text',
        },
      }}
    />
  )
}
