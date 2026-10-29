// Export regressions cover CSV injection and interoperable Unicode vCard boundaries.
import { Blob as NodeBlob } from 'node:buffer'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { db } from '../db/database'
import { DATA_TABLES } from './schema'
import { exportCsvZip, exportVcard, csvCell, peopleVcard, foldVcardLine } from './exports'
import { readBlob } from './codec'
import { personDefaults, createPerson } from '../db/typed'
import { loadSampleData } from '../db/operations'
beforeEach(async () => {
  vi.stubGlobal('Blob', NodeBlob)
  await Promise.all(DATA_TABLES.map((table) => db.table(table).clear()))
})
afterEach(() => vi.unstubAllGlobals())
it('exports four separate UTF-8 CSVs with every row, including deleted records', async () => {
  await loadSampleData()
  await db.people.update('sample-person-rahul', { deleted: true })
  const files = unzipSync(new Uint8Array(await readBlob(await exportCsvZip())))
  expect(Object.keys(files).sort()).toEqual([
    'contexts.csv',
    'memberships.csv',
    'people.csv',
    'relationships.csv',
  ])
  for (const [name, bytes] of Object.entries(files)) {
    expect(Array.from(bytes.slice(0, 3))).toEqual([239, 187, 191])
    expect(strFromU8(bytes)).toContain('"deleted"')
    const table = name.replace('.csv', '')
    expect(strFromU8(bytes).split('\r\n').length - 2).toBe(await db.table(table).count())
  }
  expect(strFromU8(files['people.csv'])).toContain('sample-person-rahul')
})
it.each(['=HYPERLINK("x")', '+910000000000', '-1+2', '@SUM(1)', '  =1', '\tformula', '\nformula'])(
  'neutralizes spreadsheet formula prefix %s',
  (value) => {
    expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`)
  },
)
it('preserves Unicode, quotes, commas, newlines and structured arrays in CSV cells', () => {
  expect(csvCell('मीरा, "Joshi"\nline')).toBe('"मीरा, ""Joshi""\nline"')
  expect(csvCell(['+910000000000'])).toBe('"[""+910000000000""]"')
  expect(csvCell(undefined)).toBe('""')
})
it('exports only active people with numbers, retaining country codes without inferring names or phone types', async () => {
  const person = await createPerson({
    ...personDefaults('मीरा; Joshi, Fictional'),
    phones: ['+91 00000 00000', ''],
    notes: 'line1\nEND:VCARD\nline2',
    city: 'Test; City',
  })
  await createPerson(personDefaults('No number'))
  await createPerson({
    ...personDefaults('Deleted number'),
    phones: ['000000'],
    deleted: true,
  })
  const card = peopleVcard(await db.people.toArray())
  expect(card).toContain(`UID:${person.id}\r\nN:;;;;\r\nFN:मीरा\\; Joshi\\, Fictional`)
  expect(card).toContain('TEL:+91 00000 00000\r\n')
  expect(card).toContain('NOTE:line1\\nEND:VCARD\\nline2')
  expect(card).toContain('ADR:;;;Test\\; City;;;')
  expect(card).not.toContain('TYPE=')
  expect(card).not.toContain('No number')
  expect(card).not.toContain('Deleted number')
  expect(card.match(/^END:VCARD$/gm)).toHaveLength(1)
  expect(new TextDecoder().decode(await readBlob(await exportVcard()))).toBe(card)
})
it('folds long Unicode lines at 75 UTF-8 bytes without splitting characters', () => {
  const line = 'FN:' + 'मीरा 😀'.repeat(80),
    folded = foldVcardLine(line)
  for (const part of folded.split('\r\n'))
    expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
  expect(folded.replace(/\r\n /g, '')).toBe(line)
})
