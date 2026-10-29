import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent text-accent-foreground hover:brightness-95',
  secondary: 'bg-surface text-text border border-border hover:bg-accent-soft',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft',
  danger: 'bg-danger text-danger-foreground hover:brightness-95',
}

const sizeClass: Record<Size, string> = {
  sm: 'min-h-12 px-3 py-2 text-base rounded-xl',
  md: 'min-h-12 px-4 py-3 rounded-2xl',
  lg: 'min-h-12 px-5 py-3 text-base rounded-2xl w-full',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children?: ReactNode
}

// The main tappable button used across the app.
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-w-12 items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
