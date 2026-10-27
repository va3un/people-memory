// Decode locally, flatten transparency onto white, and store a small JPEG without source metadata.
export async function shrinkImage(
  file: File,
  { maxSize = 600, quality = 0.8 }: { maxSize?: number; quality?: number } = {},
): Promise<{ blob: Blob; mime: string; width: number; height: number; bytes: number }> {
  if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 20 MB.')
  }
  if (
    !Number.isFinite(maxSize) ||
    maxSize < 1 ||
    maxSize > 600 ||
    !Number.isFinite(quality) ||
    quality <= 0 ||
    quality > 1
  ) {
    throw new Error('Invalid image size or quality.')
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      const timeout = window.setTimeout(
        () => reject(new Error('Photo processing timed out. Try another image.')),
        15_000,
      )
      const fail = (error: unknown) => {
        window.clearTimeout(timeout)
        reject(error instanceof Error ? error : new Error('Could not process this photo.'))
      }
      img.onerror = () =>
        fail(new Error('Could not read this photo. Choose another image or remove it and retry.'))
      img.onload = () => {
        try {
          if (
            !img.naturalWidth ||
            !img.naturalHeight ||
            img.naturalWidth * img.naturalHeight > 40_000_000
          ) {
            throw new Error(
              'This photo is too large or has invalid dimensions. Choose a smaller photo.',
            )
          }
          const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
          const width = Math.max(1, Math.round(img.naturalWidth * scale))
          const height = Math.max(1, Math.round(img.naturalHeight * scale))
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Photo processing is unavailable in this browser.')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              window.clearTimeout(timeout)
              if (!blob || blob.type !== 'image/jpeg') {
                fail(new Error('Could not encode this photo as JPEG.'))
                return
              }
              resolve({ blob, mime: 'image/jpeg', width, height, bytes: blob.size })
            },
            'image/jpeg',
            quality,
          )
        } catch (error) {
          fail(error)
        }
      }
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
