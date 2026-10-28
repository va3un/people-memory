// A shared in-memory index follows committed IndexedDB changes, including edits from other tabs.
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { db } from '../db/database'
import { useLiveData } from '../lib/useLiveData'
import { buildSearchEngine } from './engine'

export async function readSearchSnapshot() {
  return db.transaction(
    'r',
    [db.people, db.contexts, db.memberships, db.relationships],
    async () => {
      const [people, contexts, memberships, relationships] = await Promise.all([
        db.people.filter((p) => !p.deleted).toArray(),
        db.contexts.filter((c) => !c.deleted).toArray(),
        db.memberships.filter((m) => !m.deleted).toArray(),
        db.relationships.filter((r) => !r.deleted).toArray(),
      ])
      return { people, contexts, memberships, relationships }
    },
  )
}
export type DirectorySnapshot = Awaited<ReturnType<typeof readSearchSnapshot>>
type DirectoryState = {
  data?: DirectorySnapshot
  engine?: ReturnType<typeof buildSearchEngine>
  error?: string
}
const DirectoryContext = createContext<DirectoryState | null>(null)
export function DirectoryProvider({ children }: { children: ReactNode }) {
  const { data, error } = useLiveData(readSearchSnapshot)
  // Photos and local view metadata refresh the UI without unnecessarily rebuilding the text index.
  const content = data
    ? JSON.stringify({
        people: data.people.map(({ last_viewed_at: _view, ...person }) => person),
        contexts: data.contexts,
        memberships: data.memberships,
        relationships: data.relationships,
      })
    : ''
  const engine = useMemo(
    () => (content ? buildSearchEngine(JSON.parse(content)) : undefined),
    [content],
  )
  const value = useMemo(() => ({ data, engine, error }), [data, engine, error])
  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>
}
export function useSearchDirectory() {
  const value = useContext(DirectoryContext)
  if (!value) throw new Error('Search must be rendered inside DirectoryProvider.')
  return value
}
