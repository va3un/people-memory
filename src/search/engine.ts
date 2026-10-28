// MiniSearch handles prefix, typo and AND matching. Explicit tiers keep names above indirect clues.
import MiniSearch, { type SearchResult } from 'minisearch'
import { normalizeName, normalizePhone, STOP_WORDS } from '../domain/names'
import {
  buildDocuments,
  SEARCH_FIELDS,
  searchTokens,
  type SearchClue,
  type SearchDocument,
  type SearchField,
  type SearchSource,
} from './documents'

const FIELD_PRIORITY: Record<SearchField, number> = {
  name: 0,
  aliases: 3,
  phones: 3,
  related: 4,
  contexts: 5,
  details: 6,
  notes: 7,
}
export function prepareQuery(query: string): string {
  if (/^[+\d()\s.-]+$/.test(query) && normalizePhone(query).length >= 3)
    return normalizePhone(query)
  const words = [...new Set(searchTokens(query))]
  return (words.length > 1 ? words.filter((word) => !STOP_WORDS.has(word)) : words).join(' ')
}

function matchesClue(clue: SearchClue, result: SearchResult): number {
  const words = new Set(searchTokens(clue.text))
  return Object.entries(result.match).filter(
    ([term, fields]) => fields.includes(clue.field) && words.has(term),
  ).length
}
function covers(clue: SearchClue, terms: string[]): boolean {
  const words = searchTokens(clue.text)
  return terms.every((term) => words.some((word) => word.startsWith(term)))
}
function explain(doc: SearchDocument, result: SearchResult, terms: string[]): string {
  const clues = doc.clues.filter((clue) => matchesClue(clue, result) > 0)
  // An exact nickname/maiden spelling is more informative than calling the same match a name typo.
  const alias = clues.find((clue) => clue.field === 'aliases' && covers(clue, terms))
  if (alias && !covers(doc.clues[0], terms)) return alias.label
  clues.sort(
    (a, b) =>
      FIELD_PRIORITY[a.field] - FIELD_PRIORITY[b.field] ||
      matchesClue(b, result) - matchesClue(a, result),
  )
  return clues[0]?.label ?? 'Matched saved details'
}
function rank(doc: SearchDocument, result: SearchResult, terms: string[], query: string): number {
  const fields = new Set(Object.values(result.match).flat())
  if (fields.has('name')) {
    if (
      [doc.person.full_name, doc.person.display_name].some((name) => normalizeName(name) === query)
    )
      return -1
    const words = searchTokens(doc.name)
    if (terms.every((term) => words.includes(term))) return 0
    if (terms.every((term) => words.some((word) => word.startsWith(term)))) return 1
    return 2
  }
  return Math.min(...[...fields].map((field) => FIELD_PRIORITY[field as SearchField] ?? 8))
}

export function buildSearchEngine(source: SearchSource) {
  const documents = buildDocuments(source)
  const byId = new Map(documents.map((doc) => [doc.id, doc]))
  const index = new MiniSearch<SearchDocument>({
    fields: [...SEARCH_FIELDS],
    tokenize: searchTokens,
    processTerm: (term) => term,
    searchOptions: {
      combineWith: 'AND',
      prefix: true,
      fuzzy: (term) =>
        term.length >= 4 && !/^\d+$/.test(term) ? (term.length > 7 ? 2 : 1) : false,
      boost: { name: 12, aliases: 8, phones: 8, related: 4, contexts: 3, details: 2, notes: 1 },
    },
  })
  index.addAll(documents)
  return {
    search(rawQuery: string) {
      const query = prepareQuery(rawQuery),
        terms = searchTokens(query)
      if (!terms.length) return []
      return index
        .search(query)
        .map((result) => {
          const doc = byId.get(String(result.id))!
          return {
            person: doc.person,
            reason: explain(doc, result, terms),
            rank: rank(doc, result, terms, query),
            score: result.score,
          }
        })
        .sort(
          (a, b) =>
            a.rank - b.rank ||
            b.score - a.score ||
            a.person.full_name.localeCompare(b.person.full_name) ||
            a.person.id.localeCompare(b.person.id),
        )
    },
    size: documents.length,
  }
}
