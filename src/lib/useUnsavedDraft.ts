// Warn before leaving a draft through reload, browser close, or an app navigation link.
import { useEffect } from 'react'

export function useUnsavedDraft(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!link || link.href === window.location.href || link.target === '_blank') return
      if (link.hasAttribute('download') && link.href.startsWith('blob:')) return
      if (!window.confirm('Leave this page and discard your unsaved changes?')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', click, true)
    return () => {
      window.removeEventListener('beforeunload', unload)
      document.removeEventListener('click', click, true)
    }
  }, [dirty])
}
