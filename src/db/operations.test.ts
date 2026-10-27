// Tests for the typed helpers and the developer tools.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './database'
import { countRecords, loadSampleData, softDeleteSampleData } from './operations'
import {
  createContext,
  createMembership,
  createPerson,
  createRelationship,
  deletePerson,
  updatePerson,
} from './typed'
import { SAMPLE_IDS } from './sampleData'

// The typed helpers work on the shared database, so each test starts empty.
beforeEach(async () => {
  await db.open()
  await Promise.all([
    db.people.clear(),
    db.contexts.clear(),
    db.memberships.clear(),
    db.relationships.clear(),
    db.photos.clear(),
    db.captureBatches.clear(),
  ])
})

afterEach(async () => {
  await Promise.all([
    db.people.clear(),
    db.contexts.clear(),
    db.memberships.clear(),
    db.relationships.clear(),
    db.photos.clear(),
    db.captureBatches.clear(),
  ])
})

describe('createPerson', () => {
  it('saves a person that can be read back', async () => {
    const person = await createPerson({
      full_name: 'Anil Joshi',
      display_name: 'Anil',
      nicknames: [],
      phones: [],
      gender: 'male',
      is_me: false,
    })

    const saved = await db.people.get(person.id)
    expect(saved?.full_name).toBe('Anil Joshi')
    expect(saved?.deleted).toBe(false)
  })
})

describe('updatePerson', () => {
  it('saves the new values and refreshes updated_at', async () => {
    const person = await createPerson({
      full_name: 'Anil Joshi',
      display_name: 'Anil',
      nicknames: [],
      phones: [],
      gender: 'male',
      is_me: false,
      // An old time, so the refresh is always visible even in a fast test.
      updated_at: '2020-01-01T00:00:00.000Z',
    })

    await updatePerson(person.id, { city: 'Borli' })

    const saved = await db.people.get(person.id)
    expect(saved?.city).toBe('Borli')
    expect(saved?.updated_at).not.toBe('2020-01-01T00:00:00.000Z')
  })
})

describe('deletePerson', () => {
  it('keeps the record but marks it deleted', async () => {
    const person = await createPerson({
      full_name: 'Anil Joshi',
      display_name: 'Anil',
      nicknames: [],
      phones: [],
      gender: 'male',
      is_me: false,
    })

    await deletePerson(person.id)

    const saved = await db.people.get(person.id)
    expect(saved).toBeDefined()
    expect(saved?.deleted).toBe(true)
  })
})

describe('loadSampleData', () => {
  it('adds the fictional people from the roadmap', async () => {
    const counts = await loadSampleData()

    expect(counts.people).toBe(8)
    expect(counts.contexts).toBe(6)
    expect(counts.memberships).toBe(9)
    expect(counts.relationships).toBe(5)
  })

  it('marks exactly one person as Me', async () => {
    await loadSampleData()

    const all = await db.people.toArray()
    const me = all.filter((row) => row.is_me)
    expect(me).toHaveLength(1)
    expect(me[0].id).toBe(SAMPLE_IDS.me)
  })

  it('gives Meera the nickname Mera and the Devanagari spelling', async () => {
    await loadSampleData()

    const meera = await db.people.get(SAMPLE_IDS.meera)
    expect(meera?.nicknames).toContain('Mera')
    expect(meera?.nicknames).toContain('मीरा')
  })

  it('can be run twice without doubling the records', async () => {
    await loadSampleData()
    const counts = await loadSampleData()

    expect(counts.people).toBe(8)
  })

  it('keeps a real person that was already saved', async () => {
    const real = await createPerson({
      full_name: 'Real Person',
      display_name: 'Real',
      nicknames: [],
      phones: [],
      gender: 'unknown',
      is_me: false,
    })

    await loadSampleData()

    const saved = await db.people.get(real.id)
    expect(saved?.full_name).toBe('Real Person')
    expect(saved?.deleted).toBe(false)
    const counts = await countRecords()
    expect(counts.people).toBe(9)
  })

  it('does not overwrite a record that already uses a sample id', async () => {
    await db.people.put({
      id: SAMPLE_IDS.meera,
      full_name: 'Someone Else',
      display_name: 'Someone',
      nicknames: [],
      phones: [],
      gender: 'unknown',
      is_me: false,
      deleted: false,
      created_at: '2020-01-01T00:00:00.000Z',
      updated_at: '2020-01-01T00:00:00.000Z',
    })

    await loadSampleData()

    const saved = await db.people.get(SAMPLE_IDS.meera)
    expect(saved?.full_name).toBe('Someone Else')
  })

  it('brings back a sample record that was deleted as test data', async () => {
    await loadSampleData()
    await db.people.update(SAMPLE_IDS.rahul, { deleted: true })

    await loadSampleData()

    const rahul = await db.people.get(SAMPLE_IDS.rahul)
    expect(rahul?.deleted).toBe(false)
  })

  it('brings back every deleted sample record when the sample data is loaded again', async () => {
    await loadSampleData()
    await softDeleteSampleData()

    const counts = await loadSampleData()

    expect(counts.people).toBe(8)
    expect(counts.contexts).toBe(6)
    expect(counts.memberships).toBe(9)
    expect(counts.relationships).toBe(5)
  })

  it('does not resurrect an edited sample person', async () => {
    await loadSampleData()
    await db.people.update(SAMPLE_IDS.rahul, {
      full_name: 'Rahul Patil (my cousin)',
      city: 'Borli',
      deleted: true,
    })

    await loadSampleData()

    const rahul = await db.people.get(SAMPLE_IDS.rahul)
    expect(rahul?.deleted).toBe(true)
    expect(rahul?.full_name).toBe('Rahul Patil (my cousin)')
    expect(rahul?.city).toBe('Borli')
  })

  it('keeps an edited sample note and deletion unchanged', async () => {
    await loadSampleData()
    await db.people.update(SAMPLE_IDS.meera, { notes: 'Met at the society', deleted: true })

    await loadSampleData()

    const meera = await db.people.get(SAMPLE_IDS.meera)
    expect(meera?.deleted).toBe(true)
    expect(meera?.notes).toBe('Met at the society')
  })

  it('does not bring back a real person that was deleted', async () => {
    const real = await createPerson({
      full_name: 'Real Person',
      display_name: 'Real',
      nicknames: [],
      phones: [],
      gender: 'unknown',
      is_me: false,
    })
    await db.people.update(real.id, { deleted: true })

    await loadSampleData()

    const saved = await db.people.get(real.id)
    expect(saved?.deleted).toBe(true)
  })
})

