// Tests for the text normalisation used by search and matching.
import { describe, expect, it } from 'vitest'
import {
  collapseSpaces,
  foldCase,
  hasDevanagari,
  initialsFromName,
  normalizeName,
  normalizePhone,
  normalizeText,
  sameName,
  tokenize,
} from './names'

describe('normalizeName', () => {
  it('ignores case', () => {
    expect(normalizeName('Meera Joshi')).toBe('meera joshi')
  })

  it('ignores accents', () => {
    expect(normalizeName('Chetana Mehta')).toBe('chetana mehta')
    expect(normalizeName('Chétana')).toBe('chetana')
  })

  it('removes extra spaces', () => {
    expect(normalizeName('  Anil   Joshi ')).toBe('anil joshi')
  })

  it('keeps Devanagari code points intact', () => {
    expect(normalizeName('मीरा')).toBe('मीरा')
    expect(normalizeName('मीरा जोशी')).toBe('मीरा जोशी')
  })

  it('does not corrupt other scripts', () => {
    expect(normalizeName('François')).toBe('francois')
    expect(normalizeName('Ольга')).toBe('ольга')
  })
})

describe('foldCase', () => {
  it('lowercases and removes accents', () => {
    expect(foldCase('École')).toBe('ecole')
  })
})

describe('collapseSpaces', () => {
  it('trims and squeezes spaces', () => {
    expect(collapseSpaces('  a   b  ')).toBe('a b')
  })

  it('keeps the original case', () => {
    expect(collapseSpaces('  A   B  ')).toBe('A B')
  })
})

describe('normalizeText', () => {
  it('folds case, accents and spaces together', () => {
    expect(normalizeText('  Lionbridge   SOFTWARE ')).toBe('lionbridge software')
  })
})

describe('normalizePhone', () => {
  it('keeps only the digits', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('919876543210')
  })

  it('handles numbers written with dashes', () => {
    expect(normalizePhone('020-1234-5678')).toBe('02012345678')
  })
})

describe('hasDevanagari', () => {
  it('spots Devanagari text', () => {
    expect(hasDevanagari('मीरा')).toBe(true)
  })

  it('leaves Latin text alone', () => {
    expect(hasDevanagari('Meera')).toBe(false)
  })
})

describe('initialsFromName', () => {
  it('uses the first and last word', () => {
    expect(initialsFromName('Meera Joshi')).toBe('MJ')
  })

  it('uses the first two letters of a single word', () => {
    expect(initialsFromName('Meera')).toBe('ME')
  })

  it('returns a question mark for empty text', () => {
    expect(initialsFromName('   ')).toBe('?')
  })
})

describe('sameName', () => {
  it('ignores case, accents and spacing', () => {
    expect(sameName('Meera Joshi', '  meera   joshi ')).toBe(true)
  })

  it('tells different names apart', () => {
    expect(sameName('Meera Joshi', 'Meera Kulkarni')).toBe(false)
  })
})

describe('tokenize', () => {
  it('splits text into words', () => {
    expect(tokenize('Meera husband')).toEqual(['meera', 'husband'])
  })

  it('drops small joining words', () => {
    expect(tokenize('Colleague at Lionbridge')).toEqual(['colleague', 'lionbridge'])
  })

  it('keeps Devanagari words', () => {
    expect(tokenize('मीरा जोशी')).toEqual(['मीरा', 'जोशी'])
  })
})
