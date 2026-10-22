// Tests for the data layer: create, update and soft delete.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './database'
import {
  createRecord,
  newId,
  nowIso,
  restoreRecord,
  softDeleteRecord,
  updateRecord,
} from './records'
import type { Person } from './schema'

// Each test starts with an empty people table.
beforeEach(async () => {
  await db.open()
  await db.people.clear()
})

afterEach(async () => {
  await db.people.clear()
})

function personValues(overrides: Partial<Person> = {}) {
  return {
    full_name: 'Meera Joshi',
    display_name: 'Meera',
    nicknames: [],
    phones: [],
    gender: 'female' as const,
    is_me: false,
    ...overrides,
  }
}

describe('newId', () => {
  it('makes a different id every time', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId()))
    expect(ids.size).toBe(50)
  })

  it('looks like a UUID', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})

describe('createRecord', () => {
  it('fills in the base fields', async () => {
    const person = await createRecord(db.people, personValues())

    expect(person.id).toBeTruthy()
    expect(person.created_at).toBeTruthy()
    expect(person.updated_at).toBeTruthy()
    expect(person.deleted).toBe(false)
  })

  it('keeps the values that were given', async () => {
    const person = await createRecord(db.people, personValues())

    expect(person.full_name).toBe('Meera Joshi')
    expect(person.display_name).toBe('Meera')
    expect(person.nicknames).toEqual([])
  })

  it('uses the UTC ISO format for the times', async () => {
    const person = await createRecord(db.people, personValues())

    expect(person.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(person.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})

describe('updateRecord', () => {
  it('changes the fields that were asked for', async () => {
    const person = await createRecord(db.people, personValues())

    await updateRecord(db.people, person.id, { city: 'Borli' })

    const updated = await db.people.get(person.id)
    expect(updated?.city).toBe('Borli')
    expect(updated?.full_name).toBe('Meera Joshi')
  })

  it('refreshes updated_at', async () => {
    const person = await createRecord(db.people, {
      ...personValues(),
      created_at: '2020-01-01T00:00:00.000Z',
      updated_at: '2020-01-01T00:00:00.000Z',
    })

    await updateRecord(db.people, person.id, { city: 'Borli' })

    const updated = await db.people.get(person.id)
    expect(updated?.updated_at).not.toBe('2020-01-01T00:00:00.000Z')
    expect(updated?.updated_at).not.toBe(person.created_at)
  })

  it('never changes the id or the created time', async () => {
    const person = await createRecord(db.people, personValues())

    await updateRecord(db.people, person.id, {
      id: 'a-different-id',
      created_at: '2020-01-01T00:00:00.000Z',
      city: 'Borli',
    } as Partial<Person>)

    const updated = await db.people.get(person.id)
    expect(updated).toBeDefined()
    expect(updated?.id).toBe(person.id)
    expect(updated?.created_at).toBe(person.created_at)
  })
})

describe('softDeleteRecord', () => {
  it('marks the record as deleted instead of removing it', async () => {
    const person = await createRecord(db.people, personValues())

    await softDeleteRecord(db.people, person.id)

    const stillThere = await db.people.get(person.id)
    expect(stillThere).toBeDefined()
    expect(stillThere?.deleted).toBe(true)
  })

  it('can bring a record back', async () => {
    const person = await createRecord(db.people, personValues())

    await softDeleteRecord(db.people, person.id)
    await restoreRecord(db.people, person.id)

    const restored = await db.people.get(person.id)
    expect(restored?.deleted).toBe(false)
  })
})

describe('nowIso', () => {
  it('gives the current time in UTC', () => {
    const value = nowIso()
    expect(value.endsWith('Z')).toBe(true)
    expect(Math.abs(Date.now() - new Date(value).getTime())).toBeLessThan(5000)
  })
})
