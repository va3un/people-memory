// Tests for the relationship labels and reverse types from roadmap section 8.4.
import { describe, expect, it } from 'vitest'
import {
  RELATIONSHIP_TYPES,
  isSymmetric,
  relationshipLabel,
  relationshipSentence,
  reverseType,
} from './relationships'

describe('reverseType', () => {
  it('turns parent into child and back', () => {
    expect(reverseType('parent')).toBe('child')
    expect(reverseType('child')).toBe('parent')
  })

  it('keeps spouse as spouse', () => {
    expect(reverseType('spouse')).toBe('spouse')
  })

  it('turns parent in law into child in law', () => {
    expect(reverseType('parent_in_law')).toBe('child_in_law')
    expect(reverseType('child_in_law')).toBe('parent_in_law')
  })
})

describe('relationshipLabel', () => {
  it('uses Husband for a male spouse and Wife for a female spouse', () => {
    expect(relationshipLabel('spouse', 'male')).toBe('Husband')
    expect(relationshipLabel('spouse', 'female')).toBe('Wife')
  })

  it('uses Father and Mother for parents', () => {
    expect(relationshipLabel('parent', 'male')).toBe('Father')
    expect(relationshipLabel('parent', 'female')).toBe('Mother')
  })

  it('uses Son and Daughter for children', () => {
    expect(relationshipLabel('child', 'male')).toBe('Son')
    expect(relationshipLabel('child', 'female')).toBe('Daughter')
  })

  it('uses Brother and Sister for siblings', () => {
    expect(relationshipLabel('sibling', 'male')).toBe('Brother')
    expect(relationshipLabel('sibling', 'female')).toBe('Sister')
  })

  it('uses Uncle and Aunt', () => {
    expect(relationshipLabel('uncle_aunt', 'male')).toBe('Uncle')
    expect(relationshipLabel('uncle_aunt', 'female')).toBe('Aunt')
  })

  it('uses Nephew and Niece', () => {
    expect(relationshipLabel('nephew_niece', 'male')).toBe('Nephew')
    expect(relationshipLabel('nephew_niece', 'female')).toBe('Niece')
  })

  it('uses Father-in-law and Mother-in-law', () => {
    expect(relationshipLabel('parent_in_law', 'male')).toBe('Father-in-law')
    expect(relationshipLabel('parent_in_law', 'female')).toBe('Mother-in-law')
  })

  it('uses Son-in-law and Daughter-in-law', () => {
    expect(relationshipLabel('child_in_law', 'male')).toBe('Son-in-law')
    expect(relationshipLabel('child_in_law', 'female')).toBe('Daughter-in-law')
  })

  it('falls back to a plain label when the gender is unknown', () => {
    expect(relationshipLabel('spouse', 'unknown')).toBe('Spouse')
    expect(relationshipLabel('parent', 'unknown')).toBe('Parent')
  })
})

describe('relationshipSentence', () => {
  it('reads as a plain sentence', () => {
    expect(relationshipSentence('Anil', 'spouse', 'Meera', 'male')).toBe(
      'Anil is the husband of Meera',
    )
  })

  it('reads correctly for a daughter', () => {
    expect(relationshipSentence('Ketaki', 'child', 'Anil', 'female')).toBe(
      'Ketaki is the daughter of Anil',
    )
  })
})

describe('isSymmetric', () => {
  it('knows which links look the same from both sides', () => {
    expect(isSymmetric('spouse')).toBe(true)
    expect(isSymmetric('sibling')).toBe(true)
    expect(isSymmetric('friend')).toBe(true)
    expect(isSymmetric('parent')).toBe(false)
  })
})

describe('RELATIONSHIP_TYPES', () => {
  it('covers every type in the roadmap table', () => {
    expect(RELATIONSHIP_TYPES).toHaveLength(15)
    expect(RELATIONSHIP_TYPES).toContain('other')
  })
})
