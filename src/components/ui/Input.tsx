import type { InputHTMLAttributes, ReactNode } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  children?: ReactNode
}

// A single-line text field with an optional label above it.
export function Input({ label, hint, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? rest.name
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none ${className}`}
        {...rest}
      />
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}
