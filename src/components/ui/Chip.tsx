import type { HTMLAttributes, ReactNode } from 'react'

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  children?: ReactNode
  selected?: boolean
}

// A small fully rounded label used for categories and filters.
export function Chip({ className = '', selected = false, children, ...rest }: ChipProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 break-words rounded-chip px-3 py-1 caption font-medium ${
        selected ? 'bg-accent text-accent-foreground' : 'bg-accent-soft text-accent'
      } ${className}`}
      {...rest}
    >
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </span>
  )
}
