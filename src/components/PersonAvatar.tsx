// Release photo URLs when a photo changes or its view closes.
import { useEffect, useState } from 'react'
import { Avatar } from './ui/Avatar'
import type { Photo } from '../db/schema'

export function PersonAvatar({
  name,
  photo,
  size = 56,
}: {
  name: string
  photo?: Photo
  size?: number
}) {
  const [preview, setPreview] = useState<{ blob: Blob; url: string }>()
  useEffect(() => {
    if (!photo) {
      setPreview(undefined)
      return
    }
    const url = URL.createObjectURL(photo.blob)
    setPreview({ blob: photo.blob, url })
    return () => URL.revokeObjectURL(url)
  }, [photo])
  return (
    <Avatar
      name={name}
      src={preview?.blob === photo?.blob ? preview?.url : undefined}
      size={size}
    />
  )
}
