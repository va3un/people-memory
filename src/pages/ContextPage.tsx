// Context detail shows each active member once, with every stored role and period.
import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { readContext } from '../db/views'
import { useLiveData } from '../lib/useLiveData'
import { PersonAvatar } from '../components/PersonAvatar'
import { CONTEXT_LABELS } from '../db/contexts'

export function ContextPage() {
  const { id } = useParams()
  const query = useCallback(() => readContext(id!), [id])
  const { data, error } = useLiveData(query)
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <Link className="flex min-h-12 items-center text-accent" to="/browse">
        Back to Browse
      </Link>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading context…</p>}
      {data && !data.context && <h1 className="page-title">Context unavailable</h1>}
      {data?.context && (
        <>
          <h1 className="page-title break-words">{data.context.name}</h1>
          <p className="mt-2 text-muted">
            {CONTEXT_LABELS[data.context.kind]}
            {data.context.city ? `, ${data.context.city}` : ''}
          </p>
          {data.context.notes && (
            <p className="mt-3 whitespace-pre-wrap break-words">{data.context.notes}</p>
          )}
          <p className="mt-3">
            {data.people.length} {data.people.length === 1 ? 'person' : 'people'}
          </p>
          <Link
            className="my-4 flex min-h-12 items-center justify-center rounded-2xl border text-accent"
            to={`/add?context=${encodeURIComponent(data.context.id)}`}
          >
            Add person here
          </Link>
          {data.people.length === 0 && <p>No members yet. Add a person here.</p>}
          <ul className="space-y-3">
            {data.people.map(({ person, photo, memberships }) => (
              <li key={person.id}>
                <Link
                  className="card flex min-h-20 items-center gap-3 p-4"
                  to={`/people/${person.id}`}
                >
                  <PersonAvatar name={person.full_name} photo={photo} />
                  <div className="min-w-0">
                    <p className="break-words font-semibold">
                      {person.full_name}
                      {person.is_me ? ' (Me)' : ''}
                    </p>
                    {memberships.map((m) => (
                      <p key={m.id} className="break-words text-muted">
                        {m.role || 'Member'}
                        {m.period ? `, ${m.period}` : ''}
                      </p>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
