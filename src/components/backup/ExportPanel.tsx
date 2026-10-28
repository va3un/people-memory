// Export actions never claim that a download was saved until the exact JSON file is reselected.
import { useRef, useState } from 'react'
import { Button } from '../ui/Button'
import {
  prepareBackup,
  verifyBackupDownload,
  downloadFile,
  type BackupDownload,
} from '../../backup/downloads'
import { exportCsvZip, exportVcard } from '../../backup/exports'

export function ExportPanel() {
  const [busy, setBusy] = useState(false)
  const [backup, setBackup] = useState<BackupDownload>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(false)
  const run = async (kind: 'json' | 'csv' | 'vcard') => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (kind === 'json') {
        const next = await prepareBackup()
        downloadFile(next.blob, next.filename)
        setBackup(next)
        setMessage(
          'Download started. Reselect the downloaded JSON file below to verify that it was saved.',
        )
      } else {
        const blob = kind === 'csv' ? await exportCsvZip() : await exportVcard()
        downloadFile(blob, kind === 'csv' ? 'people-csv.zip' : 'people.vcf')
        setMessage(
          'Download started. CSV and vCard are convenience exports; use JSON for full restoration.',
        )
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed. No records were changed.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3">
      <fieldset disabled={busy} className="flex flex-wrap gap-2">
        <Button onClick={() => void run('json')}>Backup now</Button>
        <Button variant="secondary" onClick={() => void run('csv')}>
          Export CSV ZIP
        </Button>
        <Button variant="secondary" onClick={() => void run('vcard')}>
          Export vCard
        </Button>
      </fieldset>
      {busy && <p role="status">Preparing or verifying export…</p>}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {backup && (
        <label className="block">
          Verify downloaded backup
          <input
            className="mt-2 min-h-12 w-full"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            aria-label="Verify downloaded backup"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file || lock.current) return
              lock.current = true
              setBusy(true)
              setError('')
              void verifyBackupDownload(backup, file)
                .then(() => {
                  setMessage(
                    'Downloaded JSON backup verified. Keep this file private and test a restore on fictional data.',
                  )
                  setBackup(undefined)
                })
                .catch((cause) =>
                  setError(cause instanceof Error ? cause.message : 'Backup verification failed.'),
                )
                .finally(() => {
                  lock.current = false
                  setBusy(false)
                })
            }}
          />
        </label>
      )}
    </div>
  )
}
