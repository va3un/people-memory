// Read and edit saved profiles. Existing quick-add links are shown in both directions.
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db/database'
import { useLiveData } from '../lib/useLiveData'
import { PersonAvatar } from '../components/PersonAvatar'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { showToast } from '../components/ui/Toast'
import { deletePersonWithUndo, undoPersonDelete } from '../db/people'
import { ProfileConnections } from '../components/ProfileConnections'

export function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const query = useCallback(async () => {
    const person = await db.people.get(id!)
    const photos = await db.photos
      .where('person_id')
      .equals(id!)
      .filter((p) => !p.deleted)
      .toArray()
    return { person: person && !person.deleted ? person : undefined, photo: photos[0] }
  }, [id])
  const { data, error: readError } = useLiveData(query)
  const remove = async () => {
    if (!data?.person || busy) return
    setBusy(true)
    setError('')
    try {
      const receipt = await deletePersonWithUndo(data.person)
      navigate('/')
      showToast({
        message: `Deleted ${data.person.full_name}`,
        duration: 10_000,
        action: {
          label: 'Undo',
          onClick: () => {
            void undoPersonDelete(receipt)
              .then(() => showToast({ message: 'Person restored' }))
              .catch(() =>
                showToast({
                  message:
                    'Undo could not restore this person. The time expired or the record changed.',
                }),
              )
          },
        },
      })
    } catch {
      setError('Could not delete. The record may have changed. Reopen the profile and try again.')
      setBusy(false)
    }
  }
  if (!data)
    return (
      <main className="page pb-28 pt-6">
        <p role={readError ? 'alert' : 'status'}>{readError ?? 'Loading profile…'}</p>
      </main>
    )
  const person = data.person
  if (!person)
    return (
      <main className="page pb-28 pt-6">
        <h1 className="page-title">Person unavailable</h1>
        <Link className="flex min-h-12 items-center text-accent" to="/">
          Back to people
        </Link>
      </main>
    )
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <Link className="flex min-h-12 items-center text-accent" to="/">
        Back to people
      </Link>
      <PersonAvatar name={person.full_name} photo={data.photo} size={120} />
      <h1 className="page-title mt-4 break-words">{person.full_name}</h1>
      {person.display_name !== person.full_name && <p>{person.display_name}</p>}
      {person.maiden_name && <p>née {person.maiden_name}</p>}
      {person.nicknames.length > 0 && <p>Also known as: {person.nicknames.join(', ')}</p>}
      {person.category && <p>{person.category}</p>}
      {person.city && <p>City: {person.city}</p>}
      {person.birthday && (
        <p>
          Birthday: {person.birthday.day}/{person.birthday.month}
          {person.birthday.year ? `/${person.birthday.year}` : ''}
        </p>
      )}
      {person.how_i_know && (
        <section className="mt-5">
          <h2 className="font-semibold">How I know them</h2>
          <p className="whitespace-pre-wrap break-words">{person.how_i_know}</p>
        </section>
      )}
      {person.notes && (
        <section className="mt-5">
          <h2 className="font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap break-words">{person.notes}</p>
        </section>
      )}
      {person.email && <p className="mt-4 break-words">Email: {person.email}</p>}
      {person.phones.map((phone, index) => (
        <div key={index} className="mt-4 flex flex-wrap items-center gap-2">
          <span>{phone}</span>
          <a
            className="flex min-h-12 items-center px-3 text-accent"
            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
          >
            Call
          </a>
          <a
            className="flex min-h-12 items-center px-3 text-accent"
            href={`https://wa.me/${phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
          <Button
            variant="secondary"
            onClick={() => {
              if (!navigator.clipboard?.writeText) {
                setError('Copy is unavailable. Select the number manually.')
                return
              }
              void navigator.clipboard
                .writeText(phone)
                .then(() => showToast({ message: 'Number copied' }))
                .catch(() => setError('Could not copy. Select and copy the number manually.'))
            }}
          >
            Copy number
          </Button>
        </div>
      ))}
      <ProfileConnections key={person.id} person={person} />
      {error && (
        <p role="alert" className="mt-4 text-danger">
          {error}
        </p>
      )}
      <Link
        className="mt-6 flex min-h-12 items-center justify-center rounded-2xl border text-accent"
        to={`/people/${person.id}/edit`}
      >
        Edit person
      </Link>
      {!person.is_me && (
        <Button variant="danger" className="mt-3 w-full" onClick={() => setConfirm(true)}>
          Delete person
        </Button>
      )}
      <Dialog
        open={confirm}
        onClose={() => {
          if (!busy) setConfirm(false)
        }}
        title="Delete this person?"
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void remove()}>
              Confirm delete
            </Button>
          </>
        }
      >
        <p>
          This hides the person from your list. You can Undo for 10 seconds. Their photo and links
          are retained.
        </p>
      </Dialog>
    </main>
  )
}
