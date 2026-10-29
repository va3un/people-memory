import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, Ref } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>
  label?: string
  hint?: string
  children?: ReactNode
}

// A single-line text field with an optional label above it.
export function Input({ label, hint, className = '', id, ...rest }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? rest.name ?? generatedId
  const description =
    [rest['aria-describedby'], hint ? `${inputId}-hint` : undefined].filter(Boolean).join(' ') ||
    undefined
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {label ? (
        <label htmlFor={inputId} className="text-base font-medium text-text">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`min-h-12 py-3 w-full rounded-2xl border border-border bg-surface px-4 text-base text-text placeholder:text-muted focus:border-accent aria-invalid:border-danger ${className}`}
        {...rest}
        aria-describedby={description}
      />
      {hint ? (
        <p id={`${inputId}-hint`} className="caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
