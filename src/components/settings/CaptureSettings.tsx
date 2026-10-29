// Surname suggestions are optional, visibly assumed and require review-time opt-in.
import { useEffect, useRef, useState } from 'react'
import { readSurnameSetting, saveSurnameSetting } from '../../capture/settings'
import { useLiveData } from '../../lib/useLiveData'
import { Card } from '../ui/Card'
export function CaptureSettings() {
  const { data: enabled, error: loadError } = useLiveData(readSurnameSetting)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [pending, setPending] = useState<boolean>()
  const lock = useRef(false)
  useEffect(() => setPending(undefined), [enabled])
  return (
    <section className="mt-6">
      <h2 className="section-label">Smart capture</h2>
      <Card className="mt-2 p-4 space-y-3">
        <p>
          Copy and paste mode works without a provider or API key. No directory data is included in
          the prompt.
        </p>
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            checked={pending ?? enabled === true}
            disabled={busy || enabled === undefined}
            onChange={(e) => {
              if (lock.current) return
              lock.current = true
              setPending(e.target.checked)
              setBusy(true)
              setError('')
              void saveSurnameSetting(e.target.checked)
                .catch(() => {
                  setPending(undefined)
                  setError('Could not save this preference.')
                })
                .finally(() => {
                  lock.current = false
                  setBusy(false)
                })
            }}
          />
          Suggest a spouse surname and possible maiden name (default off)
        </label>
        <p>
          Marriage does not establish a name change or maiden name. Suggestions stay guessed and
          require explicit review; children never receive an inferred surname.
        </p>
        {(error || loadError) && <p role="alert">{error || loadError}</p>}
      </Card>
    </section>
  )
}
