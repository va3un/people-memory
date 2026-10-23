// Tests for the Add quick add form: photo picker, name, save, and related person.
// The image shrinker is mocked because jsdom has no real image decoding or 2D canvas.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { db } from '../db/database'
import { createPerson } from '../db/typed'
import { shrinkImage } from '../lib/image'
import { AddPage } from './AddPage'
import { Toaster } from '../components/ui/Toast'

vi.mock('../lib/image', () => ({
  shrinkImage: vi.fn(async () => ({
    blob: new Blob(['shrunk'], { type: 'image/jpeg' }),
    mime: 'image/jpeg',
    width: 600,
    height: 400,
    bytes: 6,
  })),
}))

// Renders the Add screen into a detached element so it can be checked.
async function renderAdd() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <>
        <AddPage />
        <Toaster />
      </>,
    )
  })

  return {
    container,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

// Sets the value of a controlled input and tells React about the change.
async function setInputValue(container: HTMLElement, name: string, value: string) {
  const input = container.querySelector(`input[name="${name}"]`) as HTMLInputElement
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

// Finds a button by the exact words inside it.
function buttonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((button) => {
    return (button.textContent ?? '').trim() === text
  })
}

// Picks a JPEG photo on the file input.
// jsdom rejects assigning a fake FileList to input.files, so shadow the
// accessor with an own property instead.
async function pickPhoto(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' })
  const fileList = {
    length: 1,
    item: (index: number) => (index === 0 ? file : null),
    0: file,
    [Symbol.iterator]: function* () {
      yield file
    },
  } as unknown as FileList
  Object.defineProperty(input, 'files', {
    value: fileList,
    writable: true,
    configurable: true,
  })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function clearTables() {
  await db.open()
  await Promise.all([db.people.clear(), db.photos.clear(), db.relationships.clear()])
}

beforeEach(async () => {
  await clearTables()
})

afterEach(async () => {
  await clearTables()
})

describe('add quick add form', () => {
  it('renders the photo picker, name field and save button', async () => {
    const { container, unmount } = await renderAdd()

    expect(container.textContent).toContain('Quick add')
    expect(container.querySelector('input[name="full_name"]')).not.toBeNull()
    expect(container.querySelector('input[type="file"]')).not.toBeNull()
    expect(buttonByText(container, 'Save')).not.toBeNull()
    expect(buttonByText(container, 'Save and add another')).not.toBeNull()

    unmount()
  })
  it('saves a person and a shrunk photo when save is tapped', async () => {
    const { container, unmount } = await renderAdd()

    await setInputValue(container, 'full_name', 'Meera Joshi')
    await setInputValue(container, 'how_i_know', 'School friend')
    await pickPhoto(container)

    await act(async () => {
      buttonByText(container, 'Save')?.click()
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const people = await db.people.toArray()
    expect(people.length).toBe(1)
    expect(people[0].full_name).toBe('Meera Joshi')
    expect(people[0].how_i_know).toBe('School friend')
    expect(people[0].deleted).toBe(false)

    const photos = await db.photos.toArray()
    expect(photos.length).toBe(1)
    expect(photos[0].person_id).toBe(people[0].id)
    expect(photos[0].mime).toBe('image/jpeg')
    expect(shrinkImage).toHaveBeenCalled()

    unmount()
  })

  it('saves a related-to link as a relationship', async () => {
    const existing = await createPerson({
      full_name: 'Anil Joshi',
      display_name: 'Anil',
      nicknames: [],
      phones: [],
      gender: 'male',
      is_me: false,
    })

    const { container, unmount } = await renderAdd()

    await setInputValue(container, 'full_name', 'Meera Joshi')
    const select = container.querySelector('select') as HTMLSelectElement
    await act(async () => {
      select.value = existing.id
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await act(async () => {
      buttonByText(container, 'Save')?.click()
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const relationships = await db.relationships.toArray()
    expect(relationships.length).toBe(1)
    expect(relationships[0].type).toBe('other')
    expect(relationships[0].relative_id).toBe(existing.id)

    unmount()
  })

  it('resets the form when "Save and add another" is tapped', async () => {
    const { container, unmount } = await renderAdd()

    await setInputValue(container, 'full_name', 'Meera Joshi')
    await setInputValue(container, 'how_i_know', 'School friend')
    await pickPhoto(container)

    await act(async () => {
      buttonByText(container, 'Save and add another')?.click()
    })
    // save() runs async (IndexedDB + shrinker) and then resets the form.
    // Poll inside act so React's state updates are flushed before asserting.
    await act(async () => {
      await new Promise<void>((resolve) => {
        let attempts = 0
        const poll = () => {
          const input = container.querySelector(
            'input[name="full_name"]',
          ) as HTMLInputElement
          if (input.value === '' || attempts++ > 100) {
            resolve()
          } else {
            setTimeout(poll, 0)
          }
        }
        poll()
      })
    })

    const nameInput = container.querySelector('input[name="full_name"]') as HTMLInputElement
    expect(nameInput.value).toBe('')
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput.value).toBe('')

    const people = await db.people.toArray()
    expect(people.length).toBe(1)

    unmount()
  })
})


  it('disables save until a name is entered', async () => {
    const { container, unmount } = await renderAdd()

    expect(buttonByText(container, 'Save')?.disabled).toBe(true)

    await setInputValue(container, 'full_name', 'Meera Joshi')

    expect(buttonByText(container, 'Save')?.disabled).toBe(false)

    unmount()
  })
