// Fictional golden examples and transactional failure injection protect existing directory records.
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { loadSampleData } from '../db/operations'
import { createPerson, personDefaults } from '../db/typed'
import { DATA_TABLES } from '../backup/schema'
import { canonical } from '../backup/codec'
import { parseCapture, captureSchema } from './schema'
import { buildPrompt } from './prompt'
import { resolveCapture, type Review } from './resolver'
import { saveCapture } from './save'
import { undoCapture } from './undo'
import { readSurnameSetting, saveSurnameSetting } from './settings'
import golden from '../test/captureGolden.json'
export const passage =
  "Sanket Bobhate is my friend from school, we also studied in college together. His wife's name is Tarika Gupta and their daughter's name is Kiara."
const draft = () => captureSchema.parse(structuredClone(golden))
beforeEach(async () => {
  await Promise.all([
    ...DATA_TABLES.map((table) => db.table(table).clear()),
    db.deviceSettings.clear(),
  ])
  await loadSampleData()
})
afterEach(() => vi.restoreAllMocks())
async function all() {
  return Object.fromEntries(
    await Promise.all(
      [...DATA_TABLES, 'deviceSettings'].map(async (table) => [
        table,
        await db.table(table).toArray(),
      ]),
    ),
  )
}
async function review() {
  return resolveCapture(draft(), passage)
}
async function choose(row: Review, name: string, id: string) {
  row.people.find((p) => p.value.full_name === name)!.selected = id
  return row
}
it('golden 1 resolves school and college from Me, preserves Tarika and Kiara names, and writes nothing during review', async () => {
  const before = canonical(await all()),
    r = await review()
  expect(r.people.map((p) => p.value.full_name)).toEqual([
    'Sanket Bobhate',
    'Tarika Gupta',
    'Kiara',
  ])
  expect(r.contexts.map((c) => c.selected)).toEqual([
    'sample-context-agnel-school',
    'sample-context-icles-college',
  ])
  expect(r.contexts.every((c) => c.guessed)).toBe(true)
  expect(r.people.every((p) => !p.suggestion)).toBe(true)
  expect(canonical(await all())).toBe(before)
})
it('golden 1 saves all people, two memberships and four directional relationships in one batch; safe Undo restores all active data', async () => {
  const before = await all(),
    r = await review(),
    id = await saveCapture(r),
    batch = (await db.captureBatches.get(id))!
  expect(batch.created_ids.people).toHaveLength(3)
  expect(batch.created_ids.memberships).toHaveLength(2)
  expect(batch.created_ids.relationships).toHaveLength(4)
  expect(batch.raw_text).toBe(passage)
  expect((await db.relationships.toArray()).filter((r) => r.source_batch_id === id)).toHaveLength(4)
  expect((await undoCapture(id)).undone).toBe(true)
  for (const table of DATA_TABLES.filter((t) => t !== 'captureBatches')) {
    const active = (await db.table(table).toArray()).filter((r) => !r.deleted)
    expect(active).toEqual(before[table].filter((r: { deleted: boolean }) => !r.deleted))
  }
  expect((await db.captureBatches.get(id))?.status).toBe('undone')
  for (const table of Object.keys(batch.created_ids))
    for (const key of batch.created_ids[table])
      expect((await db.table(table).get(key)).deleted).toBe(true)
  await expect(undoCapture(id)).rejects.toThrow('already undone')
})
it('golden 2 offers existing Rahul without choosing an identity; uses Me society when exactly one exists', async () => {
  const d = captureSchema.parse({
    schema: 1,
    people: [{ ref: 'p1', full_name: 'Rahul Patil' }],
    contexts: [{ ref: 'c1', name: null, kind: 'society', same_as_me: true }],
    memberships: [{ person: 'p1', context: 'c1' }],
  })
  const me = (await db.people.get('sample-person-me'))!
  await db.memberships.put({
    id: crypto.randomUUID(),
    person_id: me.id,
    context_id: 'sample-context-sagar-heights',
    created_at: me.created_at,
    updated_at: me.updated_at,
    deleted: false,
  })
  const r = await resolveCapture(
    d,
    'Met Rahul Patil at the society meeting, he works at Lionbridge.',
  )
  expect(r.people[0].candidates.map((p) => p.full_name)).toContain('Rahul Patil')
  expect(r.people[0].selected).toBe('')
  await expect(saveCapture(r)).rejects.toThrow('Choose use existing')
  r.people[0].selected = r.people[0].candidates[0].id
  const before = await db.people.count()
  await saveCapture(r)
  expect(await db.people.count()).toBe(before)
})
it('golden 3 preserves missing first name uncertainty and directional child link', async () => {
  const d = captureSchema.parse({
    schema: 1,
    people: [
      {
        ref: 'p1',
        full_name: 'Mrs. Deshpande',
        gender: 'female',
        gender_source: 'stated',
        category: 'Neighbour',
      },
      { ref: 'p2', full_name: 'Aditya' },
    ],
    relationships: [{ a: 'p2', b: 'p1', type: 'child' }],
    uncertain: ['Mrs. Deshpande first name is unknown'],
  })
  const r = await resolveCapture(d, 'My neighbour Mrs. Deshpande has a son Aditya.')
  expect(r.uncertain[0]).toContain('unknown')
  await saveCapture(r)
  const link = (await db.relationships.toArray()).find((r) => r.source_batch_id)!
  expect(link.type).toBe('child')
  expect((await db.people.get(link.person_id))?.full_name).toBe('Aditya')
})
it('golden 4 requires a choice for several Me schools; golden 5 parses fenced prose but never repairs broken facts', async () => {
  const me = (await db.people.filter((p) => p.is_me).first())!
  const c = {
    id: crypto.randomUUID(),
    name: 'Fictional Second School',
    kind: 'school',
    created_at: me.created_at,
    updated_at: me.updated_at,
    deleted: false,
  }
  await db.contexts.put(c as never)
  await db.memberships.put({
    id: crypto.randomUUID(),
    person_id: me.id,
    context_id: c.id,
    created_at: me.created_at,
    updated_at: me.updated_at,
    deleted: false,
  })
  const r = await review()
  expect(r.contexts[0].candidates).toHaveLength(2)
  expect(r.contexts[0].selected).toBe('')
  await expect(saveCapture(r)).rejects.toThrow('Choose or name')
  expect(
    parseCapture('Here is JSON:\n```json\n' + JSON.stringify(golden) + '\n```\nDone.').people,
  ).toHaveLength(3)
  expect(() => parseCapture('{"schema":1,"people":[')).toThrow('Nothing was saved')
})
it.each(['not JSON', 'null', '[]', '{}', '{"schema":2,"people":[]}'])(
  'refuses malformed/incompatible answer %s',
  (answer) => expect(() => parseCapture(answer)).toThrow(),
)
it('bounds answer size, nesting, passage length, references, names and relationship types', () => {
  expect(() => parseCapture(' '.repeat(262145))).toThrow('too large')
  expect(() => parseCapture('{"a":' + '['.repeat(13))).toThrow('deeply')
  for (const change of [
    (d: typeof golden) => {
      d.people[0].full_name = ' '
    },
    (d: typeof golden) => {
      d.people[1].ref = 'p1'
    },
    (d: typeof golden) => {
      d.relationships[0].b = 'absent'
    },
    (d: typeof golden) => {
      d.relationships[0].type = 'invented'
    },
  ]) {
    const d = structuredClone(golden)
    change(d)
    expect(() => parseCapture(JSON.stringify(d))).toThrow()
  }
  expect(() => buildPrompt('x'.repeat(5001))).toThrow()
  expect(() => buildPrompt(' ')).toThrow()
})
it('ignores unknown fields and braces inside strings without accepting injected settings', () => {
  const d = {
    ...golden,
    deviceSettings: [{ key: 'secret', value: 'fictional' }],
    uncertain: ['Quoted } { brackets [ ] and \\"'],
  }
  const p = parseCapture(JSON.stringify(d))
  expect(p).not.toHaveProperty('deviceSettings')
  expect(p.uncertain).toEqual(d.uncertain)
})
it('prompt has only passage/instructions, allowed relationships and default-off surname policy; device preference defaults off', async () => {
  const prompt = buildPrompt('Fictional text')
  expect(prompt).toContain('OFF.')
  expect(prompt).not.toContain('Fr. Agnel')
  expect(prompt).not.toContain('Rahul Patil')
  expect(prompt).toContain('ME')
  expect(prompt).toContain('same_as_me')
  expect(await readSurnameSetting()).toBe(false)
  await saveSurnameSetting(true)
  expect(await readSurnameSetting()).toBe(true)
  expect(buildPrompt('Fictional text', true)).toContain('ON.')
})
it('surname ON proposes changes without applying them; even an AI-ignored surname needs separate name/maiden approval', async () => {
  const r = await resolveCapture(draft(), passage, true)
  expect(r.people[1].suggestion).toEqual({ name: 'Tarika Bobhate', maiden: 'Gupta' })
  expect(r.people[1].value.full_name).toBe('Tarika Gupta')
  expect(r.people[2].suggestion).toBeUndefined()
  const d = draft()
  d.people[1].full_name = 'Tarika Bobhate'
  d.people[1].maiden_name = 'Gupta'
  const bad = await resolveCapture(d, passage, false)
  await expect(saveCapture(bad)).rejects.toThrow('Confirm the assumed name')
  bad.people[1].approveName = true
  const id = await saveCapture(bad)
  const person = await db.people.get((await db.captureBatches.get(id))!.created_ids.people[1])
  expect(person?.maiden_name).toBeUndefined()
})
it('missing Me context requires a name and can optionally add that context to Me', async () => {
  await db.memberships.filter((m) => m.person_id === 'sample-person-me').modify({ deleted: true })
  const r = await review()
  expect(r.contexts.every((c) => c.selected === '')).toBe(true)
  for (const c of r.contexts) {
    c.selected = 'new'
    c.value.name = 'Fictional ' + c.value.kind
    c.addToMe = true
  }
  const id = await saveCapture(r)
  expect((await db.captureBatches.get(id))!.created_ids.contexts).toHaveLength(2)
  expect(
    (await db.memberships.toArray()).filter(
      (m) => !m.deleted && m.person_id === 'sample-person-me',
    ),
  ).toHaveLength(2)
})
it('aliases, normalized names, Devanagari, typos and deleted candidates are handled without automatic identity merging', async () => {
  await createPerson({
    ...personDefaults('मीरा जोशी'),
    nicknames: ['Mira'],
    maiden_name: 'Fictional Maiden',
  })
  await createPerson({ ...personDefaults('Deleted Name'), deleted: true })
  for (const name of ['  मीरा   जोशी  ', 'Mira', 'Fictional Maiden', 'मीरा जोशि']) {
    const r = await resolveCapture(
      captureSchema.parse({ schema: 1, people: [{ ref: 'p1', full_name: name }] }),
      name,
    )
    expect(r.people[0].selected).toBe('')
    expect(r.people[0].candidates.length).toBeGreaterThanOrEqual(1)
  }
  const r = await resolveCapture(
    captureSchema.parse({ schema: 1, people: [{ ref: 'p1', full_name: 'Deleted Name' }] }),
    'Deleted Name',
  )
  expect(r.people[0].candidates).toHaveLength(0)
})
it('skipped people omit dependent links and unused contexts; reverse duplicate relationships store one row', async () => {
  const r = await review()
  r.people[0].include = false
  r.people[2].include = false
  const id = await saveCapture(r),
    batch = (await db.captureBatches.get(id))!
  expect(batch.created_ids.people).toHaveLength(1)
  expect(batch.created_ids.memberships).toBeUndefined()
  expect(batch.created_ids.relationships).toBeUndefined()
  const d = draft()
  d.relationships.push({ a: 'p2', b: 'p1', type: 'spouse' })
  const r2 = await resolveCapture(d, passage)
  r2.people[1].selected = 'new'
  await saveCapture(r2)
  expect(
    (await db.relationships.toArray()).filter((r) => r.type === 'spouse' && r.source_batch_id),
  ).toHaveLength(1)
})
it('preserves filled fields, fills only empties, previews/appends notes with opt-out, and never overwrites arrays', async () => {
  const existing = await createPerson({
    ...personDefaults('Sanket Bobhate'),
    phones: ['111'],
    notes: 'Earlier fictional note',
    gender: 'unknown',
  })
  const r = await review()
  await choose(r, 'Sanket Bobhate', existing.id)
  r.people[0].value.phones = ['222']
  r.people[0].value.notes = 'Appended fictional note'
  const id = await saveCapture(r),
    saved = (await db.people.get(existing.id))!
  expect(saved.phones).toEqual(['111'])
  expect(saved.gender).toBe('male')
  expect(saved.notes).toBe('Earlier fictional note\nAppended fictional note')
  await db.people.update(existing.id, {
    city: 'Later unrelated city',
    last_viewed_at: new Date().toISOString(),
  })
  expect((await undoCapture(id)).undone).toBe(true)
  const undone = (await db.people.get(existing.id))!
  expect(undone.notes).toBe(existing.notes)
  expect(undone.gender).toBe('unknown')
  expect(undone.city).toBe('Later unrelated city')
  expect(undone.last_viewed_at).toBeDefined()
  const next = await review()
  await choose(next, 'Sanket Bobhate', existing.id)
  next.people[0].appendNotes = false
  next.people[0].value.notes = 'Must not append'
  await saveCapture(next)
  expect((await db.people.get(existing.id))!.notes).toBe(existing.notes)
})
it('refuses stale review, while local-only viewing does not invalidate review', async () => {
  let r = await review()
  await db.people.update('sample-person-meera', { notes: 'Changed after review' })
  const before = canonical(await all())
  await expect(saveCapture(r)).rejects.toThrow('changed after review')
  expect(canonical(await all())).toBe(before)
  r = await review()
  await db.people.update('sample-person-meera', { last_viewed_at: new Date().toISOString() })
  await saveCapture(r)
})
it('rolls back failed batch saves including audit history, retains the review and permits one retry only', async () => {
  const r = await review(),
    before = canonical(await all()),
    fail = () => {
      throw new DOMException('Fictional quota full', 'QuotaExceededError')
    }
  db.captureBatches.hook('creating', fail)
  try {
    await expect(saveCapture(r)).rejects.toThrow('Fictional quota')
  } finally {
    db.captureBatches.hook('creating').unsubscribe(fail)
  }
  expect(canonical(await all())).toBe(before)
  await saveCapture(r)
  await expect(saveCapture(r)).rejects.toThrow('already saving or saved')
})
it('prevents repeated simultaneous saves and keeps device settings/photo records/tombstones untouched', async () => {
  const r = await review(),
    before = await all()
  const outcomes = await Promise.allSettled([saveCapture(r), saveCapture(r)])
  expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  for (const table of ['deviceSettings', 'photos'])
    expect(await db.table(table).toArray()).toEqual(before[table])
  for (const row of before.people) expect(await db.people.get(row.id)).toEqual(row)
})
it.each(['edit', 'membership', 'relationship', 'photo'])(
  'Undo blocks %s of a created person and leaves all current directory records unchanged',
  async (kind) => {
    const id = await saveCapture(await review()),
      batch = (await db.captureBatches.get(id))!,
      personId = batch.created_ids.people[0],
      person = (await db.people.get(personId))!
    const base = {
      id: crypto.randomUUID(),
      created_at: person.created_at,
      updated_at: person.updated_at,
      deleted: false,
    }
    if (kind === 'edit') await db.people.update(personId, { notes: 'Later fictional edit' })
    if (kind === 'membership')
      await db.memberships.put({
        ...base,
        person_id: personId,
        context_id: 'sample-context-agnel-school',
      })
    if (kind === 'relationship')
      await db.relationships.put({
        ...base,
        person_id: personId,
        relative_id: 'sample-person-me',
        type: 'colleague',
      })
    if (kind === 'photo')
      await db.photos.put({
        ...base,
        person_id: personId,
        blob: new Blob(['fictional test only']),
        mime: 'image/jpeg',
        width: 1,
        height: 1,
        bytes: 19,
      })
    const before = await all()
    const result = await undoCapture(id)
    expect(result.undone).toBe(false)
    expect(result.conflicts.length).toBeGreaterThan(0)
    for (const table of DATA_TABLES.filter((t) => t !== 'captureBatches'))
      expect(await db.table(table).toArray()).toEqual(before[table])
    expect((await db.captureBatches.get(id))!.status).toBe('undo_conflict')
  },
)
it('Undo refuses later edits to filled fields, preserves unrelated changes, and is atomic on a write failure', async () => {
  const existing = await createPerson(personDefaults('Sanket Bobhate')),
    r = await review()
  await choose(r, 'Sanket Bobhate', existing.id)
  const id = await saveCapture(r)
  await db.people.update(existing.id, { category: 'Later edit' })
  expect((await undoCapture(id)).undone).toBe(false)
  expect((await db.people.get(existing.id))!.gender).toBe('male')
  await db.people.update(existing.id, { category: 'Friend' })
  const before = await all(),
    fail = () => {
      throw new Error('Fictional interrupted undo')
    }
  db.relationships.hook('updating', fail)
  try {
    await expect(undoCapture(id)).rejects.toThrow('Fictional interrupted undo')
  } finally {
    db.relationships.hook('updating').unsubscribe(fail)
  }
  expect(await all()).toEqual(before)
  expect((await undoCapture(id)).undone).toBe(true)
})
it('keeps capture history compatible with full JSON backup/restore and Undo after restoration', async () => {
  const { validateBackup } = await import('../backup/schema')
  const existing = await createPerson(personDefaults('Sanket Bobhate')),
    r = await review()
  await choose(r, 'Sanket Bobhate', existing.id)
  const id = await saveCapture(r),
    { deviceSettings: _settings, ...tables } = await all()
  const validated = validateBackup(
    JSON.parse(
      JSON.stringify({
        format: 'people-memory',
        schema: 1,
        exported_at: new Date().toISOString(),
        tables,
      }),
    ),
  )
  await db.transaction(
    'rw',
    DATA_TABLES.map((t) => db.table(t)),
    async () => {
      for (const table of DATA_TABLES) {
        await db.table(table).clear()
        if (validated.tables[table].length) await db.table(table).bulkPut(validated.tables[table])
      }
    },
  )
  expect((await undoCapture(id)).undone).toBe(true)
  expect((await db.people.get(existing.id))!.gender).toBe('unknown')
})
it('rejects invalid review edits, duplicate existing identities and self-links without partial writes', async () => {
  let r = await review()
  r.people[0].value.full_name = ' '
  const before = await all()
  await expect(saveCapture(r)).rejects.toThrow()
  expect(await all()).toEqual(before)
  r = await review()
  r.people[0].selected = 'sample-person-rahul'
  r.people[1].selected = 'sample-person-rahul'
  await expect(saveCapture(r)).rejects.toThrow('same existing identity')
  expect(await all()).toEqual(before)
  r = await review()
  r.people[0].selected = 'sample-person-me'
  await expect(saveCapture(r)).rejects.toThrow('themselves')
  expect(await all()).toEqual(before)
})
it('reuses existing and within-batch memberships/contexts without duplicate rows', async () => {
  const r = await review()
  r.contexts.push({
    ...structuredClone(r.contexts[0]),
    value: { ref: 'c3', name: 'Fictional New Context', kind: 'group', same_as_me: false },
    selected: 'new',
  })
  r.contexts.push({
    ...structuredClone(r.contexts.at(-1)!),
    value: { ref: 'c4', name: 'Fictional New Context', kind: 'group', same_as_me: false },
  })
  r.memberships.push(
    { person: 'p1', context: 'c3', role: 'Member', period: null, include: true },
    { person: 'p1', context: 'c4', role: 'Member', period: null, include: true },
  )
  const id = await saveCapture(r),
    batch = (await db.captureBatches.get(id))!
  expect(batch.created_ids.contexts).toHaveLength(1)
  expect(batch.created_ids.memberships).toHaveLength(3)
})
it('protects a newly created context used by a later membership and ignores local view-only changes on created people', async () => {
  const r = await review()
  r.contexts[0].selected = 'new'
  r.contexts[0].value.name = 'Fictional New School'
  const id = await saveCapture(r),
    batch = (await db.captureBatches.get(id))!,
    contextId = batch.created_ids.contexts[0]
  const now = new Date().toISOString()
  await db.memberships.put({
    id: crypto.randomUUID(),
    person_id: 'sample-person-me',
    context_id: contextId,
    created_at: now,
    updated_at: now,
    deleted: false,
  })
  expect((await undoCapture(id)).undone).toBe(false)
  const fresh = await review()
  fresh.contexts[0].selected = 'sample-context-agnel-school'
  for (const p of fresh.people) {
    p.selected = 'new'
  }
  const id2 = await saveCapture(fresh),
    batch2 = (await db.captureBatches.get(id2))!
  await db.people.update(batch2.created_ids.people[0], { last_viewed_at: now })
  expect((await undoCapture(id2)).undone).toBe(true)
})
it('never infers a husband identity for surname suggestions from unknown gender', async () => {
  const d = draft()
  d.people[0].gender = 'unknown'
  expect((await resolveCapture(d, passage, true)).people[1].suggestion).toBeUndefined()
})
