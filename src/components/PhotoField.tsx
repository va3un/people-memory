// Keep photo previews local and release their object URLs when files change or the form closes.
import { useEffect, useState, type RefObject } from 'react'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
import type { Photo } from '../db/schema'

export function PhotoField({
  name,
  file,
  existingPhoto,
  removed,
  inputRef,
  onPick,
  onRemove,
  onError,
}: {
  name: string
  file: File | null
  existingPhoto?: Photo
  removed: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onPick: (file: File) => void
  onRemove: () => void
  onError: (message: string) => void
}) {
  const blob = file ?? (!removed ? existingPhoto?.blob : undefined)
  const [preview, setPreview] = useState<{ blob: Blob; url: string }>()
  useEffect(() => {
    if (!blob) {
      setPreview(undefined)
      return
    }
    const url = URL.createObjectURL(blob)
    setPreview({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return (
    <>
      <label htmlFor="photo">Photo (camera or gallery)</label>
      <input
        id="photo"
        type="file"
        accept="image/*"
        aria-label="Photo"
        className="min-h-12 w-full"
        ref={inputRef}
        onChange={(event) => {
          const picked = event.target.files?.[0]
          if (!picked) return
          if (!picked.type.startsWith('image/')) {
            onError('Please pick an image file.')
            event.target.value = ''
            return
          }
          if (picked.size > 20 * 1024 * 1024) {
            onError('Choose a photo smaller than 20 MB.')
            event.target.value = ''
            return
          }
          onPick(picked)
        }}
      />
      {preview && preview.blob === blob && (
        <div className="flex items-center gap-3">
          <Avatar name={name || 'Person'} src={preview.url} />
          <Button variant="danger" onClick={onRemove}>
            Remove photo
          </Button>
        </div>
      )}
    </>
  )
}
