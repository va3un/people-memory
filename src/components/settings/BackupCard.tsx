// Full backups stay visible even with Dropbox connected; only a verified saved JSON file resets the reminder.
import { Card } from '../ui/Card'
import { ExportPanel } from '../backup/ExportPanel'
import { ImportPanel } from '../backup/ImportPanel'
import { readBackupStatus, backupOverdue } from '../../backup/downloads'
import { useLiveData } from '../../lib/useLiveData'

export function BackupCard() {
  const { data: status, error } = useLiveData(readBackupStatus)
  return (
    <section className="mt-6" aria-label="Backup and restore">
      <h2 className="section-label">Backup and restore</h2>
      <Card className="mt-2 space-y-4 p-4">
        <p>
          Data and downloaded backups are unencrypted. Keep backup files private. Device settings,
          API keys and Dropbox tokens are never exported or imported.
        </p>
        <p>
          A local browser database is not a downloaded backup. Keep a verified JSON file outside
          this browser, even if Dropbox is connected.
        </p>
        {error && <p role="alert">Could not read backup status.</p>}
        {status === undefined && !error && <p role="status">Checking backup status…</p>}
        {status && (
          <p>
            Last verified backup snapshot: {new Date(status.exported_at).toLocaleString()}. Later
            changes are not included.
          </p>
        )}
        {status !== undefined && backupOverdue(status ?? null) && (
          <p role="status" className="rounded-xl bg-accent-soft p-3">
            {status
              ? 'Your last verified backup is over 30 days old or its date cannot be confirmed.'
              : 'No downloaded JSON backup has been verified yet.'}{' '}
            Backup now and verify the downloaded file.
          </p>
        )}
        <ExportPanel />
        <ImportPanel />
      </Card>
    </section>
  )
}
