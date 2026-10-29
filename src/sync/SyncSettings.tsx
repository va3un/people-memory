// Appendix B setup stays disabled until a public key, App-folder confirmation, OAuth and typed enablement exist.
import { useEffect, useState } from 'react'
import { clientConfig, saveClient, disconnect } from './store'
import { startAuthorization } from './auth'
import { status } from './status'
import { enableSync, pauseSync, createSnapshot } from './recovery'
import { syncNow } from './engine'
import { safeMessage } from './http'
import { RecoveryPanel } from './RecoveryPanel'
import { useLiveData } from '../lib/useLiveData'
import { useUnsavedDraft } from '../lib/useUnsavedDraft'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
export function SyncSettings() {
  const { data: value, error: loadError } = useLiveData(status),
    { data: config } = useLiveData(clientConfig)
  const [appKey, setAppKey] = useState<string>(),
    [confirmed, setConfirmed] = useState(false),
    [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  useEffect(() => {
    if (config) setAppKey((current) => current ?? config.appKey)
  }, [config])
  useUnsavedDraft((appKey !== undefined && appKey !== config?.appKey) || !!confirmation)
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
    } catch (cause) {
      setError(safeMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  const auth = value?.auth
  return (
    <section className="mt-6" aria-label="Dropbox sync">
      <h2 className="section-label">Dropbox sync</h2>
      <Card className="mt-2 p-4 space-y-3">
        <p>
          Optional, App-folder-only sync. Local and Dropbox records/photos are unencrypted. Use
          fictional data until real-data safety checks pass. Disconnected devices show only their
          local directory.
        </p>
        <p>
          Live Dropbox setup and service verification have not been completed by this code change.
          Appendix B is required. Keep downloaded backups even after connecting.
        </p>
        {loadError && <p role="alert">Could not read sync status. Local data was kept.</p>}
        {!auth && (
          <fieldset disabled={busy} className="space-y-3 min-w-0">
            <Input
              name="dropbox_app_key"
              label="Dropbox public App key (not a secret)"
              value={appKey ?? ''}
              onChange={(e) => setAppKey(e.target.value)}
              maxLength={80}
            />
            <p>
              Appendix B: src/config.ts → DROPBOX_APP_KEY may supply this public key. Redirect
              addresses must match the app URL exactly and http://localhost:5173 for local testing.
              No App secret is used.
            </p>
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I completed Appendix B with Scoped access, App folder, files.content.read and
              files.content.write, and no payment method.
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  void run(async () => {
                    await saveClient(appKey ?? '', confirmed)
                    setMessage('Public App key saved. No data was sent.')
                  })
                }
              >
                Save Dropbox setup
              </Button>
              <Button
                disabled={!config?.confirmed || !config.appKey || appKey !== config.appKey}
                onClick={() => void run(async () => location.assign(await startAuthorization()))}
              >
                Connect Dropbox
              </Button>
            </div>
          </fieldset>
        )}
        {auth && (
          <>
            <p className="break-words">
              Connected as Dropbox account {auth.account}. Display name is unavailable with the two
              Appendix B file scopes; no additional account-info permission is requested.
            </p>
            <p>
              {auth.enabled
                ? 'Sync enabled.'
                : 'Uploads paused. Prepare recovery and explicitly enable this account before any directory sync.'}
            </p>
            <p>
              Last successful complete sync:{' '}
              {value.state?.lastSuccess
                ? new Date(value.state.lastSuccess).toLocaleString()
                : 'Never'}
              . This is not a guarantee that later edits are uploaded.
            </p>
            <p>
              Unsynced record changes: {value.unsynced ?? 'checking'}.{' '}
              {value.state?.pending ? 'A sync or retry is pending.' : ''}
            </p>
            {value.state?.error && <p role="alert">{value.state.error}</p>}
            {!auth.enabled && (
              <div className="space-y-3">
                <p>
                  Before the first sync, a full recoverable snapshot is saved inside this browser.
                  Download a JSON backup from Backup now or the recovery snapshots below. Enabling
                  can send all local records/photos to this account; a different account gets a
                  separate baseline and recovery history. Different Me IDs are never silently
                  combined.
                </p>
                <Button
                  disabled={busy}
                  variant="secondary"
                  onClick={() =>
                    void run(async () => {
                      await createSnapshot(auth)
                      setMessage(
                        'Local recovery snapshot is ready. Download it below and keep it outside the browser.',
                      )
                    })
                  }
                >
                  Prepare local recovery snapshot
                </Button>
                <Input
                  name="sync_confirmation"
                  label="Type SYNC to enable this account"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
                <Button
                  disabled={busy || confirmation !== 'SYNC'}
                  onClick={() =>
                    void run(async () => {
                      await enableSync(auth, confirmation)
                      setConfirmation('')
                      setMessage(
                        'Sync enabled for this account. Watch the successful-sync status before trusting the remote copy.',
                      )
                    })
                  }
                >
                  Enable Dropbox sync
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || !auth.enabled} onClick={() => void run(() => syncNow())}>
                Sync now
              </Button>
              <Button
                disabled={!auth.enabled}
                variant="secondary"
                onClick={() => void run(() => pauseSync(auth))}
              >
                Pause sync
              </Button>
              <Button variant="secondary" onClick={() => void run(() => disconnect())}>
                Disconnect Dropbox
              </Button>
            </div>
          </>
        )}
        {value?.notice && !auth?.enabled && <p role="status">{value.notice}</p>}
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
        {busy && (
          <p role="status">
            Working with Dropbox. Directory changes remain local until the successful-sync status
            confirms publication.
          </p>
        )}
        <RecoveryPanel />
      </Card>
    </section>
  )
}
