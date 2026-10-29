// Fictional transactions and a revision-enforcing mock cover no-loss sync, auth recovery and photos.
import { Blob as NodeBlob } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { liveQuery } from 'dexie'
import { stateKey } from './store'
import { db } from '../db/database'
import { DATA_TABLES } from '../backup/schema'
import { canonical, readBlob } from '../backup/codec'
import { portableDataset, readSnapshot } from '../backup/snapshot'
import { createPerson, personDefaults } from '../db/typed'
import { seedBackupFixture } from '../test/backupFixtures'
import { MockDropbox } from '../test/mockDropbox'
import { makeWire, parseWire, prepare, emptyTables } from './model'
import { merge } from './merge'
import {
  AUTH,
  CLIENT,
  readAuth,
  readState,
  putSetting,
  snapshotKey,
  getSetting,
  disconnect,
  saveClient,
} from './store'
import { startAuthorization, finishAuthorization } from './auth'
import { enableSync, conflicts, recoverConflict, archiveConflict } from './recovery'
import { syncNow } from './engine'
import { status } from './status'
import { versionPath, mirrorPath } from './photos'
let server: MockDropbox
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal(
    'Image',
    class {
      src = ''
      naturalWidth = 1
      naturalHeight = 1
      async decode() {}
    },
  )
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fictional')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: async (_name: string, option: unknown, callback?: Function) =>
        await (callback ?? (option as Function))({ name: _name, mode: 'exclusive' }),
    },
  })
  await Promise.all([...DATA_TABLES.map((t) => db.table(t).clear()), db.deviceSettings.clear()])
  server = new MockDropbox()
  vi.stubGlobal('fetch', vi.fn(server.fetch))
  await putSetting(CLIENT, { appKey: 'fictionalappkey123', confirmed: true })
  await putSetting(AUTH, {
    generation: 'fictional-session',
    appKey: 'fictionalappkey123',
    account: 'dbid:fictional-account',
    access: 'fictional-access-token',
    refresh: 'fictional-refresh-token',
    expires: Date.now() + 14400000,
    enabled: false,
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
const local = async () => portableDataset(await readSnapshot())
async function enabled() {
  const auth = (await readAuth())!
  await enableSync(auth, 'SYNC')
  return (await readAuth())!
}
async function remote(tables: Awaited<ReturnType<typeof local>>) {
  await server.put('/data.json', new TextEncoder().encode(canonical(makeWire(tables))))
  for (const p of tables.photos)
    await server.put(
      versionPath(p.sha256),
      Uint8Array.from(atob(p.data), (c) => c.charCodeAt(0)),
    )
}
it('disabled connections send nothing and first sync requires typed confirmation and a recoverable snapshot', async () => {
  await createPerson(personDefaults('Fictional First Person'))
  await syncNow()
  expect(fetch).not.toHaveBeenCalled()
  await expect(enableSync((await readAuth())!, 'sync')).rejects.toThrow('Type SYNC')
  const before = await local(),
    auth = await enabled()
  expect((await getSetting<any>(snapshotKey(auth))).tables).toEqual(before)
  expect((await readState(auth)).lastSuccess).toBeUndefined()
})
it('missing remote uploads all records, tombstones, capture history and original photo bytes without device settings or view history', async () => {
  await seedBackupFixture()
  const original = await local(),
    auth = await enabled()
  await syncNow()
  const wire = parseWire(JSON.parse(new TextDecoder().decode(server.files.get('/data.json')!.data)))
  expect(wire.tables.people).toHaveLength(original.people.length)
  expect(wire.tables.captureBatches).toHaveLength(1)
  expect(wire.tables.people.every((p) => !Object.hasOwn(p, 'last_viewed_at'))).toBe(true)
  expect(new TextDecoder().decode(server.files.get('/data.json')!.data)).not.toContain(
    'fictional-private-provider-key',
  )
  expect(new TextDecoder().decode(server.files.get('/data.json')!.data)).not.toContain(
    'fictional-refresh-token',
  )
  expect((await readState(auth)).lastSuccess).toBeDefined()
  for (const photo of original.photos) {
    expect(server.files.get(versionPath(photo.sha256))!.data).toEqual(
      new Uint8Array(await readBlob((await db.photos.get(photo.id))!.blob)),
    )
  }
  expect((await db.deviceSettings.get('api_key'))!.value).toBe('fictional-private-provider-key')
  expect(
    (await db.people.get(original.people.find((p) => p.last_viewed_at)!.id))!.last_viewed_at,
  ).toBeDefined()
})
it('an empty remote never erases local data and empty local restores every remote record/photo without clearing device settings', async () => {
  await seedBackupFixture()
  const saved = await local()
  await remote(emptyTables())
  await enabled()
  await syncNow()
  expect(await local()).toEqual(saved)
  await remote(saved)
  for (const table of DATA_TABLES) await db.table(table).clear()
  await syncNow()
  expect(await local()).toEqual({
    ...saved,
    people: saved.people.map(({ last_viewed_at: _v, ...p }) => p),
  })
  expect((await db.deviceSettings.get('dropbox_token'))!.value).toBe(
    'fictional-private-dropbox-token',
  )
})
it('concurrent edits preserve losing text in stable deduplicated recovery copies and support guarded recovery', async () => {
  const person = await createPerson(personDefaults('Fictional Shared Person'))
  await enabled()
  await syncNow()
  const other = await local()
  other.people[0].notes = 'Remote independent edit'
  other.people[0].updated_at = '2099-01-01T00:00:00.000Z'
  await remote(other)
  await db.people.update(person.id, {
    notes: 'Local independent edit',
    updated_at: '2098-01-01T00:00:00.000Z',
  })
  await syncNow()
  expect((await db.people.get(person.id))!.notes).toBe('Remote independent edit')
  const copies = await conflicts()
  expect(copies).toHaveLength(1)
  expect(copies[0].value.loser.notes).toBe('Local independent edit')
  await syncNow()
  expect(await conflicts()).toHaveLength(1)
  await recoverConflict(copies[0].key)
  expect((await db.people.get(person.id))!.notes).toBe('Local independent edit')
  expect((await conflicts()).some((c) => c.value.loser.notes === 'Remote independent edit')).toBe(
    true,
  )
})
it('delete versus edit retains the deletion and edited variant rather than silently resurrecting or losing either', async () => {
  const p = await createPerson(personDefaults('Fictional Delete Conflict'))
  await enabled()
  await syncNow()
  const other = await local()
  other.people[0].deleted = true
  other.people[0].updated_at = '2099-01-01T00:00:00.000Z'
  await remote(other)
  await db.people.update(p.id, {
    notes: 'Concurrent edited note',
    updated_at: '2098-01-01T00:00:00.000Z',
  })
  await syncNow()
  expect((await db.people.get(p.id))!.deleted).toBe(true)
  expect((await conflicts())[0].value.loser.notes).toBe('Concurrent edited note')
})
it('single-side clock-skew edits win by baseline change even when their timestamp is older', async () => {
  const p = await createPerson({
    ...personDefaults('Fictional Skew'),
    updated_at: '2099-01-01T00:00:00.000Z',
  })
  await enabled()
  await syncNow()
  await db.people.update(p.id, {
    notes: 'Actual new edit on slow clock',
    updated_at: '2000-01-01T00:00:00.000Z',
  })
  await syncNow()
  expect((await conflicts()).length).toBe(0)
  expect((await db.people.get(p.id))!.notes).toContain('slow clock')
})
it('same-time merge is deterministic in both directions using stable content change IDs', async () => {
  const p = await createPerson(personDefaults('Fictional Tie')),
    a = await local(),
    b = structuredClone(a)
  a.people[0].notes = 'A'
  b.people[0].notes = 'B'
  const ap = await prepare(a),
    bp = await prepare(b),
    ab = merge(ap, bp, {}),
    ba = merge(bp, ap, {})
  expect(ab.tables).toEqual(ba.tables)
  expect(ab.conflicts[0].winnerHash).toBe(ba.conflicts[0].winnerHash)
  expect(ab.conflicts[0].id).toBe(p.id)
})
it.each(['bad-json', 'future-version', 'unknown-setting', 'dangling-link', 'two-me'])(
  'refuses %s remote content without changing the previous valid local directory',
  async (kind) => {
    await seedBackupFixture()
    const before = await local()
    await enabled()
    const wire: any = makeWire(before)
    if (kind === 'future-version') wire.schema = 99
    if (kind === 'unknown-setting')
      wire.deviceSettings = [{ key: 'api_key', value: 'do not import' }]
    if (kind === 'dangling-link') wire.tables.memberships[0].person_id = 'missing-person'
    if (kind === 'two-me') wire.tables.people.find((p: any) => !p.is_me).is_me = true
    await server.put(
      '/data.json',
      new TextEncoder().encode(kind === 'bad-json' ? 'not JSON' : JSON.stringify(wire)),
    )
    await expect(syncNow()).rejects.toThrow()
    expect(await local()).toEqual(before)
    expect(server.uploads).toHaveLength(0)
  },
)
it('missing or corrupt remote photo preserves the previous local state and never uploads an empty substitute', async () => {
  await seedBackupFixture()
  const data = await local()
  await remote(data)
  await enabled()
  for (const table of DATA_TABLES) await db.table(table).clear()
  await createPerson(personDefaults('Fictional Local Kept'))
  const before = await local()
  server.missingPhoto = true
  await expect(syncNow()).rejects.toThrow()
  expect(await local()).toEqual(before)
  server.missingPhoto = false
  for (const p of data.photos)
    await server.put(versionPath(p.sha256), new TextEncoder().encode('corrupt'))
  await expect(syncNow()).rejects.toThrow()
  expect(await local()).toEqual(before)
})
it('revision collisions retry at most three times and keep all local edits and the old successful baseline', async () => {
  const p = await createPerson(personDefaults('Fictional Revision'))
  const auth = await enabled()
  await syncNow()
  const success = (await readState(auth)).lastSuccess
  await db.people.update(p.id, { notes: 'Kept through collisions' })
  server.conflictUploads = 3
  const before = server.uploads.length
  await expect(syncNow()).rejects.toThrow('changed during sync')
  expect(server.uploads.length - before).toBe(3)
  expect((await db.people.get(p.id))!.notes).toBe('Kept through collisions')
  expect((await readState(auth)).lastSuccess).toBe(success)
  expect((await readState(auth)).pending).toBe(true)
  await syncNow()
  expect((await readState(auth)).pending).toBe(false)
})
it('interrupted data upload leaves local edits safe and retries idempotently', async () => {
  const p = await createPerson(personDefaults('Fictional Interrupted'))
  const auth = await enabled()
  server.uploadFailure = '/data.json'
  await expect(syncNow()).rejects.toThrow()
  expect((await readState(auth)).lastSuccess).toBeUndefined()
  expect(await db.people.get(p.id)).toEqual(p)
  server.uploadFailure = undefined
  await syncNow()
  const count = server.uploads.length
  await syncNow()
  expect(server.uploads.length).toBe(count)
})
it('interrupted photo upload never claims success, retains bytes and completes safely on retry', async () => {
  await seedBackupFixture()
  const before = await local(),
    auth = await enabled()
  server.uploadFailure = versionPath(before.photos[0].sha256)
  await expect(syncNow()).rejects.toThrow()
  expect(await local()).toEqual(before)
  expect((await readState(auth)).lastSuccess).toBeUndefined()
  server.uploadFailure = undefined
  await syncNow()
  expect((await readState(auth)).lastSuccess).toBeDefined()
  const count = server.uploads.length
  await syncNow()
  expect(server.uploads.length).toBe(count)
})
it('photo deletion propagates its tombstone and conditionally removes the mirror while preserving immutable recovery bytes', async () => {
  await seedBackupFixture()
  const data = await local()
  await enabled()
  await syncNow()
  const photo = data.photos.find((p) => !p.deleted)!
  expect(server.files.has(mirrorPath(photo.person_id))).toBe(true)
  await db.photos.put({
    ...(await db.photos.get(photo.id))!,
    deleted: true,
    updated_at: new Date().toISOString(),
  })
  await syncNow()
  expect(server.files.has(mirrorPath(photo.person_id))).toBe(false)
  expect(server.files.has(versionPath(photo.sha256))).toBe(true)
  expect(
    parseWire(
      JSON.parse(new TextDecoder().decode(server.files.get('/data.json')!.data)),
    ).tables.photos.find((p) => p.id === photo.id)!.deleted,
  ).toBe(true)
  const request = server.requests.find((r) => r.url.endsWith('/delete_v2'))!
  expect(JSON.parse(String(request.body)).parent_rev).toMatch(/^[a-f0-9]+$/)
})
it('offline work skips network quietly and remains pending until an explicit retry succeeds', async () => {
  await createPerson(personDefaults('Fictional Offline'))
  const auth = await enabled()
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  await syncNow()
  expect(fetch).not.toHaveBeenCalled()
  expect((await readState(auth)).pending).toBe(true)
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  await syncNow()
  expect((await readState(auth)).lastSuccess).toBeDefined()
})
it('refreshes expired/401 tokens once and never sends a refresh token to content endpoints or records', async () => {
  await createPerson(personDefaults('Fictional Refresh'))
  await enabled()
  const auth = (await readAuth())!
  await putSetting(AUTH, { ...auth, expires: 0 })
  await syncNow()
  expect(server.requests.filter((r) => r.url.endsWith('/oauth2/token'))).toHaveLength(1)
  expect(
    server.requests
      .filter((r) => !r.url.endsWith('/oauth2/token'))
      .every((r) => !String(r.body).includes('fictional-refresh-token')),
  ).toBe(true)
  server.unauthorized = 1
  await syncNow()
  expect(server.requests.filter((r) => r.url.endsWith('/oauth2/token'))).toHaveLength(2)
})
it('failed refresh requires sign-in without clearing records or recreating disconnected credentials', async () => {
  const p = await createPerson(personDefaults('Fictional Expired'))
  await enabled()
  const auth = (await readAuth())!
  await putSetting(AUTH, { ...auth, expires: 0 })
  server.tokenFailure = true
  await expect(syncNow()).rejects.toThrow('authorization failed')
  expect(await readAuth()).toBeUndefined()
  expect(await db.people.get(p.id)).toEqual(p)
})
it('a local edit while data uploads remains unsynced and is never overwritten by completion bookkeeping', async () => {
  const p = await createPerson(personDefaults('Fictional In Flight'))
  await enabled()
  server.onUpload = async () => {
    await db.people.update(p.id, { notes: 'Edited during upload' })
  }
  await syncNow()
  expect((await db.people.get(p.id))!.notes).toBe('Edited during upload')
  expect((await status()).unsynced).toBe(1)
  await syncNow()
  expect((await status()).unsynced).toBe(0)
})
it('recovery refuses a stale active record; keeping active archives without deleting the preserved version', async () => {
  const p = await createPerson(personDefaults('Fictional Recovery'))
  await enabled()
  await syncNow()
  const other = await local()
  other.people[0].notes = 'Remote'
  other.people[0].updated_at = '2099-01-01T00:00:00.000Z'
  await remote(other)
  await db.people.update(p.id, { notes: 'Local' })
  await syncNow()
  const copy = (await conflicts())[0]
  await db.people.update(p.id, { city: 'Later city' })
  await expect(recoverConflict(copy.key)).rejects.toThrow('changed after')
  await archiveConflict(copy.key)
  expect((await conflicts())[0].value.resolved).toBe(true)
  expect((await conflicts())[0].value.loser.notes).toBe('Local')
})
it('PKCE uses offline access, exact Appendix B scopes, no App secret, and single-use expiring state', async () => {
  await disconnect()
  const url = new URL(await startAuthorization('http://localhost:5173'))
  expect(url.searchParams.get('token_access_type')).toBe('offline')
  expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  expect(url.searchParams.get('scope')).toBe('files.content.read files.content.write')
  expect(url.searchParams.has('client_secret')).toBe(false)
  const callback =
    'http://localhost:5173?code=fictional-code&state=' + url.searchParams.get('state')
  await expect(
    finishAuthorization(callback.replace('fictional-code', 'fictional-code') + '&state=duplicate'),
  ).rejects.toThrow()
  await finishAuthorization(callback)
  expect((await readAuth())!.enabled).toBe(false)
  await expect(finishAuthorization(callback)).rejects.toThrow('state')
  const tokenRequest = server.requests.find((r) => r.url.endsWith('/oauth2/token'))!
  expect(String(tokenRequest.body)).toContain('code_verifier=')
  expect(String(tokenRequest.body)).not.toContain('client_secret')
})
it('unconfigured setup cannot authorize, and an account change gets a separate disabled session and recovery namespace', async () => {
  await disconnect()
  await saveClient('', false)
  await expect(startAuthorization('http://localhost:5173')).rejects.toThrow('Appendix B')
  await saveClient('fictionalappkey123', true)
  await createPerson(personDefaults('Fictional Existing'))
  const url = new URL(await startAuthorization('http://localhost:5173'))
  await finishAuthorization(
    'http://localhost:5173?code=fictional&state=' + url.searchParams.get('state'),
  )
  expect((await readAuth())!.enabled).toBe(false)
  expect(await db.people.count()).toBe(1)
})
it('a lost successful upload acknowledgement is recovered idempotently without publishing duplicate versions', async () => {
  await createPerson(personDefaults('Fictional Lost Ack'))
  const auth = await enabled()
  server.loseAcknowledgement = '/data.json'
  await expect(syncNow()).rejects.toThrow()
  expect((await readState(auth)).lastSuccess).toBeUndefined()
  expect(server.files.has('/data.json')).toBe(true)
  const count = server.uploads.length
  await syncNow()
  expect(server.uploads.length).toBe(count)
  expect((await readState(auth)).lastSuccess).toBeDefined()
})
it('a real concurrent revision change re-downloads and retains both devices’ new records', async () => {
  await createPerson(personDefaults('Fictional Existing'))
  await enabled()
  await syncNow()
  const previous = await local()
  await createPerson(personDefaults('Fictional Local New'))
  const remotePerson = {
    ...previous.people[0],
    id: crypto.randomUUID(),
    full_name: 'Fictional Remote New',
  }
  server.onUpload = async () => {
    await remote({ ...previous, people: [...previous.people, remotePerson] })
  }
  await syncNow()
  expect((await local()).people.map((p) => p.full_name)).toEqual(
    expect.arrayContaining(['Fictional Local New', 'Fictional Remote New']),
  )
})
it('local writes during download force a fresh merge rather than being lost', async () => {
  const p = await createPerson(personDefaults('Fictional During Download'))
  await enabled()
  await syncNow()
  server.onDownload = async () => {
    await db.people.update(p.id, { notes: 'Later local edit' })
  }
  await syncNow()
  expect((await db.people.get(p.id))!.notes).toBe('Later local edit')
})
it('a late local write failure rolls back merged rows and conflict copies and retains successful baseline', async () => {
  await seedBackupFixture()
  const auth = await enabled()
  await syncNow()
  const other = await local()
  other.people[0].notes = 'New remote note'
  other.people[0].updated_at = '2099-01-01T00:00:00.000Z'
  await remote(other)
  await db.people.update(other.people[0].id, { notes: 'Concurrent local note' })
  const before = await local(),
    state = await readState(auth)
  const fail = () => {
    throw new DOMException('Fictional full storage', 'QuotaExceededError')
  }
  db.captureBatches.hook('updating', fail)
  try {
    await expect(syncNow()).rejects.toThrow('Fictional full storage')
  } finally {
    db.captureBatches.hook('updating').unsubscribe(fail)
  }
  expect(await local()).toEqual(before)
  expect(await conflicts()).toHaveLength(0)
  expect((await readState(auth)).baseline).toEqual(state.baseline)
  await syncNow()
  expect(await conflicts()).toHaveLength(1)
})
it('account switching stays paused and preserves the old account recovery snapshot and every local record', async () => {
  const person = await createPerson(personDefaults('Fictional Old Account')),
    old = (await readAuth())!
  await enableSync(old, 'SYNC')
  const oldSnapshot = await getSetting(snapshotKey(old))
  await disconnect()
  const url = new URL(await startAuthorization('http://localhost:5173'))
  server.fetch = server.fetch
  await finishAuthorization(
    'http://localhost:5173?code=fictional&state=' + url.searchParams.get('state'),
  )
  const next = (await readAuth())!
  expect(next.enabled).toBe(false)
  expect(await getSetting(snapshotKey(old))).toEqual(oldSnapshot)
  expect(await db.people.get(person.id)).toEqual(person)
})
it('disconnect during a pending token exchange cannot resurrect tokens or enable sync', async () => {
  await disconnect()
  const url = new URL(await startAuthorization('http://localhost:5173'))
  let finish!: (r: Response) => void
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const pending = finishAuthorization(
      'http://localhost:5173?code=fictional&state=' + url.searchParams.get('state'),
    ),
    assertion = expect(pending).rejects.toThrow('revoked')
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
  await disconnect()
  finish(
    new Response(
      JSON.stringify({
        access_token: 'fictional-access',
        refresh_token: 'fictional-refresh',
        expires_in: 14400,
        token_type: 'bearer',
        account_id: 'dbid:fictional',
        scope: 'files.content.read files.content.write',
      }),
    ),
  )
  await assertion
  expect(await readAuth()).toBeUndefined()
})
it('different Me identities pause sync before any local merge or remote upload', async () => {
  await createPerson({ ...personDefaults('Fictional Me One'), is_me: true })
  const other = await local()
  other.people[0].id = crypto.randomUUID()
  other.people[0].full_name = 'Fictional Me Two'
  await remote(other)
  await enabled()
  const before = await local()
  await expect(syncNow()).rejects.toThrow('different Me identities')
  expect(await local()).toEqual(before)
  expect(server.uploads).toHaveLength(0)
})
it('photo-byte and capture-history conflicts preserve complete recoverable variants', async () => {
  await seedBackupFixture()
  await enabled()
  await syncNow()
  const other = await local(),
    photo = other.photos[0]
  const { RED_PNG } = await import('../test/backupFixtures'),
    { sha256 } = await import('../backup/codec')
  photo.data = RED_PNG
  photo.sha256 = await sha256(Uint8Array.from(atob(RED_PNG), (c) => c.charCodeAt(0)))
  photo.updated_at = '2099-01-01T00:00:00.000Z'
  other.captureBatches[0].raw_text = 'Remote history revision'
  other.captureBatches[0].updated_at = photo.updated_at
  await remote(other)
  await db.photos.put({
    ...(await db.photos.get(photo.id))!,
    deleted: true,
    updated_at: '2098-01-01T00:00:00.000Z',
  })
  await db.captureBatches.update(other.captureBatches[0].id, {
    status: 'undone',
    updated_at: '2098-01-01T00:00:00.000Z',
  })
  await syncNow()
  const copies = await conflicts()
  expect(
    copies.some(
      (c) => c.value.table === 'photos' && c.value.loser.deleted === true && !!c.value.loser.data,
    ),
  ).toBe(true)
  expect(
    copies.some((c) => c.value.table === 'captureBatches' && c.value.loser.status === 'undone'),
  ).toBe(true)
})
it('sync status observes state-only changes after photo hashing without a record edit or page reload', async () => {
  await seedBackupFixture()
  const auth = (await readAuth())!
  let latest: Awaited<ReturnType<typeof status>> | undefined
  const subscription = liveQuery(status).subscribe((value) => {
    latest = value
  })
  try {
    await vi.waitFor(() => expect(latest?.auth).toBeDefined())
    await putSetting(stateKey(auth), {
      baseline: {},
      pending: true,
      error: 'Offline state-only change',
    })
    await vi.waitFor(() => expect(latest?.state?.error).toBe('Offline state-only change'))
  } finally {
    subscription.unsubscribe()
  }
})
it('an expired/mismatched PKCE state and insufficient granted scopes never connect or send directory data', async () => {
  await disconnect()
  const url = new URL(await startAuthorization('http://localhost:5173'))
  await expect(
    finishAuthorization('http://localhost:5173?code=fictional&state=wrong'),
  ).rejects.toThrow('state')
  expect(fetch).not.toHaveBeenCalled()
  const pending = (await db.deviceSettings.get('sync:oauth'))!.value as any
  await putSetting('sync:oauth', { ...pending, expires: 0 })
  await expect(
    finishAuthorization(
      'http://localhost:5173?code=fictional&state=' + url.searchParams.get('state'),
    ),
  ).rejects.toThrow('state')
  expect(fetch).not.toHaveBeenCalled()
  const fresh = new URL(await startAuthorization('http://localhost:5173'))
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        access_token: 'fictional-access',
        refresh_token: 'fictional-refresh',
        expires_in: 14400,
        token_type: 'bearer',
        account_id: 'dbid:fictional',
        scope: 'files.content.read',
      }),
    ),
  )
  await expect(
    finishAuthorization(
      'http://localhost:5173?code=fictional&state=' + fresh.searchParams.get('state'),
    ),
  ).rejects.toThrow('permissions')
  expect(await readAuth()).toBeUndefined()
})
it('disconnect during refresh never recreates the old account or credentials', async () => {
  await createPerson(personDefaults('Fictional Refresh Cancel'))
  await enabled()
  const auth = (await readAuth())!
  await putSetting(AUTH, { ...auth, expires: 0 })
  let complete!: (response: Response) => void
  vi.mocked(fetch).mockImplementation((url, init) =>
    String(url).endsWith('/oauth2/token')
      ? new Promise((resolve) => {
          complete = resolve
        })
      : server.fetch(url, init),
  )
  const pending = syncNow(),
    assertion = expect(pending).rejects.toThrow()
  await vi.waitFor(() => expect(complete).toBeDefined())
  await disconnect()
  complete(
    new Response(
      JSON.stringify({
        access_token: 'fictional-old-access',
        expires_in: 14400,
        token_type: 'bearer',
      }),
    ),
  )
  await assertion
  expect(await readAuth()).toBeUndefined()
  expect(await db.people.count()).toBe(1)
})
it('free storage exhaustion is actionable, keeps the old state, and never offers a paid route', async () => {
  await createPerson(personDefaults('Fictional Quota'))
  const auth = await enabled(),
    original = server.fetch
  vi.mocked(fetch).mockImplementation((url, init) =>
    String(url).endsWith('/files/upload')
      ? Promise.resolve(
          new Response(
            JSON.stringify({ error: { '.tag': 'path', reason: { '.tag': 'insufficient_space' } } }),
            { status: 409 },
          ),
        )
      : original(url, init),
  )
  await expect(syncNow()).rejects.toThrow('do not upgrade')
  expect((await readState(auth)).lastSuccess).toBeUndefined()
  expect(await db.people.count()).toBe(1)
})
it('coalesces same-page requests and respects another tab holding the exclusive sync lock', async () => {
  await createPerson(personDefaults('Fictional Lock'))
  await enabled()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: async (_name: string, _opts: unknown, callback: Function) => callback(null) },
  })
  await Promise.all([syncNow(), syncNow()])
  expect(fetch).not.toHaveBeenCalled()
  expect(await db.people.count()).toBe(1)
})
