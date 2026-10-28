// Roadmap Search scenarios and adversarial fictional clues verify retrieval, ranking and one-hop boundaries.
import { beforeEach, expect, it } from 'vitest'
import { buildSampleData, SAMPLE_IDS, type SampleData } from '../db/sampleData'
import { personDefaults } from '../db/typed'
import type { Person } from '../db/schema'
import { buildSearchEngine } from './engine'

let data: SampleData
beforeEach(() => {
  data = buildSampleData()
})
function person(name: string, changes: Partial<Person> = {}): Person {
  return {
    ...personDefaults(name),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted: false,
    ...changes,
  }
}
const ids = (query: string) =>
  buildSearchEngine(data)
    .search(query)
    .map((result) => result.person.id)

it('scenario 1: Meera first, followed by directly linked Anil and Ketaki with correct explanations', () => {
  const results = buildSearchEngine(data).search('Meera')
  expect(results[0].person.id).toBe(SAMPLE_IDS.meera)
  expect(results.find((r) => r.person.id === SAMPLE_IDS.anil)?.reason).toBe(
    'Husband of Meera Joshi',
  )
  expect(results.find((r) => r.person.id === SAMPLE_IDS.ketaki)?.reason).toBe(
    'Daughter of Meera Joshi',
  )
  expect(results.map((r) => r.person.id)).not.toContain(SAMPLE_IDS.sunil)
})
it('scenario 2: meera husband narrows to Anil', () => {
  const results = buildSearchEngine(data).search('meera husband')
  expect(results.map((r) => r.person.id)).toEqual([SAMPLE_IDS.anil])
  expect(results[0].reason).toBe('Husband of Meera Joshi')
})
it('scenario 3: Lionbridge finds Anil and Rahul with their roles', () => {
  const results = buildSearchEngine(data).search('Lionbridge')
  expect(new Set(results.map((r) => r.person.id))).toEqual(
    new Set([SAMPLE_IDS.anil, SAMPLE_IDS.rahul]),
  )
  expect(results.every((r) => r.reason === 'Colleague at Lionbridge')).toBe(true)
})
it('scenario 4: Sagar Heights explains residence', () => {
  const results = buildSearchEngine(data).search('Sagar Heights')
  expect(results[0].person.id).toBe(SAMPLE_IDS.meera)
  expect(results[0].reason).toBe('Lives in Sagar Heights Society (Resident)')
})
it('scenario 5: Mera finds the explicit nickname, and small name typos work without a nickname', () => {
  const results = buildSearchEngine(data).search('Mera')
  expect(results[0].person.id).toBe(SAMPLE_IDS.meera)
  expect(results[0].reason).toBe('Matched nickname: Mera')
  data.people.find((p) => p.id === SAMPLE_IDS.meera)!.nicknames = []
  expect(ids('Meerra')[0]).toBe(SAMPLE_IDS.meera)
})
it('scenario 6: Devanagari nickname remains intact and finds Meera', () => {
  expect(ids('मीरा')[0]).toBe(SAMPLE_IDS.meera)
})
it('scenario 7: 7B finds Sneha with the group role', () => {
  const results = buildSearchEngine(data).search('7B')
  expect(results.map((r) => r.person.id)).toEqual([SAMPLE_IDS.sneha])
  expect(results[0].reason).toBe('Parent in Class 7B parents')
})
it('scenario 8: Borli finds Sunil', () => {
  expect(ids('Borli')).toContain(SAMPLE_IDS.sunil)
})
it('scenario 9: Gupta finds the stated name; née is used only for an existing reviewed maiden_name', () => {
  const tarika = person('Tarika Gupta')
  data.people.push(tarika)
  let result = buildSearchEngine(data)
    .search('Gupta')
    .find((r) => r.person.id === tarika.id)!
  expect(result.reason).toBe('Matched name: Tarika Gupta')
  expect(tarika.maiden_name).toBeUndefined()
  data.people[data.people.length - 1] = {
    ...tarika,
    full_name: 'Tarika Bobhate',
    maiden_name: 'Gupta',
  }
  result = buildSearchEngine(data)
    .search('Gupta')
    .find((r) => r.person.id === tarika.id)!
  expect(result.reason).toBe('née Gupta')
})
it('ignores case, Latin accents, decomposed accents and extra spaces', () => {
  const target = person('Chétana Mehta')
  data.people.push(target)
  expect(ids('  CHE\u0301TANA    MEH  ')[0]).toBe(target.id)
})
it('keeps other scripts and combining marks searchable with word prefixes', () => {
  const target = person('मीरा जोशी')
  data.people.push(target)
  expect(ids('मीरा जो')[0]).toBe(target.id)
  const other = person('Ольга Fictional')
  data.people.push(other)
  expect(ids('ольг')[0]).toBe(other.id)
})
it('prefix matching and AND narrowing work across direct relatives and context fields', () => {
  expect(new Set(ids('lion'))).toEqual(new Set([SAMPLE_IDS.anil, SAMPLE_IDS.rahul]))
  expect(ids('meera lionbridge')).toEqual([SAMPLE_IDS.anil])
  expect(ids('meera and husband')).toEqual([SAMPLE_IDS.anil])
  expect(ids('meera nonexistent')).toEqual([])
})
it('indexes display name, city, category, how-I-know, notes and digit-only phone numbers', () => {
  const target = person('Fictional Details', {
    display_name: 'UniqueDisplay',
    city: 'UniqueCity',
    category: 'UniqueCategory',
    how_i_know: 'UniqueMeeting',
    notes: 'UniqueNote',
    phones: ['+91 98765 43210'],
  })
  data.people.push(target)
  for (const query of [
    'uniquedisplay',
    'uniquecity',
    'uniquecategory',
    'uniquemeeting',
    'uniquenote',
    '+91 (98765)-43210',
    '9198765',
  ])
    expect(ids(query)[0]).toBe(target.id)
})
it('indexes gendered parent labels in both directions without inventing a reverse row', () => {
  expect(ids('ketaki mother')).toEqual([SAMPLE_IDS.meera])
  expect(ids('ketaki father')).toEqual([SAMPLE_IDS.anil])
  expect(data.relationships).toHaveLength(5)
})
it('ranks name, nickname/maiden, relative, context and notes in the specified order', () => {
  const named = person('Rhea Subject'),
    alias = person('Alias Person', { nicknames: ['Rhea'] })
  const related = person('Related Person'),
    contextual = person('Context Person'),
    noted = person('Notes Person', { notes: 'Rhea' })
  const source = {
    people: [noted, contextual, related, alias, named],
    contexts: [
      {
        id: 'fictional-context',
        name: 'Rhea Academy',
        kind: 'school' as const,
        created_at: named.created_at,
        updated_at: named.updated_at,
        deleted: false,
      },
    ],
    memberships: [
      {
        id: 'fictional-membership',
        person_id: contextual.id,
        context_id: 'fictional-context',
        created_at: named.created_at,
        updated_at: named.updated_at,
        deleted: false,
      },
    ],
    relationships: [
      {
        id: 'fictional-relationship',
        person_id: related.id,
        relative_id: named.id,
        type: 'friend' as const,
        created_at: named.created_at,
        updated_at: named.updated_at,
        deleted: false,
      },
    ],
  }
  expect(
    buildSearchEngine(source)
      .search('rhea')
      .map((r) => r.person.id),
  ).toEqual([named.id, alias.id, related.id, contextual.id, noted.id])
})
it('does not expose Me as a result but can use the name of a directly related Me', () => {
  data.relationships.push({
    ...data.relationships[0],
    id: 'fictional-me-link',
    person_id: SAMPLE_IDS.anil,
    relative_id: SAMPLE_IDS.me,
    type: 'friend',
  })
  expect(ids('Varun')).toEqual([SAMPLE_IDS.anil])
  expect(ids('Sample')).not.toContain(SAMPLE_IDS.me)
})
it("does not index relatives of relatives or a relative's contexts or notes", () => {
  expect(ids('Meera')).not.toContain(SAMPLE_IDS.sunil)
  expect(ids('Lionbridge')).not.toContain(SAMPLE_IDS.sunil)
  data.people.find((p) => p.id === SAMPLE_IDS.anil)!.notes = 'UniqueRelativeNote'
  expect(ids('UniqueRelativeNote')).not.toContain(SAMPLE_IDS.sunil)
})
it('filters deleted people, relationships, memberships and contexts without changing the source', () => {
  const before = JSON.stringify(data)
  buildSearchEngine(data).search('Meera')
  expect(JSON.stringify(data)).toBe(before)
  data.relationships.find((r) => r.person_id === SAMPLE_IDS.anil)!.deleted = true
  expect(ids('meera husband')).toEqual([])
  data.contexts.find((c) => c.id === SAMPLE_IDS.lionbridge)!.deleted = true
  expect(ids('Lionbridge')).toEqual([])
  data.memberships.find((m) => m.person_id === SAMPLE_IDS.sunil)!.deleted = true
  expect(ids('Borli')).toEqual([])
  data.people.find((p) => p.id === SAMPLE_IDS.meera)!.deleted = true
  expect(ids('Meera')).toEqual([])
})
it('reflects name, alias, role and relative edits when the memory index is refreshed', () => {
  data.people.find((p) => p.id === SAMPLE_IDS.meera)!.full_name = 'Fictional Renamed'
  data.people.find((p) => p.id === SAMPLE_IDS.meera)!.display_name = 'Fictional'
  data.people.find((p) => p.id === SAMPLE_IDS.meera)!.nicknames = ['UniqueNewAlias']
  expect(ids('meera')).toEqual([])
  expect(ids('uniquenewalias')).toContain(SAMPLE_IDS.anil)
  data.memberships.find((m) => m.person_id === SAMPLE_IDS.rahul)!.role = 'UniqueNewRole'
  expect(ids('UniqueNewRole')).toEqual([SAMPLE_IDS.rahul])
})
it('handles empty, punctuation-only and single-letter prefixes without exceptions', () => {
  expect(ids('')).toEqual([])
  expect(ids('!!!')).toEqual([])
  expect(ids('A')).toContain(SAMPLE_IDS.anil)
})
it('searches 2,000 fictional people within the five-second goal without mutating records', () => {
  const source = {
    people: Array.from({ length: 2000 }, (_, i) => person(`Fictional Scale ${i}`)),
    contexts: [],
    memberships: [],
    relationships: [],
  }
  const start = performance.now()
  const engine = buildSearchEngine(source)
  expect(engine.size).toBe(2000)
  expect(engine.search('fictional')).toHaveLength(2000)
  expect(
    engine.search('scale 1999').some((r) => r.person.full_name === 'Fictional Scale 1999'),
  ).toBe(true)
  expect(performance.now() - start).toBeLessThan(5000)
})