describe('countRecords', () => {
  it('does not count records that are marked deleted', async () => {
    await loadSampleData()
    const person = await db.people.get(SAMPLE_IDS.rahul)
    await db.people.update(person!.id, { deleted: true })

    const counts = await countRecords()
    expect(counts.people).toBe(7)
  })
})

describe('softDeleteSampleData', () => {
  it('marks every record deleted but keeps them', async () => {
    await loadSampleData()

    await softDeleteSampleData()

    const counts = await countRecords()
    expect(counts.people).toBe(0)
    expect(counts.contexts).toBe(0)
    expect(counts.relationships).toBe(0)

    const all = await db.people.toArray()
    expect(all.length).toBe(8)
    expect(all.every((row) => row.deleted)).toBe(true)
  })

  it('does not touch a real person', async () => {
    const real = await createPerson({
      full_name: 'Real Person',
      display_name: 'Real',
      nicknames: [],
      phones: [],
      gender: 'unknown',
      is_me: false,
    })
    await loadSampleData()

    await softDeleteSampleData()

    const saved = await db.people.get(real.id)
    expect(saved?.deleted).toBe(false)
    expect(saved?.full_name).toBe('Real Person')
  })

  it('does not touch a real context, membership or relationship', async () => {
    const realContext = await createContext({ name: 'Real Place', kind: 'place' })
    const realPerson = await createPerson({
      full_name: 'Real Person',
      display_name: 'Real',
      nicknames: [],
      phones: [],
      gender: 'unknown',
      is_me: false,
    })
    const realMembership = await createMembership({
      person_id: realPerson.id,
      context_id: realContext.id,
      role: 'Friend',
    })
    const realRelationship = await createRelationship({
      person_id: realPerson.id,
      relative_id: realPerson.id,
      type: 'friend',
    })
    await loadSampleData()

    await softDeleteSampleData()

    expect((await db.contexts.get(realContext.id))?.deleted).toBe(false)
    expect((await db.memberships.get(realMembership.id))?.deleted).toBe(false)
    expect((await db.relationships.get(realRelationship.id))?.deleted).toBe(false)
  })

  it('does not change the updated_at time of a real record', async () => {
    const real = await createPerson({
      full_name: 'Real Person',
      display_name: 'Real',
      nicknames: [],
      phones: [],
      gender: 'unknown',
      is_me: false,
      updated_at: '2020-01-01T00:00:00.000Z',
    })

    await softDeleteSampleData()

    const saved = await db.people.get(real.id)
    expect(saved?.updated_at).toBe('2020-01-01T00:00:00.000Z')
  })
})

it('sample deletion preserves edited fixtures, unknown prefixed IDs and newly linked fixtures', async () => {
  await loadSampleData()
  await db.people.update(SAMPLE_IDS.rahul, { notes: 'Edited fictional fixture' })
  const custom = await createPerson({
    id: 'sample-custom-fictional',
    full_name: 'Fictional Custom',
    display_name: 'Fictional',
    gender: 'unknown',
    nicknames: [],
    phones: [],
    is_me: false,
  })
  await createRelationship({ person_id: custom.id, relative_id: SAMPLE_IDS.meera, type: 'friend' })
  await softDeleteSampleData()
  expect((await db.people.get(SAMPLE_IDS.rahul))?.deleted).toBe(false)
  expect((await db.people.get(custom.id))?.deleted).toBe(false)
  expect((await db.people.get(SAMPLE_IDS.meera))?.deleted).toBe(false)
})
