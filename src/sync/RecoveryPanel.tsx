// Recovery UI preserves every variant and exports full first-sync snapshots without device credentials.
import { useState } from 'react'
import { conflicts, recoverySnapshots, archiveConflict, recoverConflict } from './recovery'
import { useLiveData } from '../lib/useLiveData'
import { downloadFile } from '../backup/downloads'
import { Button } from '../components/ui/Button'
export function RecoveryPanel() {
  const { data: copies } = useLiveData(conflicts),
    { data: snapshots } = useLiveData(recoverySnapshots)
  const [archived, setArchived] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const act = async (action: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await action()
    } catch {
      setError(
        'Recovery could not be applied safely. The record may have changed; download both versions and review manually. Current data was kept.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-4 space-y-3">
      <h3 className="font-semibold">
        Review sync conflicts ({copies?.filter((c) => !c.value.resolved).length ?? 0})
      </h3>
      <p>
        Conflicting edits and deletions are preserved on this device. Review both versions; recovery
        never forces an overwrite of a later edit. Recovery copies are device-local and excluded
        from ordinary exports, so download them separately.
      </p>
      <label className="flex min-h-12 items-center gap-3">
        <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
        Show archived recovery copies
      </label>
      {error && <p role="alert">{error}</p>}
      {copies
        ?.filter((c) => archived || !c.value.resolved)
        .map((copy) => (
          <details key={copy.key} className="rounded-2xl border p-3">
            <summary className="min-h-12 cursor-pointer break-words">
              {copy.value.table}:{' '}
              {String(copy.value.winner.full_name ?? copy.value.winner.name ?? copy.value.id)}
            </summary>
            <p className="break-words">Account context: {copy.value.account}</p>
            <p>Active version</p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words">
              {JSON.stringify(
                {
                  ...copy.value.winner,
                  ...(copy.value.table === 'photos'
                    ? { data: 'Photo bytes are retained in the download and recovery copy.' }
                    : {}),
                },
                null,
                2,
              )}
            </pre>
            <p>Other preserved version (including any deletion)</p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words">
              {JSON.stringify(
                {
                  ...copy.value.loser,
                  ...(copy.value.table === 'photos'
                    ? { data: 'Photo bytes are retained in the download and recovery copy.' }
                    : {}),
                },
                null,
                2,
              )}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                variant="secondary"
                onClick={() => void act(() => archiveConflict(copy.key))}
              >
                Keep active version
              </Button>
              <Button
                disabled={busy}
                variant="secondary"
                onClick={() => void act(() => recoverConflict(copy.key))}
              >
                Recover other version
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  downloadFile(
                    new Blob(
                      [
                        JSON.stringify(
                          { format: 'people-memory-sync-conflict', schema: 1, ...copy.value },
                          null,
                          2,
                        ),
                      ],
                      { type: 'application/json' },
                    ),
                    'people-sync-conflict.json',
                  )
                }
              >
                Download both versions
              </Button>
            </div>
          </details>
        ))}
      <h3 className="font-semibold">First-sync recovery snapshots</h3>
      {snapshots?.map((snapshot) => (
        <Button
          key={snapshot.key}
          variant="secondary"
          onClick={() =>
            downloadFile(
              new Blob([JSON.stringify(snapshot.value, null, 2)], { type: 'application/json' }),
              'people-before-first-sync.json',
            )
          }
        >
          Download pre-sync JSON backup ({new Date(snapshot.value.exported_at).toLocaleDateString()}
          )
        </Button>
      ))}
    </div>
  )
}
