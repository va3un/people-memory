// Typed helpers for each kind of record, so screens never build raw objects.
import { db } from './database'
import { createRecord, newId, softDeleteRecord, updateRecord } from './records'
import type {
  CaptureBatch,
  Context,
  DeviceSetting,
  Membership,
  Person,
  Photo,
  Relationship,
} from './schema'

export type NewPerson = Omit<Person, 'id' | 'created_at' | 'updated_at' | 'deleted'> &
  Partial<Pick<Person, 'id' | 'created_at' | 'updated_at' | 'deleted'>>

export type NewContext = Omit<Context, 'id' | 'created_at' | 'updated_at' | 'deleted'> &
  Partial<Pick<Context, 'id' | 'created_at' | 'updated_at' | 'deleted'>>

export type NewMembership = Omit<Membership, 'id' | 'created_at' | 'updated_at' | 'deleted'> &
  Partial<Pick<Membership, 'id' | 'created_at' | 'updated_at' | 'deleted'>>

export type NewRelationship = Omit<Relationship, 'id' | 'created_at' | 'updated_at' | 'deleted'> &
  Partial<Pick<Relationship, 'id' | 'created_at' | 'updated_at' | 'deleted'>>

export type NewPhoto = Omit<Photo, 'id' | 'created_at' | 'updated_at' | 'deleted'> &
  Partial<Pick<Photo, 'id' | 'created_at' | 'updated_at' | 'deleted'>>

export type NewCaptureBatch = Omit<CaptureBatch, 'id' | 'created_at' | 'updated_at' | 'deleted'> &
  Partial<Pick<CaptureBatch, 'id' | 'created_at' | 'updated_at' | 'deleted'>>

export function createPerson(values: NewPerson): Promise<Person> {
  return createRecord(db.people, values)
}

export function updatePerson(id: string, changes: Partial<Person>): Promise<Person | undefined> {
  return updateRecord(db.people, id, changes)
}

export function deletePerson(id: string): Promise<Person | undefined> {
  return softDeleteRecord(db.people, id)
}

export function createContext(values: NewContext): Promise<Context> {
  return createRecord(db.contexts, values)
}

export function updateContext(id: string, changes: Partial<Context>): Promise<Context | undefined> {
  return updateRecord(db.contexts, id, changes)
}

export function deleteContext(id: string): Promise<Context | undefined> {
  return softDeleteRecord(db.contexts, id)
}

export function createMembership(values: NewMembership): Promise<Membership> {
  return createRecord(db.memberships, values)
}

export function updateMembership(
  id: string,
  changes: Partial<Membership>,
): Promise<Membership | undefined> {
  return updateRecord(db.memberships, id, changes)
}

export function deleteMembership(id: string): Promise<Membership | undefined> {
  return softDeleteRecord(db.memberships, id)
}

export function createRelationship(values: NewRelationship): Promise<Relationship> {
  return createRecord(db.relationships, values)
}

export function updateRelationship(
  id: string,
  changes: Partial<Relationship>,
): Promise<Relationship | undefined> {
  return updateRecord(db.relationships, id, changes)
}

export function deleteRelationship(id: string): Promise<Relationship | undefined> {
  return softDeleteRecord(db.relationships, id)
}

export function createPhoto(values: NewPhoto): Promise<Photo> {
  return createRecord(db.photos, values)
}

export function updatePhoto(id: string, changes: Partial<Photo>): Promise<Photo | undefined> {
  return updateRecord(db.photos, id, changes)
}

export function deletePhoto(id: string): Promise<Photo | undefined> {
  return softDeleteRecord(db.photos, id)
}

export function createCaptureBatch(values: NewCaptureBatch): Promise<CaptureBatch> {
  return createRecord(db.captureBatches, values)
}

export function updateCaptureBatch(
  id: string,
  changes: Partial<CaptureBatch>,
): Promise<CaptureBatch | undefined> {
  return updateRecord(db.captureBatches, id, changes)
}

// Device settings are simple key and value rows, stored in IndexedDB.
export async function getDeviceSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.deviceSettings.get(key)
  return row?.value as T | undefined
}

export async function setDeviceSetting(key: string, value: unknown): Promise<DeviceSetting> {
  const row: DeviceSetting = { key, value, updated_at: new Date().toISOString() }
  await db.deviceSettings.put(row)
  return row
}

export async function deleteDeviceSetting(key: string): Promise<void> {
  await db.deviceSettings.delete(key)
}

// Builds a person record with sensible defaults, so callers only fill what matters.
export function personDefaults(fullName: string): NewPerson {
  const firstName = fullName.trim().split(/\s+/)[0] ?? fullName
  return {
    id: newId(),
    full_name: fullName.trim(),
    display_name: firstName,
    nicknames: [],
    phones: [],
    gender: 'unknown',
    is_me: false,
  }
}
