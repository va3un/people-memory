import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { showToast } from '../components/ui/Toast'

// Watches for a new app version and offers a tap to refresh.
export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onOfflineReady() {
        showToast({ message: 'People is ready to work offline' })
      },
    })

    return () => {
      void updateSW
    }
  }, [])

  useEffect(() => {
    if (!needRefresh) return

    showToast({
      message: 'Update ready, tap to refresh',
      description: 'A new version of People is ready.',
      action: {
        label: 'Refresh',
        onClick: () => window.location.reload(),
      },
    })
  }, [needRefresh])

  return { needRefresh }
}
