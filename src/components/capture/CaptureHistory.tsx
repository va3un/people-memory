// Undo stays reachable after navigation/reload; conflicts preserve current data and offer manual review.
import { useRef, useState } from 'react'
import { listCaptureBatches, undoCapture } from '../../capture/undo'
import { useLiveData } from '../../lib/useLiveData'
import { Button } from '../ui/Button'
export function CaptureHistory() {
  const { data: batches, error: loadError } = useLiveData(listCaptureBatches)
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const [conflicts, setConflicts] = useState<string[]>([])
  const lock = useRef(false)
  return (
    <section className="mt-6 space-y-3" aria-label="Capture history">
      <h2 className="font-semibold">Capture history and Undo</h2>
      {loadError && <p role="alert">{loadError}</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!!conflicts.length && (
        <div role="alert" className="rounded-2xl border border-danger p-4 space-y-3">
          <p>
            Undo conflict. Nothing in your directory was changed. Later changes and links are
            protected.
          </p>
          <ul>
            {conflicts.map((conflict, index) => (
              <li key={index} className="break-words">
                {conflict}
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            onClick={() => {
              setConflicts([])
              setMessage('Current data kept. Review the capture manually if needed.')
            }}
          >
            Keep current data
          </Button>
          <a className="flex min-h-12 items-center text-accent" href="#/">
            Review people manually in Search
          </a>
        </div>
      )}
      {!batches?.length && <p>No saved captures yet.</p>}
      {batches?.map((batch) => (
        <details key={batch.id} className="rounded-2xl border bg-surface p-3">
          <summary className="min-h-12 cursor-pointer break-words">
            Capture {new Date(batch.created_at).toLocaleString()} (
            {batch.status.replaceAll('_', ' ')})
          </summary>
          <p className="whitespace-pre-wrap break-words">{batch.raw_text}</p>
          <Button
            disabled={busy || batch.status === 'undone'}
            variant="secondary"
            onClick={() => {
              if (lock.current) return
              lock.current = true
              setBusy(true)
              setMessage('')
              setError('')
              setConflicts([])
              void undoCapture(batch.id)
                .then((result) => {
                  if (result.undone)
                    setMessage(
                      'Capture undone. Created records were soft-deleted and safe fills restored.',
                    )
                  else setConflicts(result.conflicts)
                })
                .catch((cause) =>
                  setError(
                    cause instanceof Error ? cause.message : 'Undo failed. Existing data was kept.',
                  ),
                )
                .finally(() => {
                  lock.current = false
                  setBusy(false)
                })
            }}
          >
            Undo this capture
          </Button>
        </details>
      ))}
    </section>
  )
}
