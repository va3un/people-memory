// Import validates and previews before writes, and keeps the selected file available for a safe retry.
import { useEffect, useRef, useState } from 'react'
import { applyImport, previewImport, type ImportPreview } from '../../backup/import'
import type { BackupDownload } from '../../backup/downloads'
import { useUnsavedDraft } from '../../lib/useUnsavedDraft'
import { Button } from '../ui/Button'
import { ImportSummary } from './ImportSummary'
import { ReplacementGuard } from './ReplacementGuard'

export function ImportPanel() {
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<ImportPreview>()
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [confirmation, setConfirmation] = useState('')
  const [backup, setBackup] = useState<BackupDownload>()
  const [duplicatesReviewed, setDuplicatesReviewed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const controller = useRef<AbortController | null>(null)
  const lock = useRef(false)
  useUnsavedDraft(!!preview)
  useEffect(() => () => controller.current?.abort(), [])
  const inspect = async (selected: File) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    setPreview(undefined)
    setMode('merge')
    setConfirmation('')
    setBackup(undefined)
    setDuplicatesReviewed(false)
    controller.current = new AbortController()
    try {
      setPreview(await previewImport(selected, controller.current.signal))
      setFile(selected)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not preview this file. No records were changed.',
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const save = async () => {
    if (lock.current || !preview) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    controller.current = new AbortController()
    try {
      await applyImport(preview, {
        mode,
        confirmation,
        backup,
        duplicatesReviewed,
        signal: controller.current.signal,
      })
      setPreview(undefined)
      setFile(undefined)
      setBackup(undefined)
      setConfirmation('')
      setMessage(
        'Import complete. All selected tables committed together. Device settings were kept. Create a new JSON backup after importing.',
      )
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Import failed. The transaction was rolled back.',
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const blocked =
    busy ||
    !preview ||
    (mode === 'merge' && !!preview.mergeProblem) ||
    (mode === 'replace' && (!backup || confirmation !== 'REPLACE')) ||
    (!!preview.possibleDuplicates.length && !duplicatesReviewed)
  return (
    <div className="mt-5 space-y-3 border-t pt-4" data-unsaved={!!preview || busy || undefined}>
      <h3 className="font-semibold">Import JSON</h3>
      <p>
        Choose a full People JSON backup (up to 64 MB). CSV ZIP and vCard files cannot restore the
        full directory. Previewing or cancelling never changes records.
      </p>
      <label className="block">
        Backup file
        <input
          className="mt-2 min-h-12 w-full"
          type="file"
          accept=".json,application/json"
          aria-label="Import JSON file"
          disabled={busy}
          onChange={(event) => {
            const selected = event.target.files?.[0]
            event.target.value = ''
            if (selected) void inspect(selected)
          }}
        />
      </label>
      {busy && (
        <p role="status">Validating or importing. Do not close the app until this finishes.</p>
      )}
      <Button
        id="cancel-import"
        variant="secondary"
        disabled={!busy && !preview}
        onClick={() => {
          if (busy) controller.current?.abort()
          else {
            setPreview(undefined)
            setFile(undefined)
            setBackup(undefined)
            setConfirmation('')
            setMessage('Import preview cancelled. No records were changed.')
          }
        }}
      >
        {busy ? 'Cancel operation' : 'Cancel preview'}
      </Button>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {preview && (
        <>
          <ImportSummary preview={preview} />
          <fieldset disabled={busy} className="space-y-2">
            <legend className="font-semibold">Import mode</legend>
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="radio"
                name="import_mode"
                checked={mode === 'merge'}
                onChange={() => {
                  setMode('merge')
                  setConfirmation('')
                  setBackup(undefined)
                }}
              />
              Merge (keep existing versions)
            </label>
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="radio"
                name="import_mode"
                checked={mode === 'replace'}
                onChange={() => {
                  setMode('replace')
                  setConfirmation('')
                  setBackup(undefined)
                }}
              />
              Replace (restore the file's dataset)
            </label>
          </fieldset>
          {mode === 'merge' && preview.mergeProblem && (
            <p role="alert" className="text-danger">
              Merge blocked: {preview.mergeProblem} No records have changed. Replacement still
              requires a verified safety backup.
            </p>
          )}
          {!!preview.possibleDuplicates.length && (
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                disabled={busy}
                checked={duplicatesReviewed}
                onChange={(event) => setDuplicatesReviewed(event.target.checked)}
              />
              I reviewed the possible duplicate names and understand that merge keeps different IDs
              separate.
            </label>
          )}
          {mode === 'replace' && (
            <ReplacementGuard
              key={mode}
              preview={preview}
              disabled={busy}
              confirmation={confirmation}
              onConfirmation={setConfirmation}
              onVerified={setBackup}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button id="apply-import" disabled={blocked} onClick={() => void save()}>
              Import now
            </Button>
            <Button
              variant="secondary"
              disabled={busy || !file}
              onClick={() => {
                if (file) void inspect(file)
              }}
            >
              Refresh preview
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
