// Tests for the typed helpers of every record type and for device settings.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, findMe } from './database'
import {
  createCaptureBatch,
  createContext,
  createMembership,
  createPerson,
  createPhoto,
  createRelationship,
  deleteCaptureBatch,
  deleteContext,
  deleteDeviceSetting,
  deleteMembership,
  deletePhoto,
  deleteRelationship,
  getDeviceSetting,
  personDefaults,
  setDeviceSetting,
  updateCaptureBatch,
  updateContext,
  updateMembership,
  updatePhoto,
  updateRelationship,
} from './typed'

// Every test starts with an empty database.
beforeEach(async () => {
  await db.open()
  await Promise.all([
    db.people.clear(),
    db.contexts.clear(),
    db.memberships.clear(),
    db.relationships.clear(),
    db.photos.clear(),
    db.captureBatches.clear(),
    db.deviceSettings.clear(),
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
    db.deviceSettings.clear(),
  ])
})

describe('context helpers', () => {
  it('creates, updates and soft deletes a context', async () => {
    const context = await createContext({ name: 'Borli', kind: 'place' })

    expect(context.deleted).toBe(false)
    expect(context.created_at).toBeTruthy()

    await updateContext(context.id, { city: 'Pune' })
    const updated = await db.contexts.get(context.id)
    expect(updated?.city).toBe('Pune')
    expect(updated?.updated_at).not.toBe(context.updated_at)

    await deleteContext(context.id)
    const deleted = await db.contexts.get(context.id)
    expect(deleted).toBeDefined()
    expect(deleted?.deleted).toBe(true)
  })
})

describe('membership helpers', () => {
  it('creates, updates and soft deletes a membership', async () => {
    const membership = await createMembership({
      person_id: 'person-1',
      context_id: 'context-1',
      role: 'Student',
    })

    expect(membership.role).toBe('Student')

    await updateMembership(membership.id, { period: '1996 to 2002' })
    expect((await db.memberships.get(membership.id))?.period).toBe('1996 to 2002')

    await deleteMembership(membership.id)
    expect((await db.memberships.get(membership.id))?.deleted).toBe(true)
  })
})

describe('relationship helpers', () => {
  it('creates, updates and soft deletes a relationship', async () => {
    const relationship = await createRelationship({
      person_id: 'anil',
      relative_id: 'meera',
      type: 'spouse',
    })

    expect(relationship.type).toBe('spouse')

    await updateRelationship(relationship.id, { notes: 'Met at college' })
    expect((await db.relationships.get(relationship.id))?.notes).toBe('Met at college')

    await deleteRelationship(relationship.id)
    expect((await db.relationships.get(relationship.id))?.deleted).toBe(true)
  })
})

describe('photo helpers', () => {
  it('creates, updates and soft deletes a photo', async () => {
    const photo = await createPhoto({
      person_id: 'anil',
      blob: new Blob(['fake'], { type: 'image/jpeg' }),
      mime: 'image/jpeg',
      width: 600,
      height: 400,
      bytes: 4,
    })

    expect(photo.mime).toBe('image/jpeg')

    await updatePhoto(photo.id, { width: 300 })
    expect((await db.photos.get(photo.id))?.width).toBe(300)

    await deletePhoto(photo.id)
    expect((await db.photos.get(photo.id))?.deleted).toBe(true)
  })
})

describe('capture batch helpers', () => {
  it('creates, updates and soft deletes a capture batch', async () => {
    const batch = await createCaptureBatch({
      raw_text: 'Met Sanket at Lionbridge',
      created_ids: { people: ['person-1'] },
      before_snapshots: [],
      after_snapshots: [],
      status: 'saved',
    })

    expect(batch.status).toBe('saved')

    await updateCaptureBatch(batch.id, { status: 'undone' })
    expect((await db.captureBatches.get(batch.id))?.status).toBe('undone')

    await deleteCaptureBatch(batch.id)
    expect((await db.captureBatches.get(batch.id))?.deleted).toBe(true)
  })
})

describe('device settings', () => {
  it('saves a value and reads it back', async () => {
    await setDeviceSetting('surname_rule', true)

    const value = await getDeviceSetting<boolean>('surname_rule')
    expect(value).toBe(true)
  })

  it('gives nothing back for a key that was never set', async () => {
    expect(await getDeviceSetting('never_saved')).toBeUndefined()
  })

  it('overwrites the value when the same key is saved again', async () => {
    await setDeviceSetting('model_name', 'first-model')
    await setDeviceSetting('model_name', 'second-model')

    expect(await getDeviceSetting('model_name')).toBe('second-model')
  })

  it('removes a setting when it is deleted', async () => {
    await setDeviceSetting('api_key', 'secret-value')
    await deleteDeviceSetting('api_key')

    expect(await getDeviceSetting('api_key')).toBeUndefined()
  })

  it('keeps the settings in the database and not in localStorage', async () => {
    await setDeviceSetting('provider', 'gemini')

    const row = await db.deviceSettings.get('provider')
    expect(row?.value).toBe('gemini')
    expect(localStorage.length).toBe(0)
  })
})

describe('findMe', () => {
  it('finds the one person marked as Me', async () => {
    await createPerson({ ...personDefaults('Varun Sample'), is_me: true })
    await createPerson({ ...personDefaults('Anil Joshi'), is_me: false })

    const me = await findMe()
    expect(me?.full_name).toBe('Varun Sample')
  })

  it('gives nothing back when no one is marked as Me', async () => {
    expect(await findMe()).toBeUndefined()
  })
})

describe('personDefaults', () => {
  it('uses the first word as the display name', () => {
    const person = personDefaults('  Meera   Joshi  ')
    expect(person.full_name).toBe('Meera Joshi')
    expect(person.display_name).toBe('Meera')
  })

  it('starts with no nicknames, no phones and an unknown gender', () => {
    const person = personDefaults('Anil Joshi')
    expect(person.nicknames).toEqual([])
    expect(person.phones).toEqual([])
    expect(person.gender).toBe('unknown')
    expect(person.is_me).toBe(false)
  })

  it('makes a fresh id every time', () => {
    expect(personDefaults('Anil Joshi').id).not.toBe(personDefaults('Anil Joshi').id)
  })
})