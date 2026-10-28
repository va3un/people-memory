// Search by local clues; recents and context shortcuts remain available when the query is empty.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { SearchPersonCard } from '../components/SearchPersonCard'
import { useSearchDirectory } from '../search/DirectoryProvider'
import { popularContexts, recentPeople } from '../search/recents'
import type { Person } from '../db/schema'

export function SearchPage() {
  const { data, engine, error } = useSearchDirectory()
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(50)
  const [recentLimit, setRecentLimit] = useState(12)
  const input = useRef<HTMLInputElement>(null)
  const results = useMemo(() => engine?.search(query) ?? [], [engine, query])
  const recents = useMemo(() => (data ? recentPeople(data) : undefined), [data])
  const contexts = useMemo(() => (data ? popularContexts(data) : []), [data])
  useEffect(() => {
    setLimit(50)
  }, [query])
  const card = (person: Person, reason?: string) => (
    <SearchPersonCard person={person} reason={reason} />
  )
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Search</h1>
      <p className="mt-2 text-muted">Find anyone by a name, relative or place.</p>
      <div className="relative mt-5">
        <Search
          size={20}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input
          name="search"
          type="search"
          autoFocus
          aria-label="Search people"
          placeholder="Name, relative, workplace, school…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 rounded-full pl-11 pr-14"
          ref={input}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-full text-accent"
            onClick={() => {
              setQuery('')
              input.current?.focus()
            }}
          >
            <X aria-hidden="true" size={20} />
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-4">
          {error}
        </p>
      )}
      {!data && !error && (
        <p role="status" className="mt-4">
          Loading people…
        </p>
      )}
      {data && query.trim() ? (
        <section aria-label="Search results" className="mt-5">
          <p role="status" aria-live="polite" className="mb-3 text-muted">
            {results.length} {results.length === 1 ? 'person' : 'people'} found
          </p>
          {results.length === 0 && (
            <div>
              <p>No people match these clues. Try a shorter name or a different clue.</p>
              <Link className="flex min-h-12 items-center text-accent" to="/add">
                Add a person
              </Link>
            </div>
          )}
          <ul className="space-y-3">
            {results.slice(0, limit).map((result) => (
              <li key={result.person.id}>{card(result.person, result.reason)}</li>
            ))}
          </ul>
          {results.length > limit && (
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => setLimit((n) => n + 50)}
            >
              Show more results
            </Button>
          )}
        </section>
      ) : (
        data && (
          <>
            {contexts.length > 0 && (
              <section aria-label="Context shortcuts" className="mt-5">
                <h2 className="section-label">Often used contexts</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {contexts.map(({ context, count }) => (
                    <Link
                      key={context.id}
                      to={`/contexts/${context.id}`}
                      className="inline-flex min-h-12 items-center rounded-full bg-accent-soft px-4 text-accent"
                    >
                      {context.name} ({count})
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {!!recents?.viewed.length && (
              <section aria-label="Recently viewed" className="mt-6">
                <h2 className="section-label">Recently viewed</h2>
                <ul className="mt-3 space-y-3">
                  {recents.viewed.map((person) => (
                    <li key={person.id}>{card(person, person.how_i_know)}</li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-label="Recently added" className="mt-6">
              <h2 className="section-label">Recently added</h2>
              {recents?.added.length === 0 && (
                <div className="mt-3">
                  <p>No people yet. Add a fictional person to get started.</p>
                  <Link className="flex min-h-12 items-center text-accent" to="/add">
                    Add a person
                  </Link>
                </div>
              )}
              <ul className="mt-3 space-y-3">
                {recents?.added.slice(0, recentLimit).map((person) => (
                  <li key={person.id}>{card(person, person.how_i_know)}</li>
                ))}
              </ul>
              {(recents?.added.length ?? 0) > recentLimit && (
                <Button
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={() => setRecentLimit((n) => n + 50)}
                >
                  Show more people
                </Button>
              )}
            </section>
          </>
        )
      )}
    </main>
  )
}
