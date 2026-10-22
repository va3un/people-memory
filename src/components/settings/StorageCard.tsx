// Shows whether the browser has promised to keep this app's data.
// Browsers can clear site data, so we ask and then show the answer plainly.
import { useCallback, useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { formatBytes, getStorageEstimate, getStorageStatus, requestPersistentStorage } from '../../lib/storage'
import type { StorageStatus } from '../../lib/storage'

const STATE_TEXT: Record<StorageStatus['state'], string> = {
  granted: 'Kept by the browser',
  denied: 'Not guaranteed',
  unsupported: 'Not available in this browser',
}

export function StorageCard() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [used, setUsed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [current, estimate] = await Promise.all([getStorageStatus(), getStorageEstimate()])
    setStatus(current)
    setUsed(estimate && estimate.quota > 0 ? `${formatBytes(estimate.usage)} of ${formatBytes(estimate.quota)}` : null)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const askBrowser = async () => {
    setBusy(true)
    try {
      const next = await requestPersistentStorage()
      setStatus(next)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mt-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">Storage</p>
          <p className="mt-0.5 text-sm text-muted">
            {status ? STATE_TEXT[status.state] : 'Checking...'}
          </p>
          {status ? <p className="mt-1 text-xs text-muted">{status.message}</p> : null}
          {used ? <p className="mt-1 text-xs text-muted">Space used: {used}</p> : null}
        </div>
        {status?.persisted ? null : (
          <Button variant="secondary" size="sm" onClick={askBrowser} disabled={busy}>
            Keep my data
          </Button>
        )}
      </div>
    </Card>
  )
}
