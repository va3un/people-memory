// Replacement requires proof of a fresh, fully saved JSON backup plus an exact typed confirmation.
import { useRef, useState } from 'react'
import type { ImportPreview } from '../../backup/import'
import { prepareSafetyBackup } from '../../backup/import'
import { downloadFile, verifyBackupDownload, type BackupDownload } from '../../backup/downloads'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function ReplacementGuard({
  preview,
  disabled,
  confirmation,
  onConfirmation,
  onVerified,
}: {
  preview: ImportPreview
  disabled: boolean
  confirmation: string
  onConfirmation: (text: string) => void
  onVerified: (backup?: BackupDownload) => void
}) {
  const [backup, setBackup] = useState<BackupDownload>()
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  return (
    <div className="space-y-3 rounded-2xl border border-danger p-3">
      <p className="font-semibold text-danger">
        Replace removes the current people, photos, contexts, links and capture history, then
        restores the file. Device settings stay on this device. An empty file dataset will remove
        all current records.
      </p>
      <Button
        disabled={disabled || busy}
        variant="secondary"
        onClick={() => {
          if (lock.current) return
          lock.current = true
          setBusy(true)
          setError('')
          setVerified(false)
          onVerified(undefined)
          void prepareSafetyBackup(preview)
            .then((next) => {
              downloadFile(next.blob, next.filename)
              setBackup(next)
            })
            .catch((cause) =>
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Could not create a safety backup. Replacement is blocked.',
              ),
            )
            .finally(() => {
              lock.current = false
              setBusy(false)
            })
        }}
      >
        Download safety backup
      </Button>
      {backup && (
        <label className="block">
          Verify safety backup by choosing the downloaded file
          <input
            className="mt-2 min-h-12 w-full"
            type="file"
            accept=".json,application/json"
            aria-label="Verify safety backup"
            disabled={disabled || busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file || lock.current) return
              lock.current = true
              setBusy(true)
              setError('')
              setVerified(false)
              onVerified(undefined)
              void verifyBackupDownload(backup, file)
                .then(() => {
                  setVerified(true)
                  onVerified(backup)
                })
                .catch((cause) =>
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : 'Could not verify the downloaded backup.',
                  ),
                )
                .finally(() => {
                  lock.current = false
                  setBusy(false)
                })
            }}
          />
        </label>
      )}
      {busy && <p role="status">Preparing or verifying safety backup…</p>}
      {verified && <p role="status">Safety backup verified. Keep the downloaded file.</p>}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <Input
        name="replace_confirmation"
        label="Type REPLACE to confirm"
        value={confirmation}
        disabled={disabled || busy || !verified}
        autoComplete="off"
        onChange={(event) => onConfirmation(event.target.value)}
      />
    </div>
  )
}
