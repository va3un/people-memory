// Regression tests exercise real IndexedDB transactions using only fictional records.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './database'
import { savePerson, deletePersonWithUndo, undoPersonDelete } from './people'
import { personDefaults } from './typed'
import { shrinkImage } from '../lib/image'

vi.mock('../lib/image', () => ({
  shrinkImage: vi.fn(async () => ({
    blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
    mime: 'image/jpeg',
    width: 600,
    height: 400,
    bytes: 4,
  })),
}))
const file = () => new File(['fictional'], 'fictional.jpg', { type: 'image/jpeg' })
beforeEach(async () => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  await Promise.all([db.people.clear(), db.photos.clear(), db.relationships.clear()])
})

describe('atomic profile saving', () => {
  it('rejects blank names before processing or storing anything', async () => {
    await expect(savePerson({ values: personDefaults(' \n '), photo: file() })).rejects.toThrow(
      'Enter a name',
    )
    expect(await db.people.count()).toBe(0)
    expect(shrinkImage).not.toHaveBeenCalled()
  })
  it('stores the selected direction as exactly one relationship row', async () => {
    const relative = await savePerson({ values: personDefaults('Fictional Parent') })
    const person = await savePerson({
      values: personDefaults(' Fictional  Child '),
      photo: file(),
      relativeId: relative.id,
      relationshipType: 'child',
    })
    const links = await db.relationships.toArray()
    expect(person.full_name).toBe('Fictional Child')
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({
      person_id: person.id,
      relative_id: relative.id,
      type: 'child',
    })
    expect(await db.photos.where('person_id').equals(person.id).count()).toBe(1)
  })
  it('leaves no person or links behind when photo decoding fails, and retry succeeds once', async () => {
    vi.mocked(shrinkImage).mockRejectedValueOnce(new Error('Unreadable photo'))
    const input = { values: personDefaults('Fictional Retry'), photo: file() }
    await expect(savePerson(input)).rejects.toThrow('Unreadable photo')
    expect(await db.people.count()).toBe(0)
    expect(await db.photos.count()).toBe(0)
    await savePerson(input)
    expect(await db.people.count()).toBe(1)
    expect(await db.photos.count()).toBe(1)
  })
  it('rolls back the person and photo when storing the relationship fails', async () => {
    const relative = await savePerson({ values: personDefaults('Fictional Relative') })
    const fail = () => {
      throw new Error('Simulated write failure')
    }
    db.relationships.hook('creating', fail)
    try {
      await expect(
        savePerson({
          values: personDefaults('Fictional Rollback'),
          photo: file(),
          relativeId: relative.id,
          relationshipType: 'spouse',
        }),
      ).rejects.toThrow('Simulated')
    } finally {
      db.relationships.hook('creating').unsubscribe(fail)
    }
    expect(await db.people.count()).toBe(1)
    expect(await db.photos.count()).toBe(0)
    expect(await db.relationships.count()).toBe(0)
  })
  it('rejects deleted relatives without writing a new person', async () => {
    const relative = await savePerson({ values: personDefaults('Fictional Deleted Relative') })
    await deletePersonWithUndo(relative)
    await expect(
      savePerson({
        values: personDefaults('Fictional New'),
        relativeId: relative.id,
        relationshipType: 'parent',
      }),
    ).rejects.toThrow('no longer available')
    expect(await db.people.count()).toBe(1)
  })
  it('preserves identity, creation time, and unedited fields when editing', async () => {
    const original = await savePerson({
      values: {
        ...personDefaults('Fictional Original'),
        is_me: false,
        birthday: { month: 2, day: 29 },
        notes: 'Fictional note',
        phones: ['+910000000000', '12345'],
      },
      photo: file(),
    })
    const photo = (await db.photos.toArray())[0]
    const edited = await savePerson({
      values: { ...original, full_name: 'Fictional Edited' },
      original,
    })
    expect(edited).toMatchObject({
      id: original.id,
      created_at: original.created_at,
      birthday: original.birthday,
      phones: original.phones,
      notes: original.notes,
    })
    expect((await db.photos.toArray())[0].id).toBe(photo.id)
  })
  it('rolls back an edit and retains the old photo when photo writing fails', async () => {
    const original = await savePerson({
      values: personDefaults('Fictional Existing'),
      photo: file(),
    })
    const fail = () => {
      throw new Error('Photo storage full')
    }
    db.photos.hook('updating', fail)
    try {
      await expect(
        savePerson({
          values: { ...original, full_name: 'Fictional Changed' },
          original,
          photo: file(),
        }),
      ).rejects.toThrow('Photo storage full')
    } finally {
      db.photos.hook('updating').unsubscribe(fail)
    }
    expect(await db.people.get(original.id)).toEqual(original)
    expect((await db.photos.toArray())[0].deleted).toBe(false)
  })
  it('replaces the existing photo without changing its ID and soft-deletes removed photos', async () => {
    let original = await savePerson({ values: personDefaults('Fictional Photo'), photo: file() })
    const photo = (await db.photos.toArray())[0]
    original = await savePerson({ values: original, original, photo: file() })
    expect(await db.photos.count()).toBe(1)
    expect((await db.photos.toArray())[0].id).toBe(photo.id)
    await savePerson({ values: original, original, removePhoto: true })
    expect((await db.photos.get(photo.id))?.deleted).toBe(true)
  })
  it('stops stale edits and deletes from overwriting another tab', async () => {
    const original = await savePerson({ values: personDefaults('Fictional Concurrent') })
    await savePerson({ values: { ...original, notes: 'Later fictional edit' }, original })
    await expect(
      savePerson({ values: { ...original, city: 'Test City' }, original }),
    ).rejects.toThrow('changed elsewhere')
    await expect(deletePersonWithUndo(original)).rejects.toThrow('changed elsewhere')
    expect((await db.people.get(original.id))?.notes).toBe('Later fictional edit')
  })
  it('validates birthdays without inventing an optional year', async () => {
    await expect(
      savePerson({
        values: { ...personDefaults('Fictional Birthday'), birthday: { month: 2, day: 30 } },
      }),
    ).rejects.toThrow('valid birthday')
    const person = await savePerson({
      values: { ...personDefaults('Fictional Leap Birthday'), birthday: { month: 2, day: 29 } },
    })
    expect(person.birthday).toEqual({ month: 2, day: 29 })
  })
})

describe('10-second soft delete Undo', () => {
  it('restores the person with photos and links intact', async () => {
    const relative = await savePerson({ values: personDefaults('Fictional Relative') })
    const person = await savePerson({
      values: personDefaults('Fictional Delete'),
      photo: file(),
      relativeId: relative.id,
      relationshipType: 'friend',
    })
    const receipt = await deletePersonWithUndo(person)
    expect((await db.people.get(person.id))?.deleted).toBe(true)
    await undoPersonDelete(receipt)
    expect((await db.people.get(person.id))?.deleted).toBe(false)
    expect((await db.photos.toArray())[0].deleted).toBe(false)
    expect((await db.relationships.toArray())[0].deleted).toBe(false)
  })
  it('refuses expired Undo and preserves changes made after deletion', async () => {
    const person = await savePerson({ values: personDefaults('Fictional Expired') })
    const receipt = await deletePersonWithUndo(person)
    await expect(undoPersonDelete({ ...receipt, expiresAt: Date.now() })).rejects.toThrow('ended')
    await db.people.update(person.id, { notes: 'Later fictional edit' })
    await expect(undoPersonDelete(receipt)).rejects.toThrow('changed after deletion')
    expect((await db.people.get(person.id))?.notes).toBe('Later fictional edit')
  })
})
