// Shared helpers to create, update and soft-delete records in any table.
import type { Table } from 'dexie'
import type { BaseRecord } from './schema'

// Makes a new unique id. Uses the browser UUID maker when it is available.
export function newId(): string {
  const webCrypto = globalThis.crypto
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// The current time as a UTC ISO string, for example "2026-10-22T09:30:00.000Z".
export function nowIso(): string {
  return new Date().toISOString()
}

// Creates a record. Missing base fields are filled in.
export async function createRecord<T extends BaseRecord>(
  table: Table<T, string>,
  values: Omit<T, keyof BaseRecord> & Partial<BaseRecord>,
): Promise<T> {
  const now = nowIso()
  const record = {
    ...values,
    id: values.id ?? newId(),
    created_at: values.created_at ?? now,
    updated_at: now,
    deleted: values.deleted ?? false,
  } as T
  await table.put(record)
  return record
}

// Changes some fields of a record. The id and created_at never change.
export async function updateRecord<T extends BaseRecord>(
  table: Table<T, string>,
  id: string,
  changes: Partial<T>,
): Promise<T | undefined> {
  const existing = await table.get(id)
  if (!existing) return undefined
  const updated = {
    ...existing,
    ...changes,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: nowIso(),
  } as T
  await table.put(updated)
  return updated
}

// Marks a record as deleted. Records are never really removed, so deletions can sync.
export async function softDeleteRecord<T extends BaseRecord>(
  table: Table<T, string>,
  id: string,
): Promise<T | undefined> {
  return updateRecord(table, id, { deleted: true } as Partial<T>)
}

// Puts a soft-deleted record back.
export async function restoreRecord<T extends BaseRecord>(
  table: Table<T, string>,
  id: string,
): Promise<T | undefined> {
  return updateRecord(table, id, { deleted: false } as Partial<T>)
}

// Marks many records as deleted in one go.
export async function softDeleteMany<T extends BaseRecord>(
  table: Table<T, string>,
  ids: string[],
): Promise<number> {
  const now = nowIso()
  let count = 0
  await table.where('id').anyOf(ids).modify((record) => {
    record.deleted = true
    record.updated_at = now
    count += 1
  })
  return count
}
