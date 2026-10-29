// Each search card has one accessible name, a 56px avatar and a source-based explanation.
import { useCallback, useId } from 'react'
import { Link } from 'react-router-dom'
import type { Person } from '../db/schema'
import { PersonAvatar } from './PersonAvatar'
import { Chip } from './ui/Chip'
import { db } from '../db/database'
import { useLiveData } from '../lib/useLiveData'

export function SearchPersonCard({ person, reason }: { person: Person; reason?: string }) {
  const query = useCallback(
    () =>
      db.photos
        .where('person_id')
        .equals(person.id)
        .filter((photo) => !photo.deleted)
        .first(),
    [person.id],
  )
  const { data: photo } = useLiveData(query)
  const label = useId(),
    why = useId()
  return (
    <Link
      className="card flex min-h-20 items-center gap-3 p-4"
      to={`/people/${person.id}`}
      aria-labelledby={label}
      aria-describedby={reason ? why : undefined}
    >
      <span aria-hidden="true" className="shrink-0">
        <PersonAvatar name={person.full_name} photo={photo} size={56} />
      </span>
      <div className="min-w-0 flex-1">
        <p id={label} className="break-words font-semibold">
          {person.full_name}
        </p>
        {reason && (
          <p id={why} className="break-words text-accent" title={reason}>
            {reason}
          </p>
        )}
        {person.category && (
          <Chip className="mt-1" style={{ fontSize: '0.8125rem', lineHeight: '1.125rem' }}>
            {person.category}
          </Chip>
        )}
      </div>
    </Link>
  )
}
