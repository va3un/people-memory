// Tests for the typed helpers and the developer tools.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './database'
import { countRecords, loadSampleData, softDeleteEverything } from './operations'
import { createPerson, deletePerson, updatePerson } from './typed'
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
    })

    await updatePerson(person.id, { city: 'Borli' })

    const saved = await db.people.get(person.id)
    expect(saved?.city).toBe('Borli')
    expect(saved?.updated_at).not.toBe(person.updated_at)
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

describe('softDeleteEverything', () => {
  it('marks every record deleted but keeps them', async () => {
    await loadSampleData()

    await softDeleteEverything()

    const counts = await countRecords()
    expect(counts.people).toBe(0)
    expect(counts.contexts).toBe(0)
    expect(counts.relationships).toBe(0)

    const all = await db.people.toArray()
    expect(all.length).toBe(8)
    expect(all.every((row) => row.deleted)).toBe(true)
  })
})
