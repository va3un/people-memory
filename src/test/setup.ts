// Test setup file. Keeps the test environment predictable.
import { afterEach } from 'vitest'
import 'fake-indexeddb/auto'

// Tells React that this environment supports act(...), so the warning disappears.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  // Nothing global to clean up yet. Storage helpers are added in later phases.
  document.body.innerHTML = ''
})

// jsdom does not implement matchMedia; real browsers supply OS theme and viewport queries.
window.matchMedia = (media: string) => ({
  media,
  matches: false,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
})
