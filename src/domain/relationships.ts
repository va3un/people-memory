// Relationship types, their reverse, and the labels shown on a profile.
// This is the only place where relationship wording lives.
import type { Gender, RelationshipType } from '../db/schema'

export type { RelationshipType }

type RelationshipInfo = {
  reverse: RelationshipType
  labels: Record<Gender, string>
  // Used when the gender is unknown or not needed.
  generic: string
}

export const RELATIONSHIPS: Record<RelationshipType, RelationshipInfo> = {
  spouse: {
    reverse: 'spouse',
    labels: { male: 'Husband', female: 'Wife', other: 'Spouse', unknown: 'Spouse' },
    generic: 'Spouse',
  },
  parent: {
    reverse: 'child',
    labels: { male: 'Father', female: 'Mother', other: 'Parent', unknown: 'Parent' },
    generic: 'Parent',
  },
  child: {
    reverse: 'parent',
    labels: { male: 'Son', female: 'Daughter', other: 'Child', unknown: 'Child' },
    generic: 'Child',
  },
  sibling: {
    reverse: 'sibling',
    labels: { male: 'Brother', female: 'Sister', other: 'Sibling', unknown: 'Sibling' },
    generic: 'Sibling',
  },
  grandparent: {
    reverse: 'grandchild',
    labels: {
      male: 'Grandfather',
      female: 'Grandmother',
      other: 'Grandparent',
      unknown: 'Grandparent',
    },
    generic: 'Grandparent',
  },
  grandchild: {
    reverse: 'grandparent',
    labels: {
      male: 'Grandson',
      female: 'Granddaughter',
      other: 'Grandchild',
      unknown: 'Grandchild',
    },
    generic: 'Grandchild',
  },
  uncle_aunt: {
    reverse: 'nephew_niece',
    labels: { male: 'Uncle', female: 'Aunt', other: 'Uncle or aunt', unknown: 'Uncle or aunt' },
    generic: 'Uncle or aunt',
  },
  nephew_niece: {
    reverse: 'uncle_aunt',
    labels: {
      male: 'Nephew',
      female: 'Niece',
      other: 'Nephew or niece',
      unknown: 'Nephew or niece',
    },
    generic: 'Nephew or niece',
  },
  cousin: {
    reverse: 'cousin',
    labels: { male: 'Cousin', female: 'Cousin', other: 'Cousin', unknown: 'Cousin' },
    generic: 'Cousin',
  },
  parent_in_law: {
    reverse: 'child_in_law',
    labels: {
      male: 'Father-in-law',
      female: 'Mother-in-law',
      other: 'Parent-in-law',
      unknown: 'Parent-in-law',
    },
    generic: 'Parent-in-law',
  },
  child_in_law: {
    reverse: 'parent_in_law',
    labels: {
      male: 'Son-in-law',
      female: 'Daughter-in-law',
      other: 'Child-in-law',
      unknown: 'Child-in-law',
    },
    generic: 'Child-in-law',
  },
  sibling_in_law: {
    reverse: 'sibling_in_law',
    labels: {
      male: 'Brother-in-law',
      female: 'Sister-in-law',
      other: 'Sibling-in-law',
      unknown: 'Sibling-in-law',
    },
    generic: 'Sibling-in-law',
  },
  friend: {
    reverse: 'friend',
    labels: { male: 'Friend', female: 'Friend', other: 'Friend', unknown: 'Friend' },
    generic: 'Friend',
  },
  colleague: {
    reverse: 'colleague',
    labels: { male: 'Colleague', female: 'Colleague', other: 'Colleague', unknown: 'Colleague' },
    generic: 'Colleague',
  },
  other: {
    reverse: 'other',
    labels: { male: 'Related', female: 'Related', other: 'Related', unknown: 'Related' },
    generic: 'Related',
  },
}

export const RELATIONSHIP_TYPES = Object.keys(RELATIONSHIPS) as RelationshipType[]

// The type of the same link seen from the other side.
export function reverseType(type: RelationshipType): RelationshipType {
  return RELATIONSHIPS[type].reverse
}

// The label for a link, chosen by the gender of the person it describes.
export function relationshipLabel(type: RelationshipType, gender: Gender): string {
  const info = RELATIONSHIPS[type]
  return info.labels[gender] ?? info.generic
}

// A sentence such as "Anil is the husband of Meera".
export function relationshipSentence(
  personName: string,
  type: RelationshipType,
  otherName: string,
  gender: Gender,
): string {
  const label = relationshipLabel(type, gender).toLowerCase()
  return `${personName} is the ${label} of ${otherName}`
}

// True when both people are linked by the same type in either direction.
export function isSymmetric(type: RelationshipType): boolean {
  return RELATIONSHIPS[type].reverse === type
}

// Search describes the indexed person's relationship to the named relative.
export function relationshipDescription(
  type: RelationshipType,
  gender: Gender,
  otherName: string,
): string {
  return `${relationshipLabel(type, gender)} ${type === 'other' ? 'to' : 'of'} ${otherName}`
}
