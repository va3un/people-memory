// Category membership is a live view of the existing free-text person field.
import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../db/database'
import { normalizeName } from '../domain/names'
import { useLiveData } from '../lib/useLiveData'
import { PersonAvatar } from '../components/PersonAvatar'

export function CategoryPage() {
  const { category } = useParams()
  const query = useCallback(async () => {
    const people = await db.people
      .filter(
        (p) =>
          !p.deleted && !p.is_me && !!p.category?.trim() && normalizeName(p.category) === category,
      )
      .toArray()
    const photos = await db.photos.filter((p) => !p.deleted).toArray()
    return { people: people.sort((a, b) => a.full_name.localeCompare(b.full_name)), photos }
  }, [category])
  const { data, error } = useLiveData(query)
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <Link className="flex min-h-12 items-center text-accent" to="/browse">
        Back to Browse
      </Link>
      <h1 className="page-title">{data?.people[0]?.category?.trim() ?? category}</h1>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading category…</p>}
      {data?.people.length === 0 && <p className="mt-4">No people in this category.</p>}
      <ul className="mt-4 space-y-3">
        {data?.people.map((person) => (
          <li key={person.id}>
            <Link className="card flex min-h-20 items-center gap-3 p-4" to={`/people/${person.id}`}>
              <PersonAvatar
                name={person.full_name}
                photo={data.photos.find((p) => p.person_id === person.id)}
              />
              <span className="break-words font-semibold">{person.full_name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
