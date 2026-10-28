// Recent lists and context shortcuts use active records without changing stored ordering or values.
import { expect, it } from 'vitest'
import { buildSampleData, SAMPLE_IDS } from '../db/sampleData'
import { popularContexts, recentPeople } from './recents'

it('sorts local views separately from creation time, hides Me/deleted records and preserves the input', () => {
  const data = buildSampleData()
  data.people.find((p) => p.id === SAMPLE_IDS.meera)!.last_viewed_at = '2026-01-02T00:00:00.000Z'
  data.people.find((p) => p.id === SAMPLE_IDS.anil)!.last_viewed_at = '2026-01-03T00:00:00.000Z'
  data.people.find((p) => p.id === SAMPLE_IDS.rahul)!.created_at = '2026-01-04T00:00:00.000Z'
  data.people.find((p) => p.id === SAMPLE_IDS.sunil)!.deleted = true
  const before = JSON.stringify(data)
  const recent = recentPeople(data)
  expect(recent.viewed.map((p) => p.id)).toEqual([SAMPLE_IDS.anil, SAMPLE_IDS.meera])
  expect(recent.added[0].id).toBe(SAMPLE_IDS.rahul)
  expect(recent.added.map((p) => p.id)).not.toContain(SAMPLE_IDS.me)
  expect(recent.added.map((p) => p.id)).not.toContain(SAMPLE_IDS.sunil)
  expect(JSON.stringify(data)).toBe(before)
})
it('counts unique ordinary members and excludes deleted contexts, memberships and endpoints', () => {
  const data = buildSampleData()
  const sameMember = data.memberships.find((m) => m.person_id === SAMPLE_IDS.anil)!
  data.memberships.push({ ...sameMember, id: 'fictional-second-role', role: 'Teacher' })
  expect(popularContexts(data).find((c) => c.context.id === SAMPLE_IDS.lionbridge)?.count).toBe(2)
  expect(popularContexts(data).some((c) => c.context.id === SAMPLE_IDS.icles)).toBe(false)
  data.people.find((p) => p.id === SAMPLE_IDS.rahul)!.deleted = true
  expect(popularContexts(data).find((c) => c.context.id === SAMPLE_IDS.lionbridge)?.count).toBe(1)
  data.contexts.find((c) => c.id === SAMPLE_IDS.lionbridge)!.deleted = true
  expect(popularContexts(data).some((c) => c.context.id === SAMPLE_IDS.lionbridge)).toBe(false)
})
