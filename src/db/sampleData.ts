// The fictional sample data from roadmap section 16.1.
// Nothing here is a real person. The names and places are made up for testing.
import type { Context, Membership, Person, Relationship } from '../db/schema'

export type SampleData = {
  people: Person[]
  contexts: Context[]
  memberships: Membership[]
  relationships: Relationship[]
}

// Every sample record id starts with this prefix. It is how we tell
// fictional test records apart from real ones, so the delete tool can
// never touch a real person's record.
export const SAMPLE_ID_PREFIX = 'sample-'

// Fixed ids keep the sample data easy to read and easy to test.
export const SAMPLE_IDS = {
  me: 'sample-person-me',
  anil: 'sample-person-anil',
  meera: 'sample-person-meera',
  ketaki: 'sample-person-ketaki',
  sunil: 'sample-person-sunil',
  rahul: 'sample-person-rahul',
  sneha: 'sample-person-sneha',
  kavita: 'sample-person-kavita',
  lionbridge: 'sample-context-lionbridge',
  sagar: 'sample-context-sagar-heights',
  agnel: 'sample-context-agnel-school',
  icles: 'sample-context-icles-college',
  borli: 'sample-context-borli',
  class7b: 'sample-context-class-7b-parents',
}

const timestamp = '2026-01-01T00:00:00.000Z'

function person(values: Omit<Person, 'created_at' | 'updated_at' | 'deleted' | 'phones'>): Person {
  return { phones: [], ...values, deleted: false, created_at: timestamp, updated_at: timestamp }
}

function context(values: Omit<Context, 'created_at' | 'updated_at' | 'deleted'>): Context {
  return { ...values, deleted: false, created_at: timestamp, updated_at: timestamp }
}

function membership(values: Omit<Membership, 'created_at' | 'updated_at' | 'deleted'>): Membership {
  return { ...values, deleted: false, created_at: timestamp, updated_at: timestamp }
}

function relationship(values: Omit<Relationship, 'created_at' | 'updated_at' | 'deleted'>): Relationship {
  return { ...values, deleted: false, created_at: timestamp, updated_at: timestamp }
}


function buildMemberships(): Membership[] {
  return [
    membership({
      id: 'sample-membership-me-agnel',
      person_id: SAMPLE_IDS.me,
      context_id: SAMPLE_IDS.agnel,
      role: 'Student',
    }),
    membership({
      id: 'sample-membership-me-icles',
      person_id: SAMPLE_IDS.me,
      context_id: SAMPLE_IDS.icles,
      role: 'Student',
    }),
    membership({
      id: 'sample-membership-rahul-lionbridge',
      person_id: SAMPLE_IDS.rahul,
      context_id: SAMPLE_IDS.lionbridge,
      role: 'Colleague',
    }),
    membership({
      id: 'sample-membership-anil-lionbridge',
      person_id: SAMPLE_IDS.anil,
      context_id: SAMPLE_IDS.lionbridge,
      role: 'Colleague',
    }),
    membership({
      id: 'sample-membership-meera-sagar',
      person_id: SAMPLE_IDS.meera,
      context_id: SAMPLE_IDS.sagar,
      role: 'Resident',
    }),
    membership({
      id: 'sample-membership-sneha-agnel',
      person_id: SAMPLE_IDS.sneha,
      context_id: SAMPLE_IDS.agnel,
      role: 'Parent',
    }),
    membership({
      id: 'sample-membership-sneha-class7b',
      person_id: SAMPLE_IDS.sneha,
      context_id: SAMPLE_IDS.class7b,
      role: 'Parent',
    }),
    membership({
      id: 'sample-membership-kavita-agnel',
      person_id: SAMPLE_IDS.kavita,
      context_id: SAMPLE_IDS.agnel,
      role: 'Teacher',
    }),
    membership({
      id: 'sample-membership-sunil-borli',
      person_id: SAMPLE_IDS.sunil,
      context_id: SAMPLE_IDS.borli,
      role: 'Resident',
    }),
  ]
}

