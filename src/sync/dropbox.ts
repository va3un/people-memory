// Revision-conditional App-folder file operations never force overwrite or expose token/error bodies.
import { z } from 'zod'
import { accessToken } from './tokens'
import { assertAuth, type Auth } from './store'
import { request, bytes, json, failure, SyncError } from './http'
import { sha256 } from '../backup/codec'
const metadata = z.object({
  rev: z.string().regex(/^[a-f0-9]{9,}$/),
  size: z.number().int().nonnegative(),
  content_hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
})
const header = (value: unknown) =>
  JSON.stringify(value).replace(
    /[\u007f-\uffff]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  )
export async function contentHash(data: Uint8Array) {
  const hashes: number[] = []
  for (let i = 0; i < data.length; i += 4 * 1024 * 1024) {
    const hash = await sha256(data.subarray(i, i + 4 * 1024 * 1024))
    hashes.push(...hash.match(/../g)!.map((n) => parseInt(n, 16)))
  }
  return sha256(Uint8Array.from(hashes))
}
function path(value: string) {
  if (
    value !== '/data.json' &&
    !/^\/photos\/(?:[^/\\]+\.jpg|versions\/[a-f0-9]{64}\.jpg)$/.test(value)
  )
    throw new SyncError('invalid', 'Unsafe Dropbox path refused.')
}
export class Dropbox {
  constructor(
    public auth: Auth,
    public signal?: AbortSignal,
  ) {}
  async call(url: string, init: RequestInit) {
    await assertAuth(this.auth)
    let token = await accessToken(this.auth, false, this.signal)
    await assertAuth(this.auth)
    let response = await request(
      url,
      { ...init, headers: { ...init.headers, Authorization: 'Bearer ' + token } },
      this.signal,
    )
    if (response.status === 401) {
      await response.body?.cancel()
      token = await accessToken(this.auth, true, this.signal)
      await assertAuth(this.auth)
      response = await request(
        url,
        { ...init, headers: { ...init.headers, Authorization: 'Bearer ' + token } },
        this.signal,
      )
    }
    await assertAuth(this.auth)
    if (this.signal?.aborted) throw new SyncError('network', 'Sync cancelled. Local data was kept.')
    return response
  }
  async download(file: string, limit: number, probe = false) {
    path(file)
    const response = await this.call('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Dropbox-API-Arg': header({ path: file }),
        ...(probe ? { Range: 'bytes=0-0' } : {}),
      },
    })
    if (!response.ok) await failure(response)
    let meta: z.infer<typeof metadata>
    try {
      meta = metadata.parse(JSON.parse(response.headers.get('Dropbox-API-Result') ?? ''))
      if (meta.size > limit) throw new Error()
    } catch {
      throw new SyncError(
        'invalid',
        'Dropbox file metadata is missing, invalid or oversized. Local data was kept.',
      )
    }
    const data = await bytes(response, probe && response.status === 206 ? 1 : limit, this.signal)
    if (!probe && meta.size !== data.length)
      throw new SyncError('invalid', 'Dropbox download is incomplete. Local data was kept.')
    if (
      (!probe || response.status !== 206) &&
      meta.content_hash &&
      (await contentHash(data)) !== meta.content_hash
    )
      throw new SyncError(
        'invalid',
        'Dropbox file failed its content hash check. Local data was kept.',
      )
    return { meta, data: probe && response.status === 206 ? undefined : data }
  }
  async upload(file: string, data: Uint8Array, rev?: string) {
    path(file)
    const digest = await contentHash(data)
    const response = await this.call('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': header({
          path: file,
          mode: rev ? { '.tag': 'update', update: rev } : { '.tag': 'add' },
          autorename: false,
          strict_conflict: true,
          content_hash: digest,
        }),
      },
      body: Uint8Array.from(data).buffer,
    })
    if (!response.ok) await failure(response)
    const parsed = metadata.safeParse(await json(response, 64 * 1024, this.signal))
    if (
      !parsed.success ||
      parsed.data.size !== data.length ||
      (parsed.data.content_hash && parsed.data.content_hash !== digest)
    )
      throw new SyncError(
        'invalid',
        'Dropbox upload acknowledgement is invalid. The remote copy is not confirmed safe; retry.',
      )
    return parsed.data.rev
  }
  async folders() {
    for (const dir of ['/photos', '/photos/versions']) {
      const response = await this.call('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dir, autorename: false }),
      })
      if (!response.ok) {
        if (response.status === 409) {
          const value = await json(response, 64 * 1024, this.signal)
          if (
            value?.error?.['.tag'] === 'path' &&
            value.error.path?.['.tag'] === 'conflict' &&
            value.error.path.conflict?.['.tag'] === 'folder'
          )
            continue
        }
        await failure(response)
      }
    }
  }
  async remove(file: string, rev: string) {
    path(file)
    const response = await this.call('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file, parent_rev: rev }),
    })
    if (!response.ok) await failure(response)
    await json(response, 64 * 1024, this.signal)
  }
}
