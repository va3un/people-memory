// Browse lists live context and category counts; full clue search stays in Phase 5.
import { Link } from 'react-router-dom'
import { Tabs } from '../components/ui/Tabs'
import { useLiveData } from '../lib/useLiveData'
import { readBrowse } from '../db/views'
import { CONTEXT_LABELS } from '../db/contexts'

export function BrowsePage() {
  const { data, error } = useLiveData(readBrowse)
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Browse</h1>
      <p className="mt-2 text-muted">People grouped by place and category.</p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading groups…</p>}
      <Tabs
        className="mt-5"
        items={[
          {
            id: 'contexts',
            label: 'Contexts',
            content: (
              <>
                {data?.contexts.length === 0 && (
                  <div>
                    <p>No contexts yet.</p>
                    <Link className="flex min-h-12 items-center text-accent" to="/add">
                      Add a person with a context
                    </Link>
                  </div>
                )}
                <ul className="space-y-3">
                  {data?.contexts.map(({ context, count }) => (
                    <li key={context.id}>
                      <Link
                        className="card flex min-h-20 items-center justify-between gap-3 p-4"
                        to={`/contexts/${context.id}`}
                      >
                        <div className="min-w-0">
                          <p className="break-words font-semibold">{context.name}</p>
                          <p className="text-muted">
                            {CONTEXT_LABELS[context.kind]}
                            {context.city ? `, ${context.city}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0">
                          {count} {count === 1 ? 'person' : 'people'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ),
          },
          {
            id: 'categories',
            label: 'Categories',
            content: (
              <>
                {data?.categories.length === 0 && (
                  <div>
                    <p>No categories yet.</p>
                    <Link className="flex min-h-12 items-center text-accent" to="/">
                      Open a person to add a category
                    </Link>
                  </div>
                )}
                <ul className="space-y-3">
                  {data?.categories.map((category) => (
                    <li key={category.key}>
                      <Link
                        className="card flex min-h-16 items-center justify-between gap-3 p-4"
                        to={`/categories/${encodeURIComponent(category.key)}`}
                      >
                        <span>{category.name}</span>
                        <span>
                          {category.count} {category.count === 1 ? 'person' : 'people'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ),
          },
        ]}
      />
    </main>
  )
}