function buildRelationships(): Relationship[] {
  return [
    relationship({
      id: 'sample-relationship-anil-meera',
      person_id: SAMPLE_IDS.anil,
      relative_id: SAMPLE_IDS.meera,
      type: 'spouse',
    }),
    relationship({
      id: 'sample-relationship-ketaki-anil',
      person_id: SAMPLE_IDS.ketaki,
      relative_id: SAMPLE_IDS.anil,
      type: 'child',
    }),
    relationship({
      id: 'sample-relationship-ketaki-meera',
      person_id: SAMPLE_IDS.ketaki,
      relative_id: SAMPLE_IDS.meera,
      type: 'child',
    }),
    relationship({
      id: 'sample-relationship-sunil-anil',
      person_id: SAMPLE_IDS.sunil,
      relative_id: SAMPLE_IDS.anil,
      type: 'sibling',
    }),
    relationship({
      id: 'sample-relationship-sneha-rahul',
      person_id: SAMPLE_IDS.sneha,
      relative_id: SAMPLE_IDS.rahul,
      type: 'spouse',
    }),
  ]
}
export function buildSampleData(): SampleData {
  const people: Person[] = [
    person({
      id: SAMPLE_IDS.me,
      full_name: 'Varun Sample',
      display_name: 'Varun',
      nicknames: [],
      gender: 'male',
      category: 'Family',
      is_me: true,
      how_i_know: 'That is me',
    }),
    person({
      id: SAMPLE_IDS.anil,
      full_name: 'Anil Joshi',
      display_name: 'Anil',
      nicknames: [],
      gender: 'male',
      category: 'Family',
      is_me: false,
    }),
    person({
      id: SAMPLE_IDS.meera,
      full_name: 'Meera Joshi',
      display_name: 'Meera',
      nicknames: ['Mera', 'मीरा'],
      gender: 'female',
      category: 'Family',
      is_me: false,
    }),
    person({
      id: SAMPLE_IDS.ketaki,
      full_name: 'Ketaki Joshi',
      display_name: 'Ketaki',
      nicknames: [],
      gender: 'female',
      category: 'Family',
      is_me: false,
    }),
    person({
      id: SAMPLE_IDS.sunil,
      full_name: 'Sunil Joshi',
      display_name: 'Sunil',
      nicknames: [],
      gender: 'male',
      category: 'Relative',
      is_me: false,
    }),
    person({
      id: SAMPLE_IDS.rahul,
      full_name: 'Rahul Patil',
      display_name: 'Rahul',
      nicknames: [],
      gender: 'male',
      category: 'Colleague',
      is_me: false,
    }),
    person({
      id: SAMPLE_IDS.sneha,
      full_name: 'Sneha Patil',
      display_name: 'Sneha',
      nicknames: [],
      gender: 'female',
      category: 'School parent',
      is_me: false,
    }),
    person({
      id: SAMPLE_IDS.kavita,
      full_name: 'Dr. Kavita Rao',
      display_name: 'Kavita',
      nicknames: [],
      gender: 'female',
      category: 'School parent',
      is_me: false,
    }),
  ]

  const contexts: Context[] = [
    context({ id: SAMPLE_IDS.lionbridge, name: 'Lionbridge', kind: 'organization' }),
    context({ id: SAMPLE_IDS.sagar, name: 'Sagar Heights Society', kind: 'society' }),
    context({ id: SAMPLE_IDS.agnel, name: 'Fr. Agnel School', kind: 'school' }),
    context({ id: SAMPLE_IDS.icles, name: 'ICLES College', kind: 'college' }),
    context({ id: SAMPLE_IDS.borli, name: 'Borli', kind: 'place' }),
    context({ id: SAMPLE_IDS.class7b, name: 'Class 7B parents', kind: 'group' }),
  ]

  return { people, contexts, memberships: buildMemberships(), relationships: buildRelationships() }
}

// Tells whether an id belongs to the fictional sample data.
export function isSampleId(id: string): boolean {
  return id.startsWith(SAMPLE_ID_PREFIX)
}

// The ids of every known fictional sample record.
export function sampleRecordIds(): Set<string> {
  const sample = buildSampleData()
  return new Set([
    ...sample.people.map((row) => row.id),
    ...sample.contexts.map((row) => row.id),
    ...sample.memberships.map((row) => row.id),
    ...sample.relationships.map((row) => row.id),
  ])
}

// Tells whether a stored record still holds the same content as the sample
// record. A field the user changed, or added, means the record is no longer
// the plain sample record, so it is kept as it is.
export function isSameSampleContent(
  stored: Record<string, unknown>,
  sample: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(stored), ...Object.keys(sample)])
  for (const key of keys) {
    if (IGNORED_KEYS.has(key)) continue
    const left = stored[key]
    const right = sample[key]
    if (left === undefined && right === undefined) continue
    // A field only the stored record has was added by the user.
    if (right === undefined) return false
    if (!sameValue(left, right)) return false
  }
  return true
}

// The fields that describe when a record was saved, not what it says.
const IGNORED_KEYS = new Set(['id', 'created_at', 'updated_at', 'deleted'])

// Compares two field values, including arrays and objects.
function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}
