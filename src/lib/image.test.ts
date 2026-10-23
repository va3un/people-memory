// Tests for shrinking an image before it is saved as a photo.
// jsdom has no real image decoding or 2D canvas, so the browser image and
// canvas are stubbed so the shrink logic itself can run.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shrinkImage } from './image'

// Stubs the browser image and canvas. Returns a way to trigger the image load
// and to restore the real globals.
function stubImageAndCanvas({
  width = 1200,
  height = 900,
}: { width?: number; height?: number } = {}) {
  let latest: any
  const OriginalImage = globalThis.Image
  const OriginalCanvas = globalThis.HTMLCanvasElement
  const OriginalCreateElement = document.createElement.bind(document)

  globalThis.Image = class FakeImage {
    src = ''
    naturalWidth = width
    naturalHeight = height
    onload: ((ev: Event) => void) | null = null
    onerror: ((ev: Event) => void) | null = null
    constructor() {
      latest = this
    }
  } as unknown as typeof Image

  const blob = new Blob(['shrunk-bytes'], { type: 'image/jpeg' })
  class FakeCanvas {
    width = 0
    height = 0
    getContext() {
      return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
    }
    toBlob(callback: BlobCallback, _type: string, _quality: number) {
      callback(blob)
    }
  }
  globalThis.HTMLCanvasElement = FakeCanvas as unknown as typeof HTMLCanvasElement

  document.createElement = ((tag: string) => {
    if (tag === 'canvas') return new FakeCanvas()
    return OriginalCreateElement(tag)
  }) as typeof document.createElement

  return {
    triggerLoad: () => {
      latest.onload?.(new Event('load'))
    },
    triggerError: () => {
      latest.onerror?.(new Event('error'))
    },
    latest: () => latest,
    restore: () => {
      globalThis.Image = OriginalImage
      globalThis.HTMLCanvasElement = OriginalCanvas
      document.createElement = OriginalCreateElement
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shrinkImage', () => {
  it('shrinks an oversized image to 600 px on the long side as JPEG', async () => {
    const { triggerLoad, restore } = stubImageAndCanvas({ width: 1200, height: 900 })
    try {
      const file = new File(['original'], 'photo.jpg', { type: 'image/jpeg' })
      const promise = shrinkImage(file)
      triggerLoad()
      const result = await promise

      expect(result.mime).toBe('image/jpeg')
      expect(result.width).toBe(600)
      expect(result.height).toBe(450)
      expect(result.bytes).toBe(12)
      expect(result.blob).toBeInstanceOf(Blob)
    } finally {
      restore()
    }
  })

  it('keeps a small image at its natural size', async () => {
    const { triggerLoad, restore } = stubImageAndCanvas({ width: 400, height: 300 })
    try {
      const file = new File(['original'], 'photo.png', { type: 'image/png' })
      const promise = shrinkImage(file)
      triggerLoad()
      const result = await promise

      expect(result.width).toBe(400)
      expect(result.height).toBe(300)
      expect(result.mime).toBe('image/jpeg')
    } finally {
      restore()
    }
  })

  it('rejects when the image fails to load', async () => {
    const { triggerError, restore } = stubImageAndCanvas()
    try {
      const file = new File(['original'], 'photo.jpg', { type: 'image/jpeg' })
      const promise = shrinkImage(file)
      triggerError()
      await expect(promise).rejects.toThrow('Failed to load')
    } finally {
      restore()
    }
  })
})
