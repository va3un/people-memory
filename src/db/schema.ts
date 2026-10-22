// The data model from roadmap section 8. Every record shares the same base fields.

export type BaseRecord = {
  id: string
  created_at: string
  updated_at: string
  deleted: boolean
  source_batch_id?: string
}

export type Gender = 'male' | 'female' | 'other' | 'unknown'

export type Person = BaseRecord & {
  full_name: string
  maiden_name?: string
  display_name: string
  nicknames: string[]
  gender: Gender
  category?: string
  phones: string[]
  email?: string
  city?: string
  how_i_know?: string
  notes?: string
  birthday?: { month: number; day: number; year?: number }
  is_me: boolean
  last_viewed_at?: string
}

export type ContextKind = 'organization' | 'school' | 'college' | 'society' | 'group' | 'place'

export type Context = BaseRecord & {
  name: string
  kind: ContextKind
  city?: string
  notes?: string
}

export type Membership = BaseRecord & {
  person_id: string
  context_id: string
  role?: string
  period?: string
  notes?: string
}

export type RelationshipType =
  | 'spouse'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'uncle_aunt'
  | 'nephew_niece'
  | 'cousin'
  | 'parent_in_law'
  | 'child_in_law'
  | 'sibling_in_law'
  | 'friend'
  | 'colleague'
  | 'other'

// One row means: person_id is the TYPE of relative_id.
// Example: person_id = Anil, relative_id = Meera, type = spouse.
export type Relationship = BaseRecord & {
  person_id: string
  relative_id: string
  type: RelationshipType
  notes?: string
}

export type Photo = BaseRecord & {
  person_id: string
  blob: Blob
  mime: string
  width: number
  height: number
  bytes: number
}

export type CaptureBatchStatus = 'saved' | 'undone' | 'undo_conflict'

// Snapshots used by "Undo this capture" to put old values back.
export type RecordSnapshot = {
  table: string
  id: string
  values: Record<string, unknown>
}

export type CaptureBatch = BaseRecord & {
  raw_text: string
  created_ids: Record<string, string[]>
  before_snapshots: RecordSnapshot[]
  after_snapshots: RecordSnapshot[]
  status: CaptureBatchStatus
}

// Device-only settings. Never synced and never exported by default.
export type DeviceSetting = {
  key: string
  value: unknown
  updated_at: string
}

export const TABLE_NAMES = [
  'people',
  'contexts',
  'memberships',
  'relationships',
  'photos',
  'captureBatches',
  'deviceSettings',
] as const

export type TableName = (typeof TABLE_NAMES)[number]
