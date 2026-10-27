// Phase 3 lists people newest-first. Indexed search arrives in Phase 5.
import { Link } from 'react-router-dom'
import { db } from '../db/database'
import { useLiveData } from '../lib/useLiveData'
import { PersonAvatar } from '../components/PersonAvatar'

async function listPeople() {
  const people = await db.people.filter((p) => !p.deleted && !p.is_me).toArray()
  const photos = await db.photos.filter((p) => !p.deleted).toArray()
  return {
    people: people.sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id),
    ),
    photos,
  }
}
export function SearchPage() {
  const { data, error } = useLiveData(listPeople)
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Search</h1>
      <p className="mt-2 text-base text-muted">
        Your people, newest first. Clue search arrives in Phase 5.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading people…</p>}
      {data?.people.length === 0 && (
        <div className="mt-6">
          <p>No people yet. Add a fictional person to get started.</p>
          <Link className="flex min-h-12 items-center text-accent" to="/add">
            Add a person
          </Link>
        </div>
      )}
      <ul className="mt-5 space-y-3">
        {data?.people.map((person) => (
          <li key={person.id}>
            <Link className="card flex min-h-20 items-center gap-3 p-4" to={`/people/${person.id}`}>
              <PersonAvatar
                name={person.full_name}
                photo={data.photos.find((p) => p.person_id === person.id)}
              />
              <div className="min-w-0">
                <p className="break-words font-semibold">{person.full_name}</p>
                {person.how_i_know && <p className="break-words text-muted">{person.how_i_know}</p>}
                {person.category && <p className="text-muted">{person.category}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
