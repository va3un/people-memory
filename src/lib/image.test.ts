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
  failure,
}: { width?: number; height?: number; failure?: 'context' | 'encode' | 'draw' } = {}) {
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
      if (failure === 'context') return null
      return {
        drawImage:
          failure === 'draw'
            ? () => {
                throw new Error('Canvas failed')
              }
            : vi.fn(),
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D
    }
    toBlob(callback: BlobCallback, _type: string, _quality: number) {
      callback(failure === 'encode' ? null : blob)
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
      await expect(promise).rejects.toThrow('Could not read this photo')
    } finally {
      restore()
    }
  })
})

describe('photo failure cleanup', () => {
  it.each(['context', 'encode', 'draw'] as const)(
    'rejects %s failures and releases its object URL',
    async (failure) => {
      const { triggerLoad, restore, latest } = stubImageAndCanvas({ failure })
      const revoke = vi.spyOn(URL, 'revokeObjectURL')
      try {
        const promise = shrinkImage(new File(['fictional'], 'fictional.png', { type: 'image/png' }))
        const url = latest().src
        triggerLoad()
        await expect(promise).rejects.toThrow()
        expect(revoke).toHaveBeenCalledWith(url)
      } finally {
        restore()
      }
    },
  )
  it('rejects invalid dimensions without leaving an object URL', async () => {
    const { triggerLoad, restore } = stubImageAndCanvas({ width: 0, height: 0 })
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    try {
      const promise = shrinkImage(new File(['fictional'], 'fictional.jpg', { type: 'image/jpeg' }))
      triggerLoad()
      await expect(promise).rejects.toThrow('invalid dimensions')
      expect(revoke).toHaveBeenCalled()
    } finally {
      restore()
    }
  })
  it('rejects oversized input before allocating a decoder', async () => {
    const file = new File(['fictional'], 'fictional.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 })
    await expect(shrinkImage(file)).rejects.toThrow('20 MB')
  })
})

it('times out a stalled decoder and releases the object URL', async () => {
  vi.useFakeTimers()
  const { restore, latest } = stubImageAndCanvas()
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  try {
    const promise = shrinkImage(new File(['fictional'], 'fictional.jpg', { type: 'image/jpeg' }))
    const assertion = expect(promise).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(15_000)
    await assertion
    expect(revoke).toHaveBeenCalledWith(latest().src)
  } finally {
    restore()
    vi.useRealTimers()
  }
})
