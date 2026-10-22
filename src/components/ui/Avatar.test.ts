import { describe, expect, it } from 'vitest'
import { colorForName, initialsForName } from './Avatar'

describe('initialsForName', () => {
  it('uses the first and last name', () => {
    expect(initialsForName('Meera Joshi')).toBe('MJ')
  })

  it('uses the first two letters of a single name', () => {
    expect(initialsForName('Kiara')).toBe('KI')
  })

  it('ignores extra spaces', () => {
    expect(initialsForName('  Anil   Joshi  ')).toBe('AJ')
  })

  it('returns a mark for an empty name', () => {
    expect(initialsForName('   ')).toBe('?')
  })
})

describe('colorForName', () => {
  it('always gives the same colour for the same name', () => {
    expect(colorForName('Meera Joshi')).toEqual(colorForName('Meera Joshi'))
  })

  it('gives a colour that is not the plain background', () => {
    expect(colorForName('Meera Joshi').background).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('handles Devanagari names', () => {
    expect(colorForName('मीरा').background).toMatch(/^#[0-9A-F]{6}$/i)
  })
})
