// Binary encoding is lossless; file limits and checksums are enforced before any import write.
import {
  MAX_FILE_BYTES,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_PHOTO_BYTES,
  validateBackup,
  type BackupFile,
  type PortableTables,
} from './schema'
import type { Photo } from '../db/schema'

export function readBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.onabort = () => reject(new Error('File reading was cancelled.'))
    reader.readAsArrayBuffer(blob)
  })
}
export async function sha256(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error('Backup verification requires HTTPS or localhost.')
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}
export function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = []
  for (let start = 0; start < bytes.length; start += 32768)
    chunks.push(String.fromCharCode(...bytes.subarray(start, start + 32768)))
  return btoa(chunks.join(''))
}
export function decodeBase64(value: string): Uint8Array {
  if (value.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(value))
    throw new Error('Invalid photo base64 data.')
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
  if (encodeBase64(bytes) !== value) throw new Error('Non-canonical photo base64 data.')
  return bytes
}
function photoDimensions(bytes: Uint8Array, mime: string): [number, number] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (
    mime === 'image/png' &&
    bytes.length >= 33 &&
    bytes.slice(0, 8).every((v, i) => v === [137, 80, 78, 71, 13, 10, 26, 10][i]) &&
    String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR'
  )
    return [view.getUint32(16), view.getUint32(20)]
  if (
    mime === 'image/jpeg' &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes.at(-2) === 255 &&
    bytes.at(-1) === 217
  ) {
    let offset = 2
    while (offset + 4 < bytes.length) {
      if (bytes[offset++] !== 255) break
      while (bytes[offset] === 255) offset++
      const marker = bytes[offset++],
        length = view.getUint16(offset)
      if (length < 2 || offset + length > bytes.length) break
      if (
        [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) &&
        length >= 8
      )
        return [view.getUint16(offset + 5), view.getUint16(offset + 3)]
      if (marker === 218) break
      offset += length
    }
  }
  throw new Error('A photo has an invalid image header or unsupported format.')
}
async function verifyImage(blob: Blob, width: number, height: number): Promise<void> {
  const image = new Image()
  if (typeof image.decode !== 'function')
    throw new Error('This browser cannot verify photos. Use a current Chrome or Edge browser.')
  const url = URL.createObjectURL(blob)
  let timeout: number | undefined
  try {
    image.src = url
    await Promise.race([
      image.decode(),
      new Promise<never>((_resolve, reject) => {
        timeout = window.setTimeout(
          () => reject(new Error('Photo verification timed out.')),
          15_000,
        )
      }),
    ])
    if (image.naturalWidth !== width || image.naturalHeight !== height)
      throw new Error('Decoded photo dimensions do not match.')
  } catch {
    throw new Error('A photo cannot be decoded or has mismatched dimensions.')
  } finally {
    window.clearTimeout(timeout)
    image.src = ''
    URL.revokeObjectURL(url)
  }
}
export async function checkPhoto(photo: PortableTables['photos'][number]): Promise<Photo> {
  const bytes = decodeBase64(photo.data)
  if (
    bytes.length !== photo.bytes ||
    bytes.length > MAX_PHOTO_BYTES ||
    (await sha256(bytes)) !== photo.sha256
  )
    throw new Error('A photo has an invalid byte count or checksum.')
  const [width, height] = photoDimensions(bytes, photo.mime)
  if (
    width !== photo.width ||
    height !== photo.height ||
    width > 600 ||
    height > 600 ||
    !width ||
    !height
  )
    throw new Error('Photo dimensions do not match the backup.')
  const { data: _data, sha256: _hash, ...row } = photo
  const blob = new Blob([Uint8Array.from(bytes).buffer], { type: photo.mime })
  await verifyImage(blob, width, height)
  return { ...row, blob }
}
export async function parseBackup(file: Blob, signal?: AbortSignal): Promise<BackupFile> {
  if (file.size > MAX_FILE_BYTES) throw new Error('JSON backups must be 64 MB or smaller.')
  if (signal?.aborted) throw new Error('Operation cancelled. No records were changed.')
  let value: unknown
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readBlob(file)))
  } catch {
    throw new Error('This file is not valid UTF-8 JSON. No records were changed.')
  }
  const backup = validateBackup(value)
  if (backup.tables.photos.reduce((sum, photo) => sum + photo.bytes, 0) > MAX_TOTAL_PHOTO_BYTES)
    throw new Error('Decoded photos exceed the 32 MB backup limit.')
  for (const photo of backup.tables.photos) {
    if (signal?.aborted) throw new Error('Operation cancelled. No records were changed.')
    await checkPhoto(photo)
  }
  return backup
}
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.entries(entry)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b)),
        )
      : entry,
  )
}
export async function fingerprint(tables: PortableTables): Promise<string> {
  const ordered = Object.fromEntries(
    Object.entries(tables).map(([key, rows]) => [
      key,
      [...rows].sort((a, b) => a.id.localeCompare(b.id)),
    ]),
  )
  return sha256(new TextEncoder().encode(canonical(ordered)))
}
