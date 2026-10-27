// Load a stable edit snapshot so a concurrent tab cannot silently replace the draft.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db/database'
import { AddPage } from './AddPage'
import type { Person, Photo } from '../db/schema'

export function EditPersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<{
    id?: string
    person?: Person
    photo?: Photo
    error?: string
  }>()
  useEffect(() => {
    let active = true
    void Promise.all([
      db.people.get(id!),
      db.photos
        .where('person_id')
        .equals(id!)
        .filter((p) => !p.deleted)
        .first(),
    ])
      .then(([person, photo]) => {
        if (active) setState({ id, person: person?.deleted ? undefined : person, photo })
      })
      .catch(() => {
        if (active) setState({ id, error: 'Could not load this person.' })
      })
    return () => {
      active = false
    }
  }, [id])
  if (!state || state.id !== id) return <p role="status">Loading editor…</p>
  if (!state.person)
    return (
      <main className="page pt-6">
        <p role="alert">{state.error ?? 'Person unavailable.'}</p>
        <Link to="/">Back to people</Link>
      </main>
    )
  return (
    <AddPage
      key={state.person.id}
      original={state.person}
      existingPhoto={state.photo}
      onSaved={(p) => navigate(`/people/${p.id}`)}
    />
  )
}
