// First launch collects a fictional Me profile and optional contexts without resetting any data.
import { useRef, useState } from 'react'
import { SyncSettings } from '../sync/SyncSettings'
import { ImportPanel } from '../components/backup/ImportPanel'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ContextPicker } from '../components/contexts/ContextPicker'
import { createMe } from '../db/me'
import { listContexts, type ContextChoice } from '../db/contexts'
import { useLiveData } from '../lib/useLiveData'
import { useUnsavedDraft } from '../lib/useUnsavedDraft'

export function MeSetupPage() {
  const [name, setName] = useState('')
  const [choices, setChoices] = useState<ContextChoice[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const { data: contexts } = useLiveData(listContexts)
  useUnsavedDraft(!!name || choices.length > 0)
  const save = async () => {
    if (busyRef.current || !name.trim()) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await createMe(name, choices)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not finish setup. Your draft is still here.',
      )
      busyRef.current = false
      setBusy(false)
    }
  }
  return (
    <main className="page mx-auto w-full max-w-md py-6">
      <h1 className="page-title">About you</h1>
      <p className="mt-3">
        Create your Me profile. Existing people, photos and links will be kept.
      </p>
      <p className="mt-3 text-muted">
        Use a fictional name and fictional contexts for testing. Data is unencrypted on this device;
        JSON backups are available in Settings after setup. Optional Dropbox recovery below requires
        Appendix B setup.
      </p>
      <form
        className="mt-5 space-y-4"
        data-unsaved={!!name || choices.length > 0 || undefined}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
          <Input
            name="me_name"
            label="Your name (fictional for testing)"
            placeholder="Fictional Me"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <h2 className="font-semibold">Your contexts (optional)</h2>
          <p>
            Schools, colleges, workplaces or societies help describe how you know people. You can
            skip this and add them later from your profile.
          </p>
          <ul>
            {choices.map((choice, index) => (
              <li key={index} className="my-2 rounded-2xl border p-3">
                <p>
                  {choice.draft?.name ??
                    contexts?.find((c) => c.id === choice.contextId)?.name ??
                    'Selected context'}
                  {choice.role ? ` (${choice.role})` : ''}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setChoices((rows) => rows.filter((_, i) => i !== index))}
                >
                  Remove context {index + 1}
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={() => setPickerOpen(true)}>
            Add a context (optional)
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Saving…' : 'Continue'}
          </Button>
        </fieldset>
      </form>
      <details className="mt-6 rounded-2xl border p-4">
        <summary className="min-h-12 cursor-pointer font-semibold">Restore a JSON backup</summary>
        <p>
          Restore your directory before creating a new Me profile. Use a fictional backup for
          testing.
        </p>
        <ImportPanel />
      </details>
      <details className="mt-6 rounded-2xl border p-4">
        <summary className="min-h-12 cursor-pointer font-semibold">
          Connect Dropbox for recovery
        </summary>
        <p>
          On a new device, restore the existing Me profile and directory before creating another Me.
          Appendix B setup is required.
        </p>
        <SyncSettings />
      </details>
      {pickerOpen && (
        <ContextPicker
          onChoose={(choice) => setChoices((rows) => [...rows, choice])}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </main>
  )
}
