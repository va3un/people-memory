// Immutable photo versions survive interrupted publication, conflicts and deletion; canonical mirrors follow the manifest.
import type { PortableTables } from '../backup/schema'
import { MAX_PHOTO_BYTES, MAX_TOTAL_PHOTO_BYTES } from '../backup/schema'
import { checkPhoto, encodeBase64, decodeBase64, sha256 } from '../backup/codec'
import { type Wire, validateTables } from './model'
import { Dropbox, contentHash } from './dropbox'
import { SyncError } from './http'
export const versionPath = (hash: string) => '/photos/versions/' + hash + '.jpg'
export const mirrorPath = (id: string) => '/photos/' + encodeURIComponent(id) + '.jpg'
export async function hydrate(
  wire: Wire,
  local: PortableTables,
  client: Dropbox,
): Promise<PortableTables> {
  if (wire.tables.photos.reduce((sum, p) => sum + p.bytes, 0) > MAX_TOTAL_PHOTO_BYTES)
    throw new SyncError('invalid', 'Remote photos exceed safe limits. Local data was kept.')
  const photos: PortableTables['photos'] = []
  for (const row of wire.tables.photos) {
    const cached = local.photos.find((p) => p.sha256 === row.sha256)
    let data = cached?.data
    if (!data) {
      const file = await client.download(versionPath(row.sha256), MAX_PHOTO_BYTES)
      data = encodeBase64(file.data!)
    }
    const photo = { ...row, data }
    await checkPhoto(photo)
    photos.push(photo)
  }
  return validateTables({ ...wire.tables, photos })
}
async function immutable(client: Dropbox, data: Uint8Array) {
  const hash = await sha256(data),
    file = versionPath(hash),
    expected = await contentHash(data)
  try {
    const found = await client.download(file, MAX_PHOTO_BYTES, true)
    if (
      found.meta.content_hash
        ? found.meta.content_hash !== expected
        : !found.data || (await sha256(found.data)) !== hash
    )
      throw new SyncError(
        'invalid',
        'An archived Dropbox photo is corrupt. It was not overwritten; use a backup to repair it.',
      )
    return
  } catch (error) {
    if (!(error instanceof SyncError) || error.kind !== 'missing') throw error
  }
  try {
    await client.upload(file, data)
  } catch (error) {
    if (!(error instanceof SyncError) || error.kind !== 'revision') throw error
    const found = await client.download(file, MAX_PHOTO_BYTES)
    if ((await sha256(found.data!)) !== hash)
      throw new SyncError('invalid', 'Conflicting photo archive contents. Local data was kept.')
  }
}
export async function publishPhotos(tables: PortableTables, client: Dropbox) {
  if (!tables.photos.length) return
  await client.folders()
  const hashes = new Set<string>()
  for (const photo of tables.photos)
    if (!hashes.has(photo.sha256)) {
      await immutable(client, decodeBase64(photo.data))
      hashes.add(photo.sha256)
    }
  for (const personId of [...new Set(tables.photos.map((p) => p.person_id))].sort()) {
    const active = tables.photos
      .filter((p) => p.person_id === personId && !p.deleted)
      .sort((a, b) =>
        a.updated_at === b.updated_at
          ? a.id < b.id
            ? 1
            : -1
          : a.updated_at > b.updated_at
            ? -1
            : 1,
      )[0]
    const file = mirrorPath(personId)
    let previous: Awaited<ReturnType<Dropbox['download']>> | undefined
    try {
      previous = await client.download(file, MAX_PHOTO_BYTES, true)
    } catch (error) {
      if (!(error instanceof SyncError) || error.kind !== 'missing') throw error
    }
    const data = active ? decodeBase64(active.data) : undefined
    if (
      previous &&
      data &&
      (previous.meta.content_hash
        ? previous.meta.content_hash === (await contentHash(data))
        : previous.data && (await sha256(previous.data)) === active!.sha256)
    )
      continue
    if (previous) {
      const old = previous.data ?? (await client.download(file, MAX_PHOTO_BYTES)).data!
      if (old.length) await immutable(client, old)
    }
    if (data) await client.upload(file, data, previous?.meta.rev)
    else if (previous) await client.remove(file, previous.meta.rev)
  }
}
