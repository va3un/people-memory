// Settings keeps the Me profile accessible even though the normal directory hides it.
import { Link } from 'react-router-dom'
import { readMe } from '../../db/me'
import { useLiveData } from '../../lib/useLiveData'
import { Card } from '../ui/Card'

export function AboutYou() {
  const { data: me, error } = useLiveData(readMe)
  return (
    <section className="mt-6">
      <h2 className="section-label">About you</h2>
      <Card className="mt-2 p-4">
        {error && <p role="alert">{error}</p>}
        {me === undefined && !error && <p role="status">Loading your profile…</p>}
        {me === null && <p>Your Me profile is created during first-run setup.</p>}
        {me && (
          <>
            <p>{me.full_name} (Me)</p>
            <Link className="flex min-h-12 items-center text-accent" to={`/people/${me.id}`}>
              Open your Me profile
            </Link>
            <Link className="flex min-h-12 items-center text-accent" to={`/people/${me.id}/edit`}>
              Edit about you
            </Link>
          </>
        )}
      </Card>
    </section>
  )
}
