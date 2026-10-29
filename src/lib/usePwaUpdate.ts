import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { showToast } from '../components/ui/Toast'

// Watches for a new app version and offers a tap to refresh.
export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    updateSWRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onOfflineReady() {
        showToast({ message: 'People is ready to work offline' })
      },
    })

    return () => {
      updateSWRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!needRefresh) return

    showToast({
      message: 'Update ready, tap to refresh',
      duration: Infinity,
      description: 'A new version of People is ready.',
      action: {
        label: 'Refresh',
        onClick: (event) => {
          // Keep the offer available if the user retains a draft or activation fails.
          event?.preventDefault()
          if (
            document.querySelector('[data-unsaved]') &&
            !window.confirm('Refresh and discard your unsaved changes?')
          )
            return
          // Activates the waiting service worker, then reloads onto the new version.
          void updateSWRef.current?.(true).catch(() => {
            showToast({
              message:
                'Could not update. Your saved records are kept. Reopen the app and try again.',
            })
          })
        },
      },
    })
  }, [needRefresh])

  return { needRefresh }
}
