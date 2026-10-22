// Tests for the data layer: create, update and soft delete.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './database'
import {
  createRecord,
  newId,
  nowIso,
  restoreRecord,
  softDeleteMany,
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

  it('keeps the id when one is given', async () => {
    const person = await createRecord(db.people, { ...personValues(), id: 'my-own-id' })

    expect(person.id).toBe('my-own-id')
    expect((await db.people.get('my-own-id'))?.full_name).toBe('Meera Joshi')
  })

  it('gives a different id to every record', async () => {
    const first = await createRecord(db.people, personValues())
    const second = await createRecord(db.people, personValues())

    expect(first.id).not.toBe(second.id)
  })

  it('keeps the times when they are given', async () => {
    const person = await createRecord(db.people, {
      ...personValues(),
      created_at: '2020-01-01T00:00:00.000Z',
      updated_at: '2020-01-02T00:00:00.000Z',
    })

    expect(person.created_at).toBe('2020-01-01T00:00:00.000Z')
    expect(person.updated_at).toBe('2020-01-02T00:00:00.000Z')
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

  it('gives nothing back when the record is not there', async () => {
    const result = await updateRecord(db.people, 'no-such-id', { city: 'Borli' })
    expect(result).toBeUndefined()
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

  it('gives nothing back when the record is not there', async () => {
    expect(await softDeleteRecord(db.people, 'no-such-id')).toBeUndefined()
    expect(await restoreRecord(db.people, 'no-such-id')).toBeUndefined()
  })
})

describe('nowIso', () => {
  it('gives the current time in UTC', () => {
    const value = nowIso()
    expect(value.endsWith('Z')).toBe(true)
    expect(Math.abs(Date.now() - new Date(value).getTime())).toBeLessThan(5000)
  })
})

describe('softDeleteMany', () => {
  it('marks every given record as deleted and keeps them', async () => {
    const first = await createRecord(db.people, personValues({ full_name: 'Anil Joshi' }))
    const second = await createRecord(db.people, personValues({ full_name: 'Meera Joshi' }))
    const untouched = await createRecord(db.people, personValues({ full_name: 'Ketaki Joshi' }))

    const count = await softDeleteMany(db.people, [first.id, second.id])

    expect(count).toBe(2)
    expect((await db.people.get(first.id))?.deleted).toBe(true)
    expect((await db.people.get(second.id))?.deleted).toBe(true)
    expect((await db.people.get(untouched.id))?.deleted).toBe(false)
  })

  it('refreshes updated_at on the records it deletes', async () => {
    const person = await createRecord(db.people, {
      ...personValues(),
      updated_at: '2020-01-01T00:00:00.000Z',
    })

    await softDeleteMany(db.people, [person.id])

    expect((await db.people.get(person.id))?.updated_at).not.toBe('2020-01-01T00:00:00.000Z')
  })

  it('changes nothing when the list is empty', async () => {
    const person = await createRecord(db.people, personValues())

    const count = await softDeleteMany(db.people, [])

    expect(count).toBe(0)
    expect((await db.people.get(person.id))?.deleted).toBe(false)
  })
})
