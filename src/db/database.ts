// The Dexie database. All main data lives in IndexedDB, never in localStorage.
import Dexie, { type Table } from 'dexie'
import type {
  CaptureBatch,
  Context,
  DeviceSetting,
  Membership,
  Person,
  Photo,
  Relationship,
} from './schema'

export class PeopleDatabase extends Dexie {
  people!: Table<Person, string>
  contexts!: Table<Context, string>
  memberships!: Table<Membership, string>
  relationships!: Table<Relationship, string>
  photos!: Table<Photo, string>
  captureBatches!: Table<CaptureBatch, string>
  deviceSettings!: Table<DeviceSetting, string>

  constructor(name = 'people-memory') {
    super(name)
    this.version(1).stores({
      people: 'id, full_name, display_name, is_me, deleted, updated_at',
      contexts: 'id, name, kind, deleted, updated_at',
      memberships: 'id, person_id, context_id, deleted, updated_at',
      relationships: 'id, person_id, relative_id, type, deleted, updated_at',
      photos: 'id, person_id, deleted, updated_at',
      captureBatches: 'id, status, deleted, updated_at',
      deviceSettings: 'key, updated_at',
    })
  }
}

export const db = new PeopleDatabase()

// The "Me" person is the only record with is_me set.
export async function findMe(): Promise<Person | undefined> {
  return db.people.filter((person) => person.is_me).first()
}
