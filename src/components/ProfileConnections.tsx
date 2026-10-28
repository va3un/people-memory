// A profile presents both directions of relatives and its active context memberships.
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveData } from '../lib/useLiveData'
import { readConnections } from '../db/views'
import { addToContext } from '../db/contexts'
import { relationshipLabel } from '../domain/relationships'
import type { Person } from '../db/schema'
import { RelativeSheet } from './relationships/RelativeSheet'
import { ContextPicker } from './contexts/ContextPicker'
import { Button } from './ui/Button'
import { showToast } from './ui/Toast'

export function ProfileConnections({ person }: { person: Person }) {
  const query = useCallback(() => readConnections(person.id), [person.id])
  const { data, error } = useLiveData(query)
  const [relativeOpen, setRelativeOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <section className="mt-5">
        <h2 className="font-semibold">Family and relatives</h2>
        {!data && !error && <p role="status">Loading relatives…</p>}
        {data?.relatives.length === 0 && <p className="text-muted">No relatives linked yet.</p>}
        <ul>
          {data?.relatives.map(({ link, relative, type }) => (
            <li key={link.id}>
              <Link
                className="my-2 flex min-h-12 items-center rounded-2xl border p-3 text-accent"
                to={`/people/${relative.id}`}
              >
                {relationshipLabel(type, relative.gender)}: {relative.full_name}
              </Link>
            </li>
          ))}
        </ul>
        <Button variant="secondary" onClick={() => setRelativeOpen(true)}>
          Add relative
        </Button>
      </section>
      <section className="mt-5">
        <h2 className="font-semibold">Known through</h2>
        {!data && !error && <p role="status">Loading contexts…</p>}
        {data?.contexts.length === 0 && <p className="text-muted">No contexts linked yet.</p>}
        <ul>
          {data?.contexts.map(({ membership, context }) => (
            <li key={membership.id}>
              <Link
                className="my-2 flex min-h-12 flex-col justify-center rounded-2xl border p-3 text-accent"
                to={`/contexts/${context.id}`}
              >
                <span>
                  {context.name}
                  {membership.role ? ` (${membership.role})` : ''}
                </span>
                {membership.period && <span className="text-muted">{membership.period}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <Button variant="secondary" onClick={() => setContextOpen(true)}>
          Add to a context
        </Button>
      </section>
      {relativeOpen && <RelativeSheet person={person} onClose={() => setRelativeOpen(false)} />}
      {contextOpen && (
        <ContextPicker
          onClose={() => setContextOpen(false)}
          onChoose={async (choice) => {
            await addToContext(person.id, choice)
            showToast({ message: 'Context linked' })
          }}
        />
      )}
    </>
  )
}
