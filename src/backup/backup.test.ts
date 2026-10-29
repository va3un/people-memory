// Real fake-indexeddb transactions exercise every portable table; browser checks use actual image decoding and files.
import { Blob as NodeBlob } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { DATA_TABLES, MAX_FILE_BYTES, MAX_RECORDS } from './schema'
import { canonical, fingerprint, parseBackup, readBlob } from './codec'
import { portableDataset, readSnapshot } from './snapshot'
import {
  prepareBackup,
  verifyBackupDownload,
  readBackupStatus,
  backupOverdue,
  downloadFile,
} from './downloads'
import { previewImport, prepareSafetyBackup, applyImport } from './import'
import { createPerson, personDefaults } from '../db/typed'
import { seedBackupFixture, pngBlob, RED_PNG } from '../test/backupFixtures'

beforeEach(async () => {
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal(
    'Image',
    class {
      src = ''
      naturalWidth = 1
      naturalHeight = 1
      async decode() {
        /* Pixel decoding is verified independently in the real browser round trip. */
      }
    },
  )
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fictional-photo')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  await Promise.all([
    ...DATA_TABLES.map((table) => db.table(table).clear()),
    db.deviceSettings.clear(),
  ])
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
const wire = async () => portableDataset(await readSnapshot())
async function text(blob: Blob) {
  return new TextDecoder().decode(await readBlob(blob))
}
const file = (value: unknown) => new Blob([JSON.stringify(value)], { type: 'application/json' })
async function generated() {
  await seedBackupFixture()
  const backup = await prepareBackup()
  return { backup, value: JSON.parse(await text(backup.blob)) }
}
async function authorize(preview: Awaited<ReturnType<typeof previewImport>>) {
  const safety = await prepareSafetyBackup(preview)
  await verifyBackupDownload(safety, safety.blob)
  return safety
}

