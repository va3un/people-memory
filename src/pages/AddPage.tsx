import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { showToast } from '../components/ui/Toast'
import { createPerson, createPhoto, createRelationship, getPeople, personDefaults } from '../db/typed'
import type { Person } from '../db/schema'
import { shrinkImage } from '../lib/image'

// The Add screen. Quick form from roadmap section 11.3: photo, name, how you
// know them, optional "Related to", and a fold-out for more details. Saving
// creates a person (and photo) in the phone's database.
export function AddPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [name, setName] = useState('')
  const [howIKnow, setHowIKnow] = useState('')
  const [relatedTo, setRelatedTo] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  const [nicknames, setNicknames] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getPeople().then(setPeople)
  }, [])

  const hasChanges = name.length > 0

  const pickPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast({ message: 'Please pick an image file.' })
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const resetForm = () => {
    setName('')
    setHowIKnow('')
    setRelatedTo('')
    setPhone('')
    setCity('')
    setNotes('')
    setNicknames('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    removePhoto()
  }


  const save = async (addAnother: boolean) => {
    if (!hasChanges) return
    setSaving(true)
    try {
      const person = await createPerson({
        ...personDefaults(name),
        how_i_know: howIKnow || undefined,
        city: city || undefined,
        notes: notes || undefined,
        nicknames: nicknames.split(',').map((n) => n.trim()).filter(Boolean),
        phones: phone ? [phone] : [],
      })

      if (photoFile) {
        const { blob, mime, width, height, bytes } = await shrinkImage(photoFile)
        await createPhoto({
          person_id: person.id,
          blob,
          mime,
          width,
          height,
          bytes,
        })
      }

      if (relatedTo) {
        await createRelationship({
          person_id: person.id,
          relative_id: relatedTo,
          type: 'other',
        })
      }

      showToast({ message: `Saved ${person.display_name}` })

      if (addAnother) {
        resetForm()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page mx-auto w-full max-w-md pb-28 pt-6">
      <h1 className="page-title">Add</h1>
      <p className="mt-1 text-sm text-muted">Save someone new to your people list.</p>

      <Card className="mt-5 p-4">
        <p className="section-label">Quick add</p>

        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text">Photo</label>
            <input
              type="file"
              accept="image/*"
              aria-label="Photo"
              className="block w-full text-sm text-muted"
              onChange={pickPhoto}
              ref={fileInputRef}
            />
          </div>
          {photoFile && (
            <div className="flex items-center gap-3">
              <Avatar name={name || 'Person'} src={photoPreview} size={56} />
              <Button variant="danger" size="sm" onClick={removePhoto} className="shrink-0">
                Remove
              </Button>
              <p className="text-sm text-muted flex-1">Photo will be shrunk to save space.</p>
            </div>
          )}

          <Input
            name="full_name"
            label="Full name"
            placeholder="Meera Joshi"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Full name"
          />
          <Input
            name="how_i_know"
            label="How do I know them?"
            placeholder="Type a line, for example &quot;School friend&quot;"
            value={howIKnow}
            onChange={(event) => setHowIKnow(event.target.value)}
            aria-label="How do I know them?"
          />

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text">Related to</label>
            <select
              value={relatedTo}
              onChange={(event) => setRelatedTo(event.target.value)}
              className="flex-1 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-text focus:border-accent focus:outline-none"
              aria-label="Related to"
            >
              <option value="">None</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMoreOpen(!moreOpen)}
            className="w-full justify-start text-sm"
          >
            {moreOpen ? 'Hide' : 'More details'} ▾
          </Button>
          {moreOpen && (
            <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
              <Input
                name="phone"
                label="Phone"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                aria-label="Phone"
              />
              <Input
                name="city"
                label="City"
                placeholder="Pune"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                aria-label="City"
              />
              <Input
                name="nicknames"
                label="Nicknames"
                placeholder="Mera, मीरा"
                value={nicknames}
                onChange={(event) => setNicknames(event.target.value)}
                aria-label="Nicknames"
                hint="Separate with commas."
              />
              <Input
                name="notes"
                label="Notes"
                placeholder="Anything else you want to remember"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                aria-label="Notes"
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:gap-2">
          <Button
            size="lg"
            disabled={!hasChanges || saving}
            onClick={() => save(false)}
            className="w-full sm:w-1/2"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            disabled={!hasChanges || saving}
            onClick={() => save(true)}
            className="w-full sm:w-1/2"
          >
            Save and add another
          </Button>
        </div>
      </Card>
    </main>
  )
}

