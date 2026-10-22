import type { HTMLAttributes, ReactNode } from 'react'

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  children?: ReactNode
  selected?: boolean
}

// A small fully rounded label used for categories and filters.
export function Chip({ className = '', selected = false, children, ...rest }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-chip px-3 py-1 text-xs font-medium ${
        selected ? 'bg-accent text-white' : 'bg-accent-soft text-accent'
      } ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}