it('exports every table and photo, including tombstones and Unicode, but no device setting or credential', async () => {
  const { backup, value } = await generated()
  expect(value.format).toBe('people-memory')
  expect(value.schema).toBe(1)
  expect(Object.keys(value.tables).sort()).toEqual([...DATA_TABLES].sort())
  expect(value.tables.photos).toHaveLength(2)
  expect(value.tables.photos.some((photo: { deleted: boolean }) => photo.deleted)).toBe(true)
  expect(
    value.tables.people.some((person: { full_name: string }) => person.full_name === 'मीरा जोशी'),
  ).toBe(true)
  expect(await text(backup.blob)).not.toContain('fictional-private-provider-key')
  expect(await text(backup.blob)).not.toContain('fictional-private-dropbox-token')
  expect(await text(backup.blob)).not.toContain('deviceSettings')
})
it('performs full JSON backup, test-only wipe, restore and canonical data equality including all photo bytes and capture history', async () => {
  const { backup } = await generated()
  const original = await wire(),
    settings = await db.deviceSettings.toArray()
  await db.transaction(
    'rw',
    DATA_TABLES.map((table) => db.table(table)),
    async () => {
      for (const table of DATA_TABLES) await db.table(table).clear()
    },
  )
  const preview = await previewImport(backup.blob)
  await applyImport(preview, { mode: 'merge' })
  expect(canonical(await wire())).toBe(canonical(original))
  expect(await db.deviceSettings.toArray()).toEqual(settings)
})
it('default merge skips identical IDs, preserves all existing versions and tombstones, and adds only new IDs', async () => {
  const { backup } = await generated()
  await db.people.update('sample-person-meera', {
    notes: 'Later fictional local note',
    deleted: true,
  })
  const preview = await previewImport(backup.blob)
  expect(preview.counts.find((row) => row.table === 'people')?.conflicts).toBe(1)
  expect(preview.conflicts.find((row) => row.id === 'sample-person-meera')?.existing).toContain(
    '(deleted)',
  )
  const before = canonical(await wire())
  await applyImport(preview, { mode: 'merge' })
  expect(canonical(await wire())).toBe(before)
  await expect(applyImport(preview, { mode: 'merge' })).rejects.toThrow(
    'Refresh the import preview',
  )
})
it('requires name-duplicate review without automatically combining uncertain identities', async () => {
  const { backup } = await generated()
  await createPerson(personDefaults('मीरा जोशी'))
  const preview = await previewImport(backup.blob)
  expect(preview.possibleDuplicates.some((person) => person.name === 'मीरा जोशी')).toBe(true)
  await expect(applyImport(preview, { mode: 'merge' })).rejects.toThrow(
    'Review the possible duplicate',
  )
  await applyImport(preview, { mode: 'merge', duplicatesReviewed: true })
  expect(await db.people.filter((person) => person.full_name === 'मीरा जोशी').count()).toBe(2)
})
it('blocks replacement without a verified current backup or exact typed confirmation', async () => {
  const { backup } = await generated()
  await createPerson(personDefaults('Fictional Current Extra'))
  const preview = await previewImport(backup.blob),
    before = canonical(await wire())
  await expect(applyImport(preview, { mode: 'replace', confirmation: 'REPLACE' })).rejects.toThrow(
    'verified safety backup',
  )
  const safety = await prepareSafetyBackup(preview)
  await expect(
    applyImport(preview, {
      mode: 'replace',
      confirmation: 'REPLACE',
      backup: safety,
    }),
  ).rejects.toThrow('verified safety backup')
  await expect(verifyBackupDownload(safety, backup.blob)).rejects.toThrow('exact safety backup')
  await verifyBackupDownload(safety, safety.blob)
  for (const confirmation of ['', 'replace', ' REPLACE '])
    await expect(
      applyImport(preview, { mode: 'replace', confirmation, backup: safety }),
    ).rejects.toThrow('Type REPLACE')
  expect(canonical(await wire())).toBe(before)
  await applyImport(preview, {
    mode: 'replace',
    confirmation: 'REPLACE',
    backup: safety,
  })
  expect(
    await db.people.filter((person) => person.full_name === 'Fictional Current Extra').count(),
  ).toBe(0)
  expect((await db.deviceSettings.get('api_key'))?.value).toBe('fictional-private-provider-key')
})
it('rejects forged previews and backup tokens', async () => {
  const { backup } = await generated(),
    preview = await previewImport(backup.blob)
  await expect(applyImport({ ...preview }, { mode: 'merge' })).rejects.toThrow('Refresh')
  await expect(
    applyImport(preview, {
      mode: 'replace',
      confirmation: 'REPLACE',
      backup: { blob: backup.blob, filename: 'forged.json' },
    }),
  ).rejects.toThrow('verified safety backup')
})
it('invalidates stale previews and backups after concurrent edits without deleting anything', async () => {
  const { backup } = await generated(),
    preview = await previewImport(backup.blob),
    safety = await authorize(preview)
  await db.people.update('sample-person-anil', {
    notes: 'Concurrent fictional edit',
  })
  const before = canonical(await wire())
  await expect(
    applyImport(preview, {
      mode: 'replace',
      confirmation: 'REPLACE',
      backup: safety,
    }),
  ).rejects.toThrow('Data changed after')
  expect(canonical(await wire())).toBe(before)
  await expect(prepareSafetyBackup(preview)).rejects.toThrow('current dataset')
})
it('detects even a photo-byte change with unchanged photo metadata', async () => {
  const { backup } = await generated(),
    preview = await previewImport(backup.blob),
    safety = await authorize(preview)
  const photo = (await db.photos.toArray())[0]
  const replacement = pngBlob(RED_PNG)
  expect(replacement.size).toBe(photo.bytes)
  await db.photos.put({ ...photo, blob: replacement })
  await expect(
    applyImport(preview, {
      mode: 'replace',
      confirmation: 'REPLACE',
      backup: safety,
    }),
  ).rejects.toThrow('Data changed after')
})
it('rolls back replacement after earlier table writes when a later write fails', async () => {
  const { backup } = await generated()
  await createPerson(personDefaults('Fictional Kept On Failure'))
  const preview = await previewImport(backup.blob),
    safety = await authorize(preview),
    before = canonical(await wire())
  const fail = () => {
    throw new DOMException('Fictional storage full', 'QuotaExceededError')
  }
  db.relationships.hook('creating', fail)
  try {
    await expect(
      applyImport(preview, {
        mode: 'replace',
        confirmation: 'REPLACE',
        backup: safety,
      }),
    ).rejects.toThrow('Fictional storage full')
  } finally {
    db.relationships.hook('creating').unsubscribe(fail)
  }
  expect(canonical(await wire())).toBe(before)
  await applyImport(preview, {
    mode: 'replace',
    confirmation: 'REPLACE',
    backup: safety,
  })
  expect(
    await db.people.filter((person) => person.full_name === 'Fictional Kept On Failure').count(),
  ).toBe(0)
})
it('cancels before writes and in the middle of a transaction with no partial replacement', async () => {
  const { backup } = await generated()
  await createPerson(personDefaults('Fictional Cancelled Replacement'))
  let preview = await previewImport(backup.blob),
    safety = await authorize(preview),
    before = canonical(await wire())
  const first = new AbortController()
  first.abort()
  await expect(
    applyImport(preview, {
      mode: 'replace',
      confirmation: 'REPLACE',
      backup: safety,
      signal: first.signal,
    }),
  ).rejects.toThrow('cancelled')
  expect(canonical(await wire())).toBe(before)
  preview = await previewImport(backup.blob)
  safety = await authorize(preview)
  before = canonical(await wire())
  const middle = new AbortController(),
    abort = () => {
      middle.abort()
    }
  db.memberships.hook('creating', abort)
  try {
    await expect(
      applyImport(preview, {
        mode: 'replace',
        confirmation: 'REPLACE',
        backup: safety,
        signal: middle.signal,
      }),
    ).rejects.toThrow('cancelled')
  } finally {
    db.memberships.hook('creating').unsubscribe(abort)
  }
  expect(canonical(await wire())).toBe(before)
})
it('pauses merge with two different Me profiles but allows a backed-up explicit replacement', async () => {
  const { backup } = await generated()
  await db.people.update('sample-person-me', { is_me: false })
  await createPerson({ ...personDefaults('Fictional Other Me'), is_me: true })
  const preview = await previewImport(backup.blob)
  // Existing ID wins on merge: the imported old Me does not overwrite the local false flag.
  expect(preview.mergeProblem).toBeUndefined()
  const value = JSON.parse(await text(backup.blob))
  const oldId = value.tables.people.find((person: { is_me: boolean }) => person.is_me).id
  const newId = crypto.randomUUID()
  value.tables.people.find((person: { id: string }) => person.id === oldId).id = newId
  for (const membership of value.tables.memberships)
    if (membership.person_id === oldId) membership.person_id = newId
  const conflicted = await previewImport(file(value))
  expect(conflicted.mergeProblem).toContain('more than one active Me')
  await expect(
    applyImport(conflicted, { mode: 'merge', duplicatesReviewed: true }),
  ).rejects.toThrow('more than one active Me')
})
it('updates the reminder only after verification of a saved full JSON file', async () => {
  const { backup } = await generated()
  expect(await readBackupStatus()).toBeNull()
  expect(backupOverdue(null)).toBe(true)
  await expect(verifyBackupDownload(backup, new Blob(['not the file']))).rejects.toThrow(
    'Verification failed',
  )
  expect(await readBackupStatus()).toBeNull()
  await verifyBackupDownload(backup, backup.blob)
  const status = (await readBackupStatus())!
  expect(backupOverdue(status, Date.parse(status.exported_at) + 30 * 86400000)).toBe(false)
  expect(backupOverdue(status, Date.parse(status.exported_at) + 31 * 86400000)).toBe(true)
  expect(backupOverdue(status, Date.parse(status.exported_at) - 1)).toBe(true)
})
it('does not mark a failed download as saved', async () => {
  const { backup } = await generated()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
    throw new Error('Fictional failed download')
  })
  expect(() => downloadFile(backup.blob, backup.filename)).toThrow('failed download')
  expect(await readBackupStatus()).toBeNull()
})
it.each(['not json', '{', 'null', '[]', '{}'])(
  'refuses malformed file %s with the database unchanged',
  async (input) => {
    await seedBackupFixture()
    const before = canonical(await wire())
    await expect(previewImport(new Blob([input]))).rejects.toThrow()
    expect(canonical(await wire())).toBe(before)
  },
)
it.each([
  'future',
  'unknown',
  'settings',
  'duplicate',
  'dangling',
  'twoMe',
  'badDate',
  'badBirthday',
  'badBase64',
  'checksum',
  'dimensions',
  'unsafe',
  'depth',
  'count',
])('refuses %s content without changing any record or setting', async (kind) => {
  const { value } = await generated(),
    before = canonical(await wire()),
    settings = await db.deviceSettings.toArray()
  if (kind === 'future') value.schema = 999
  if (kind === 'unknown') value.tables.people[0].future_field = 'must not be discarded'
  if (kind === 'settings') value.tables.deviceSettings = [{ key: 'api_key', value: 'attacker' }]
  if (kind === 'duplicate') value.tables.people.push(value.tables.people[0])
  if (kind === 'dangling') value.tables.memberships[0].person_id = 'missing'
  if (kind === 'twoMe') value.tables.people.find((p: { is_me: boolean }) => !p.is_me).is_me = true
  if (kind === 'badDate') value.tables.people[0].updated_at = 'yesterday'
  if (kind === 'badBirthday') value.tables.people[0].birthday = { month: 2, day: 30 }
  if (kind === 'badBase64') value.tables.photos[0].data = '!!!!'
  if (kind === 'checksum') value.tables.photos[0].sha256 = '0'.repeat(64)
  if (kind === 'dimensions') value.tables.photos[0].width = 2
  if (kind === 'unsafe') Object.defineProperty(value, '__proto__', { value: {}, enumerable: true })
  if (kind === 'depth') {
    value.nested = {}
    let node = value.nested
    for (let i = 0; i < 20; i++) {
      node.child = {}
      node = node.child
    }
  }
  if (kind === 'count')
    value.tables.people = Array.from({ length: MAX_RECORDS + 1 }, () => value.tables.people[0])
  await expect(previewImport(file(value))).rejects.toThrow()
  expect(canonical(await wire())).toBe(before)
  expect(await db.deviceSettings.toArray()).toEqual(settings)
})
it('refuses oversized and invalid UTF-8 files before touching data', async () => {
  await seedBackupFixture()
  const before = canonical(await wire())
  const oversized = new Blob(['fictional'])
  Object.defineProperty(oversized, 'size', { value: MAX_FILE_BYTES + 1 })
  await expect(previewImport(oversized)).rejects.toThrow('64 MB')
  await expect(previewImport(new Blob([new Uint8Array([0xff])]))).rejects.toThrow('UTF-8')
  expect(canonical(await wire())).toBe(before)
})
it('refuses undecodable photos and restores object URLs after errors', async () => {
  const { backup } = await generated()
  vi.spyOn(Image.prototype, 'decode').mockRejectedValue(new Error('Fictional decoder failure'))
  await expect(parseBackup(backup.blob)).rejects.toThrow('cannot be decoded')
  expect(URL.revokeObjectURL).toHaveBeenCalled()
})
it('rejects credential-bearing capture snapshots instead of silently exporting them', async () => {
  const { value } = await generated()
  value.tables.captureBatches[0].before_snapshots[0] = {
    table: 'deviceSettings',
    id: 'api_key',
    values: { value: 'fictional-private-provider-key' },
  }
  await expect(previewImport(file(value))).rejects.toThrow('Invalid backup fields')
})
it('canonical fingerprints ignore object-key and table-row order but include photo bytes and tombstones', async () => {
  await seedBackupFixture()
  const data = await wire()
  const reordered = { ...data, people: [...data.people].reverse() }
  expect(await fingerprint(data)).toBe(await fingerprint(reordered))
  reordered.people[0] = {
    ...reordered.people[0],
    deleted: !reordered.people[0].deleted,
  }
  expect(await fingerprint(data)).not.toBe(await fingerprint(reordered))
})
it('merges new linked IDs while preserving every pre-existing version and setting', async () => {
  const { value } = await generated()
  const person = structuredClone(
    value.tables.people.find(
      (row: { is_me: boolean; deleted: boolean }) => !row.is_me && !row.deleted,
    ),
  )
  person.id = crypto.randomUUID()
  person.full_name = 'Fictional New Import'
  person.display_name = 'Fictional New'
  const context = { ...value.tables.contexts[0], id: crypto.randomUUID(), deleted: false }
  value.tables.people.push(person)
  value.tables.contexts.push(context)
  value.tables.memberships.push({
    ...value.tables.memberships[0],
    id: crypto.randomUUID(),
    person_id: person.id,
    context_id: context.id,
    deleted: false,
  })
  value.tables.relationships.push({
    ...value.tables.relationships[0],
    id: crypto.randomUUID(),
    person_id: person.id,
    relative_id: value.tables.people.find((row: { is_me: boolean }) => row.is_me).id,
    deleted: false,
  })
  value.tables.photos.push({
    ...value.tables.photos[0],
    id: crypto.randomUUID(),
    person_id: person.id,
    deleted: false,
  })
  const before = await wire(),
    settings = await db.deviceSettings.toArray()
  const preview = await previewImport(file(value))
  expect(preview.counts.find((row) => row.table === 'people')?.added).toBe(1)
  await applyImport(preview, { mode: 'merge' })
  const after = await wire()
  for (const table of DATA_TABLES)
    for (const row of before[table]) expect(after[table]).toContainEqual(row)
  expect(after.people).toContainEqual(person)
  expect(
    after.memberships.some((row) => row.person_id === person.id && row.context_id === context.id),
  ).toBe(true)
  expect(after.photos.some((row) => row.person_id === person.id)).toBe(true)
  expect(await db.deviceSettings.toArray()).toEqual(settings)
})
it('refuses aggregate photo overflow and cancellation during a file read without writes', async () => {
  const { value } = await generated(),
    before = canonical(await wire())
  const photo = value.tables.photos[0]
  value.tables.photos = Array.from({ length: 9 }, () => ({
    ...photo,
    id: crypto.randomUUID(),
    bytes: 4 * 1024 * 1024,
  }))
  await expect(previewImport(file(value))).rejects.toThrow('32 MB')
  const controller = new AbortController()
  const delayed = new Blob([JSON.stringify({ ...value, tables: { ...value.tables, photos: [] } })])
  const bytes = await delayed.arrayBuffer()
  vi.spyOn(delayed, 'arrayBuffer').mockImplementation(async () => {
    controller.abort()
    return bytes
  })
  await expect(previewImport(delayed, controller.signal)).rejects.toThrow('cancelled')
  expect(canonical(await wire())).toBe(before)
})
