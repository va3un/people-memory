// CSV and vCard are convenience exports; only JSON includes binary photos and every table for restoration.
import { strToU8, zipSync } from 'fflate'
import { readSnapshot } from './snapshot'
import type { Person } from '../db/schema'

export function csvCell(value: unknown): string {
  let text =
    value === undefined
      ? ''
      : Array.isArray(value) || (value && typeof value === 'object')
        ? JSON.stringify(value)
        : String(value)
  // Quoting alone does not stop spreadsheet formula execution.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}
function csv(rows: object[], fields: string[]) {
  return (
    '\uFEFF' +
    fields.map(csvCell).join(',') +
    '\r\n' +
    rows
      .map((row) =>
        fields.map((field) => csvCell((row as Record<string, unknown>)[field])).join(','),
      )
      .join('\r\n') +
    '\r\n'
  )
}
const base = ['id', 'created_at', 'updated_at', 'deleted', 'source_batch_id']
export async function exportCsvZip(): Promise<Blob> {
  const data = await readSnapshot()
  const people = data.people.map(({ birthday, ...person }) => ({
    ...person,
    birthday_month: birthday?.month,
    birthday_day: birthday?.day,
    birthday_year: birthday?.year,
  }))
  const files = {
    'people.csv': strToU8(
      csv(people, [
        ...base,
        'full_name',
        'maiden_name',
        'display_name',
        'nicknames',
        'gender',
        'category',
        'phones',
        'email',
        'city',
        'how_i_know',
        'notes',
        'birthday_month',
        'birthday_day',
        'birthday_year',
        'is_me',
        'last_viewed_at',
      ]),
    ),
    'contexts.csv': strToU8(csv(data.contexts, [...base, 'name', 'kind', 'city', 'notes'])),
    'memberships.csv': strToU8(
      csv(data.memberships, [...base, 'person_id', 'context_id', 'role', 'period', 'notes']),
    ),
    'relationships.csv': strToU8(
      csv(data.relationships, [...base, 'person_id', 'relative_id', 'type', 'notes']),
    ),
  }
  return new Blob([Uint8Array.from(zipSync(files, { level: 0 })).buffer], {
    type: 'application/zip',
  })
}
export const vcardEscape = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
export function foldVcardLine(line: string): string {
  const lines: string[] = []
  let current = '',
    bytes = 0
  for (const character of line) {
    const count = new TextEncoder().encode(character).length
    if (bytes + count > 75) {
      lines.push(current)
      current = ' '
      bytes = 1
    }
    current += character
    bytes += count
  }
  lines.push(current)
  return lines.join('\r\n')
}
export function peopleVcard(people: Person[]): string {
  return people
    .filter((p) => !p.deleted && p.phones.some((phone) => phone.trim()))
    .map(
      (person) =>
        [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `UID:${vcardEscape(person.id)}`,
          'N:;;;;',
          `FN:${vcardEscape(person.full_name)}`,
          ...person.phones
            .filter((phone) => phone.trim())
            .map((phone) => `TEL:${vcardEscape(phone)}`),
          ...(person.email ? [`EMAIL:${vcardEscape(person.email)}`] : []),
          ...(person.city ? [`ADR:;;;${vcardEscape(person.city)};;;`] : []),
          ...(person.notes ? [`NOTE:${vcardEscape(person.notes)}`] : []),
          'END:VCARD',
        ]
          .map(foldVcardLine)
          .join('\r\n') + '\r\n',
    )
    .join('')
}
export async function exportVcard(): Promise<Blob> {
  return new Blob([peopleVcard((await readSnapshot()).people)], {
    type: 'text/vcard;charset=utf-8',
  })
}
