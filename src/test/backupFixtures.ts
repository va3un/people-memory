// Tiny generated PNGs and fictional records provide byte-exact backup fixtures without personal data.
import { db } from '../db/database'
import { loadSampleData } from '../db/operations'
import { personDefaults, createPerson } from '../db/typed'
import { newId } from '../db/records'
export const BLACK_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=='
export const RED_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='
export const pngBlob = (data = BLACK_PNG) =>
  new Blob([Uint8Array.from(atob(data), (character) => character.charCodeAt(0))], {
    type: 'image/png',
  })
export async function seedBackupFixture() {
  await loadSampleData()
  const batchId = newId()
  const person = await createPerson({
    ...personDefaults('मीरा जोशी'),
    phones: ['+91 00000 00000'],
    notes: 'Fictional notes, with "quotes"\nand Unicode मीरा',
    birthday: { month: 2, day: 29, year: 2000 },
    maiden_name: 'Fictional Maiden',
    last_viewed_at: '2026-01-02T00:00:00.000Z',
    source_batch_id: batchId,
  })
  const blob = pngBlob(),
    photo = {
      id: newId(),
      person_id: person.id,
      created_at: person.created_at,
      updated_at: person.updated_at,
      deleted: false,
      blob,
      mime: 'image/png',
      width: 1,
      height: 1,
      bytes: blob.size,
    }
  await db.photos.bulkPut([photo, { ...photo, id: newId(), deleted: true }])
  await db.people.update('sample-person-rahul', { deleted: true })
  await db.contexts.update('sample-context-borli', { deleted: true })
  await db.memberships.update('sample-membership-sunil-borli', {
    deleted: true,
  })
  await db.relationships.update('sample-relationship-sunil-anil', {
    deleted: true,
  })
  await db.captureBatches.put({
    id: batchId,
    created_at: person.created_at,
    updated_at: person.updated_at,
    deleted: false,
    raw_text: 'Fictional capture history fixture only',
    created_ids: { people: [person.id], photos: [photo.id] },
    before_snapshots: [
      {
        table: 'people',
        id: person.id,
        values: { notes: 'Earlier fictional note' },
      },
    ],
    after_snapshots: [{ table: 'people', id: person.id, values: { notes: person.notes } }],
    status: 'saved',
  })
  await db.deviceSettings.bulkPut([
    {
      key: 'api_key',
      value: 'fictional-private-provider-key',
      updated_at: person.updated_at,
    },
    {
      key: 'dropbox_token',
      value: 'fictional-private-dropbox-token',
      updated_at: person.updated_at,
    },
    {
      key: 'sync-baseline',
      value: { device: 'fictional-device' },
      updated_at: person.updated_at,
    },
  ])
  return { person, photo }
}
