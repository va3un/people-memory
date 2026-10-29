// A fictional in-memory Dropbox enforces revisions and hashes; it never contacts an account.
import { contentHash } from '../sync/dropbox'
export class MockDropbox {
  files = new Map<string, { data: Uint8Array; rev: string }>()
  counter = 0
  uploads: string[] = []
  requests: { url: string; body: unknown; headers: Record<string, string> }[] = []
  conflictUploads = 0
  uploadFailure?: string
  missingPhoto = false
  unauthorized = 0
  tokenFailure = false
  onUpload?: () => Promise<void>
  onDownload?: () => Promise<void>
  loseAcknowledgement?: string
  async put(path: string, data: Uint8Array) {
    this.files.set(path, { data, rev: (++this.counter).toString(16).padStart(9, '0') })
  }
  async meta(file: { data: Uint8Array; rev: string }) {
    return { rev: file.rev, size: file.data.length, content_hash: await contentHash(file.data) }
  }
  fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const address = String(url),
      headers = init?.headers as Record<string, string>,
      arg = headers?.['Dropbox-API-Arg'] ? JSON.parse(headers['Dropbox-API-Arg']) : undefined
    this.requests.push({ url: address, body: arg ?? init?.body, headers })
    const json = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    const missing = () => json({ error: { '.tag': 'path', path: { '.tag': 'not_found' } } }, 409)
    const conflict = () =>
      json(
        { error: { '.tag': 'path', path: { '.tag': 'conflict', conflict: { '.tag': 'file' } } } },
        409,
      )
    if (address.endsWith('/oauth2/token'))
      return this.tokenFailure
        ? json({}, 400)
        : json({
            access_token: 'fictional-access-refreshed',
            refresh_token: 'fictional-refresh-token',
            expires_in: 14400,
            token_type: 'bearer',
            account_id: 'dbid:fictional-account',
            scope: 'files.content.read files.content.write',
          })
    if (this.unauthorized-- > 0) return json({}, 401)
    if (address.endsWith('/files/download')) {
      if (this.onDownload) {
        const callback = this.onDownload
        this.onDownload = undefined
        await callback()
      }
      const file = this.files.get(arg.path)
      if (!file || (this.missingPhoto && arg.path.includes('/photos/'))) return missing()
      const ranged = headers.Range === 'bytes=0-0' && file.data.length > 0
      return new Response(Uint8Array.from(ranged ? file.data.slice(0, 1) : file.data).buffer, {
        status: ranged ? 206 : 200,
        headers: { 'Dropbox-API-Result': JSON.stringify(await this.meta(file)) },
      })
    }
    if (address.endsWith('/files/upload')) {
      this.uploads.push(arg.path)
      if (this.uploadFailure === arg.path) throw new Error('fictional interrupted upload')
      if (arg.path === '/data.json' && this.conflictUploads-- > 0) return conflict()
      if (this.onUpload) {
        const callback = this.onUpload
        this.onUpload = undefined
        await callback()
      }
      const existing = this.files.get(arg.path)
      if (
        (arg.mode['.tag'] === 'add' && existing) ||
        (arg.mode['.tag'] === 'update' && existing?.rev !== arg.mode.update)
      )
        return conflict()
      const data = new Uint8Array(init?.body as ArrayBuffer)
      if (arg.content_hash !== (await contentHash(data))) return json({}, 400)
      await this.put(arg.path, data)
      if (this.loseAcknowledgement === arg.path) {
        this.loseAcknowledgement = undefined
        throw new Error('fictional lost acknowledgement')
      }
      return json(await this.meta(this.files.get(arg.path)!))
    }
    if (address.endsWith('/files/create_folder_v2')) return json({ metadata: {} })
    if (address.endsWith('/files/delete_v2')) {
      const body = JSON.parse(String(init?.body)),
        existing = this.files.get(body.path)
      if (!existing) return missing()
      if (existing.rev !== body.parent_rev) return conflict()
      this.files.delete(body.path)
      return json({ metadata: {} })
    }
    throw new Error('Unexpected mocked Dropbox endpoint')
  }
}
