// Name and text normalisation, used by search and by matching people.
// Devanagari and other scripts are kept intact, only case and spacing change.

// Removes accents from Latin letters. Other scripts are left exactly as they are.
function stripAccents(text: string): string {
  let out = ''
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    const isLatin =
      (code >= 0x00c0 && code <= 0x024f) || (code >= 0x1e00 && code <= 0x1eff)
    out += isLatin ? character.normalize('NFD').replace(/\p{Diacritic}/gu, '') : character
  }
  return out
}

// Lowercases and removes accents, keeping every other code point.
export function foldCase(text: string): string {
  return stripAccents(text).toLowerCase()
}

// Trims the text and squeezes repeated spaces into one.
export function collapseSpaces(text: string): string {
  return text.replace(/\s+/gu, ' ').trim()
}

// The normal form used to compare names: folded case, no extra spaces.
export function normalizeName(text: string): string {
  return collapseSpaces(foldCase(text))
}

// The normal form used to compare longer text such as notes.
export function normalizeText(text: string): string {
  return collapseSpaces(foldCase(text))
}

// Only the digits of a phone number, so numbers match whatever the format.
export function normalizePhone(phone: string): string {
  return phone.replace(/\D+/gu, '')
}

// True when the text contains Devanagari letters.
export function hasDevanagari(text: string): boolean {
  return /\p{Script=Devanagari}/u.test(text)
}

// The first letters of the first and last words, for an avatar.
export function initialsFromName(text: string): string {
  const parts = normalizeName(text).split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// True when two names are the same after normalisation.
export function sameName(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b)
}

// Words that should not be used on their own when matching.
export const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'of', 'in', 'at', 'to'])

// Splits text into useful words for matching.
// Letters, numbers and marks are kept together, so Devanagari stays whole.
export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
}
