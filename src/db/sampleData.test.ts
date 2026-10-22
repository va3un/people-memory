// Tests for the fictional sample data from roadmap section 16.1.
import { describe, expect, it } from 'vitest'
import { buildSampleData, SAMPLE_IDS } from './sampleData'

const sample = buildSampleData()

describe('sample data', () => {
  it('has the eight fictional people from the roadmap', () => {
    expect(sample.people).toHaveLength(8)
    const names = sample.people.map((person) => person.full_name)
    expect(names).toContain('Varun Sample')
    expect(names).toContain('Anil Joshi')
    expect(names).toContain('Meera Joshi')
    expect(names).toContain('Ketaki Joshi')
    expect(names).toContain('Sunil Joshi')
    expect(names).toContain('Rahul Patil')
    expect(names).toContain('Sneha Patil')
    expect(names).toContain('Dr. Kavita Rao')
  })

  it('has the six contexts from the roadmap', () => {
    expect(sample.contexts).toHaveLength(6)
    const contexts = sample.contexts.map((context) => [context.name, context.kind])
    expect(contexts).toContainEqual(['Lionbridge', 'organization'])
    expect(contexts).toContainEqual(['Sagar Heights Society', 'society'])
    expect(contexts).toContainEqual(['Fr. Agnel School', 'school'])
    expect(contexts).toContainEqual(['ICLES College', 'college'])
    expect(contexts).toContainEqual(['Borli', 'place'])
    expect(contexts).toContainEqual(['Class 7B parents', 'group'])
  })

  it('marks only Varun Sample as Me', () => {
    const me = sample.people.filter((person) => person.is_me)
    expect(me).toHaveLength(1)
    expect(me[0].full_name).toBe('Varun Sample')
  })

  it('gives Meera the two nicknames from the roadmap', () => {
    const meera = sample.people.find((person) => person.id === SAMPLE_IDS.meera)
    expect(meera?.nicknames).toEqual(['Mera', 'मीरा'])
  })

  it('has the nine memberships from the roadmap', () => {
    expect(sample.memberships).toHaveLength(9)
    const me = sample.memberships.filter((m) => m.person_id === SAMPLE_IDS.me)
    expect(me).toHaveLength(2)
    expect(me.map((m) => m.role)).toEqual(['Student', 'Student'])
  })

  it('has the five relationships from the roadmap', () => {
    expect(sample.relationships).toHaveLength(5)
    const anil = sample.relationships.find(
      (r) => r.person_id === SAMPLE_IDS.anil && r.relative_id === SAMPLE_IDS.meera,
    )
    expect(anil?.type).toBe('spouse')
  })

  it('uses a different id for every record', () => {
    const ids = [
      ...sample.people.map((row) => row.id),
      ...sample.contexts.map((row) => row.id),
      ...sample.memberships.map((row) => row.id),
      ...sample.relationships.map((row) => row.id),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never leaves a record marked as deleted', () => {
    const all = [
      ...sample.people,
      ...sample.contexts,
      ...sample.memberships,
      ...sample.relationships,
    ]
    expect(all.every((row) => row.deleted === false)).toBe(true)
  })

  it('only points at people and contexts that exist', () => {
    const personIds = new Set(sample.people.map((row) => row.id))
    const contextIds = new Set(sample.contexts.map((row) => row.id))

    for (const membership of sample.memberships) {
      expect(personIds.has(membership.person_id)).toBe(true)
      expect(contextIds.has(membership.context_id)).toBe(true)
    }
    for (const relationship of sample.relationships) {
      expect(personIds.has(relationship.person_id)).toBe(true)
      expect(personIds.has(relationship.relative_id)).toBe(true)
    }
  })

  it('gives the same result every time it is built', () => {
    expect(buildSampleData()).toEqual(sample)
  })
})
