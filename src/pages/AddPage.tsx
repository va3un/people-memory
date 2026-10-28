// Quick add and editing keep drafts intact when validation, image decoding or storage fails.
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ContextField } from '../components/contexts/ContextField'
import type { ContextChoice } from '../db/contexts'
import { PhotoField } from '../components/PhotoField'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { showToast } from '../components/ui/Toast'
import { useUnsavedDraft } from '../lib/useUnsavedDraft'
import { PersonDetailsFields } from '../components/PersonDetailsFields'
import { getPeople, personDefaults, type NewPerson } from '../db/typed'
import { savePerson } from '../db/people'
import type { Person, Photo, RelationshipType } from '../db/schema'
import { RelatedPersonFields } from '../components/RelatedPersonFields'

export function AddPage({
  original,
  existingPhoto,
  onSaved,
  initialContext,
}: {
  initialContext?: ContextChoice
  original?: Person
  existingPhoto?: Photo
  onSaved?: (person: Person) => void
}) {
  const [contextChoice, setContextChoice] = useState<ContextChoice | undefined>(initialContext)
  const [people, setPeople] = useState<Person[]>([])
  const [values, setValues] = useState<NewPerson>(() => original ?? personDefaults(''))
  const [relatedTo, setRelatedTo] = useState('')
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('other')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [removedPhoto, setRemovedPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [moreOpen, setMoreOpen] = useState(!!original)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<string>()
  const [dirty, setDirty] = useState(false)
  const busy = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    void getPeople()
      .then(setPeople)
      .catch(() => setError('Could not load people. Try reopening the app.'))
  }, [savedId])
  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])
  useUnsavedDraft(dirty)

  const change = (changes: Partial<NewPerson>) => {
    setValues((v) => ({ ...v, ...changes }))
    setDirty(true)
    setSavedId(undefined)
  }
  const removePhoto = () => {
    setPhotoFile(null)
    setRemovedPhoto(true)
    setDirty(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const resetForm = () => {
    setContextChoice(initialContext)
    setValues(personDefaults(''))
    setRelatedTo('')
    setRelationshipType('other')
    setPhotoFile(null)
    setRemovedPhoto(false)
    setDirty(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const save = async (addAnother: boolean) => {
    if (busy.current || !values.full_name.trim()) return
    busy.current = true
    setSaving(true)
    setError('')
    try {
      const person = await savePerson({
        values: {
          ...values,
          display_name: values.display_name.trim() || values.full_name.trim().split(/\s+/)[0],
          phones: values.phones.map((p) => p.trim()).filter(Boolean),
          nicknames: values.nicknames.map((n) => n.trim()).filter(Boolean),
        },
        original,
        photo: photoFile,
        removePhoto: removedPhoto,
        relativeId: relatedTo || undefined,
        relationshipType,
        contextChoice,
      })
      setDirty(false)
      setSavedId(person.id)
      showToast({ message: `Saved ${person.display_name}` })
      if (!original) resetForm()
      onSaved?.(person)
      if (addAnother) fileInputRef.current?.focus()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save. Your draft is still here. Try again.',
      )
    } finally {
      busy.current = false
      setSaving(false)
    }
  }
  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">{original ? 'Edit person' : 'Add'}</h1>
      <p className="mt-2 text-base text-muted">
        {original ? 'Update this profile.' : 'Quick add: save someone new.'}
      </p>
      <p className="mt-2 text-base text-muted">
        Stored unencrypted on this device. Backup is not available yet. Use fictional test data
        only.
      </p>
      {savedId && !original && (
        <a
          className="mt-3 inline-flex min-h-12 items-center text-accent underline"
          href={`#/people/${savedId}`}
        >
          View saved person
        </a>
      )}
      <form
        data-unsaved={dirty || undefined}
        onSubmit={(e) => {
          e.preventDefault()
          void save(false)
        }}
      >
        <Card className="mt-5 p-4">
          <p className="section-label">Quick add</p>
          {error && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="my-3 text-danger">
              {error} Your draft has been kept.
            </p>
          )}
          <fieldset disabled={saving} className="mt-3 flex min-w-0 flex-col gap-3">
            <PhotoField
              name={values.full_name}
              file={photoFile}
              existingPhoto={existingPhoto}
              removed={removedPhoto}
              inputRef={fileInputRef}
              onRemove={removePhoto}
              onError={setError}
              onPick={(file) => {
                setPhotoFile(file)
                setRemovedPhoto(false)
                setDirty(true)
                setError('')
              }}
            />
            <Input
              name="full_name"
              label="Full name"
              required
              value={values.full_name}
              onChange={(e) => change({ full_name: e.target.value })}
            />
            <Input
              name="how_i_know"
              label="How do I know them?"
              value={values.how_i_know ?? ''}
              onChange={(e) => change({ how_i_know: e.target.value })}
            />
            <ContextField
              choice={contextChoice}
              onChange={(choice) => {
                setContextChoice(choice)
                setDirty(true)
              }}
            />
            {!original && (
              <RelatedPersonFields
                people={people}
                values={values}
                relatedTo={relatedTo}
                relationshipType={relationshipType}
                onPerson={(id) => {
                  setRelatedTo(id)
                  setDirty(true)
                }}
                onType={(type) => {
                  setRelationshipType(type)
                  setDirty(true)
                }}
              />
            )}
            <Button
              variant="ghost"
              aria-expanded={moreOpen}
              aria-controls="person-details"
              onClick={() => setMoreOpen(!moreOpen)}
            >
              {moreOpen ? 'Hide details' : 'More details'}
            </Button>
            {moreOpen && (
              <div id="person-details">
                <PersonDetailsFields values={values} change={change} />
              </div>
            )}
            <Button type="submit" disabled={!values.full_name.trim() || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {!original && (
              <Button
                variant="secondary"
                disabled={!values.full_name.trim() || saving}
                onClick={() => void save(true)}
              >
                Save and add another
              </Button>
            )}
            {original && (
              <a
                className="flex min-h-12 items-center justify-center text-accent"
                href={`#/people/${original.id}`}
              >
                Cancel
              </a>
            )}
          </fieldset>
        </Card>
      </form>
    </main>
  )
}

// Hash-router entry point for adding a person from a context detail page.
export function AddRoute() {
  const [params] = useSearchParams()
  const contextId = params.get('context')
  return <AddPage key={contextId ?? 'new'} initialContext={contextId ? { contextId } : undefined} />
}
