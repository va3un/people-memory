// Image handling for photos. Photos are shrunk to at most 600 px on the long
// side and saved as JPEG at quality 0.8, so each photo is roughly 30 to 80 KB.
// This matches roadmap section 8.5. Nothing is sent anywhere; the blob lives in
// IndexedDB on the phone.

// Shrinks an image file to at most maxSize on the long side, encoded as JPEG.
// Returns the blob and its dimensions, so the caller can store it as a photo.
export async function shrinkImage(
  file: File,
  { maxSize = 600, quality = 0.8 }: { maxSize?: number; quality?: number } = {},
): Promise<{ blob: Blob; mime: string; width: number; height: number; bytes: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let width = img.naturalWidth
      let height = img.naturalHeight
      if (Math.max(width, height) > maxSize) {
        const scale = maxSize / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not create a canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src)
          if (!blob) {
            reject(new Error('Could not encode the image'))
            return
          }
          resolve({
            blob,
            mime: 'image/jpeg',
            width,
            height,
            bytes: blob.size,
          })
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load the image'))
    }
    img.src = URL.createObjectURL(file)
  })
}
