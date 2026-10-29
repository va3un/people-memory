import { useMemo } from 'react'

export type AvatarProps = {
  name: string
  src?: string | null
  size?: number
  className?: string
}

// Eight soft colours. The same name always gets the same colour.
const palette = [
  '#E0E7FF',
  '#FCE7F3',
  '#DCFCE7',
  '#FEF3C7',
  '#E0F2FE',
  '#FAE8FF',
  '#FFE4E6',
  '#CCFBF1',
]

const textPalette = [
  '#3730A3',
  '#9D174D',
  '#166534',
  '#92400E',
  '#075985',
  '#86198F',
  '#9F1239',
  '#115E59',
]

// Picks a stable colour for a name using a simple hash.
export function colorForName(name: string): { background: string; color: string } {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100000
  }
  const index = hash % palette.length
  return { background: palette[index], color: textPalette[index] }
}

// Builds the initials shown when a person has no photo.
export function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// A round photo, or coloured initials when there is no photo.
export function Avatar({ name, src, size = 56, className = '' }: AvatarProps) {
  const initials = useMemo(() => initialsForName(name), [name])
  const colors = useMemo(() => colorForName(name), [name])

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colors.background,
        color: colors.color,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials}
    </span>
  )
}
