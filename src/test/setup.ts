// Test setup file. Keeps the test environment predictable.
import { afterEach } from 'vitest'

// Tells React that this environment supports act(...), so the warning disappears.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  // Nothing global to clean up yet. Storage helpers are added in later phases.
  document.body.innerHTML = ''
})
