// Add an existing or new relative with an explicit sentence describing the stored direction.
import { useRef, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { getPeople } from '../../db/typed'
import { addRelative } from '../../db/relatives'
import { useLiveData } from '../../lib/useLiveData'
import {
  RELATIONSHIP_TYPES,
  relationshipLabel,
  relationshipSentence,
} from '../../domain/relationships'
import type { Gender, Person, RelationshipType } from '../../db/schema'
import { showToast } from '../ui/Toast'

export function RelativeSheet({ person, onClose }: { person: Person; onClose: () => void }) {
  const { data: people, error: readError } = useLiveData(getPeople)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('unknown')
  const [type, setType] = useState<RelationshipType>('other')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const relative = people?.find((p) => p.id === selected)
  const relativeName = mode === 'new' ? name : relative?.full_name
  const relativeGender = mode === 'new' ? gender : (relative?.gender ?? 'unknown')
  const save = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await addRelative(
        person.id,
        mode === 'new' ? { newPerson: { name, gender } } : { personId: selected },
        type,
      )
      showToast({ message: 'Relationship saved' })
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save this relationship. Your choices are still here.',
      )
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  return (
    <Sheet
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Add relative"
    >
      <form
        data-unsaved={!!(name || selected) || undefined}
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void save()
        }}
      >
        {(error || readError) && (
          <p role="alert" className="mb-3 text-danger">
            {error || readError}
          </p>
        )}
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              aria-pressed={mode === 'existing'}
              onClick={() => setMode('existing')}
            >
              Choose person
            </Button>
            <Button
              variant="secondary"
              aria-pressed={mode === 'new'}
              onClick={() => setMode('new')}
            >
              Create person
            </Button>
          </div>
          {mode === 'existing' ? (
            <>
              {!people && !readError && <p role="status">Loading people…</p>}
              {people?.filter((p) => p.id !== person.id).length === 0 && (
                <p>No other people yet. Choose Create person to add one.</p>
              )}
              <div role="group" aria-label="Existing people" className="max-h-48 overflow-y-auto">
                {people
                  ?.filter((p) => p.id !== person.id)
                  .map((p) => (
                    <label
                      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border p-3"
                      key={p.id}
                    >
                      <input
                        type="radio"
                        name="relative"
                        value={p.id}
                        checked={selected === p.id}
                        onChange={() => setSelected(p.id)}
                      />
                      <span className="break-words">{p.full_name}</span>
                    </label>
                  ))}
              </div>
            </>
          ) : (
            <>
              <Input
                name="relative_name"
                label="New person's name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label htmlFor="relative_gender">New person's gender</label>
              <select
                id="relative_gender"
                className="h-12 rounded-2xl border bg-surface px-3"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </>
          )}
          <label htmlFor="relative_type">
            Relationship of the chosen person to {person.full_name}
          </label>
          <select
            id="relative_type"
            aria-label="Relationship type"
            className="h-12 rounded-2xl border bg-surface px-3"
            value={type}
            onChange={(e) => setType(e.target.value as RelationshipType)}
          >
            {RELATIONSHIP_TYPES.map((value) => (
              <option key={value} value={value}>
                {relationshipLabel(value, relativeGender)}
              </option>
            ))}
          </select>
          <p>
            {relationshipSentence(
              relativeName || 'Chosen person',
              type,
              person.full_name,
              relativeGender,
            )}
          </p>
          <Button type="submit" disabled={busy || (mode === 'new' ? !name.trim() : !selected)}>
            {busy ? 'Saving…' : 'Save relationship'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </fieldset>
      </form>
    </Sheet>
  )
}
