import type { HTMLAttributes, ReactNode } from 'react'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
}

// A soft surface card used for result rows and grouped content.
export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  )
}
