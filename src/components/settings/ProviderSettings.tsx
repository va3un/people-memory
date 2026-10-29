// Optional free-provider setup masks keys, guards stale edits and never sends a request on save.
import { ProviderError } from '../../capture/providerError'
import { useEffect, useState } from 'react'
import {
  defaults,
  readProviderSettings,
  saveProviderSettings,
  forgetProvider,
  type ProviderSettings as Settings,
} from '../../capture/providerSettings'
import { useLiveData } from '../../lib/useLiveData'
import { useUnsavedDraft } from '../../lib/useUnsavedDraft'
import { AutomaticAction } from '../capture/AutomaticAction'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
const fields = ['enabled', 'provider', 'model', 'apiKey', 'freeAccountConfirmed'] as const
export function ProviderSettings() {
  const { data: saved, error: loadError } = useLiveData(readProviderSettings)
  const [draft, setDraft] = useState<Settings>(),
    [busy, setBusy] = useState(false),
    [requestBusy, setRequestBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  useEffect(() => {
    if (saved) setDraft((current) => current ?? { ...saved })
  }, [saved])
  const dirty = !!draft && !!saved && fields.some((key) => draft[key] !== saved[key]),
    stale = !!draft && draft.revision !== saved?.revision
  useUnsavedDraft(dirty || requestBusy)
  const update = (values: Partial<Settings>) => setDraft((current) => ({ ...current!, ...values }))
  const save = async (clear = false) => {
    if (busy || !draft) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (clear) await forgetProvider(draft.revision)
      else await saveProviderSettings(draft, draft.revision)
      setDraft(await readProviderSettings())
      setMessage(
        clear
          ? 'Provider key and permission removed. Automatic mode is off.'
          : 'Provider settings saved. Permission and successful Test are required for these settings.',
      )
    } catch (cause) {
      setError(
        cause instanceof ProviderError
          ? cause.message
          : 'Could not save provider settings. Your draft is kept; try again or reload saved settings.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="mt-6" aria-label="Automatic provider settings">
      <h2 className="section-label">Optional automatic capture</h2>
      <Card className="mt-2 p-4 space-y-3" data-unsaved={dirty || requestBusy || undefined}>
        <p>
          Copy and paste always works without a key. Automatic capture is off by default and
          requires a free key, a model you choose, explicit permission and a successful Test.
          Nothing is sent just by opening or saving settings.
        </p>
        <p>
          Keys stay unencrypted in this device's browser settings. They are excluded from
          JSON/CSV/vCard exports and sync. Do not add a payment method, buy credits or link billing.
          Remove the key here to revoke this app's permission.
        </p>
        {loadError && (
          <p role="alert">Could not read provider settings. Copy and paste remains available.</p>
        )}
        {!draft && <p role="status">Loading provider settings…</p>}
        {draft && (
          <fieldset disabled={busy || requestBusy} className="min-w-0 space-y-3">
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
              />
              Enable optional automatic capture
            </label>
            <label className="block">
              AI provider
              <select
                aria-label="AI provider"
                className="min-h-12 w-full rounded-xl border bg-surface p-2"
                value={draft.provider}
                onChange={(e) =>
                  update({
                    provider: e.target.value as Settings['provider'],
                    model: '',
                    apiKey: '',
                    freeAccountConfirmed: false,
                  })
                }
              >
                <option value="openrouter">OpenRouter</option>
                <option value="gemini">Gemini</option>
              </select>
            </label>
            <Input
              name="capture_api_key"
              label="API key (device only)"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft.apiKey}
              maxLength={4096}
              onChange={(e) => update({ apiKey: e.target.value })}
            />
            <Input
              name="capture_model"
              label="Model name"
              autoComplete="off"
              spellCheck={false}
              value={draft.model}
              maxLength={150}
              onChange={(e) => update({ model: e.target.value })}
            />
            <p>
              {draft.provider === 'openrouter'
                ? 'Use a current free model ID ending in :free, or openrouter/free. Other models and paid fallbacks are refused.'
                : 'Choose a Gemini model with free-tier access in your region/project. This app cannot inspect or guarantee your billing status. Billing must remain disabled.'}
            </p>
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={draft.freeAccountConfirmed}
                onChange={(e) => update({ freeAccountConfirmed: e.target.checked })}
              />
              I use a free account with no payment method, purchased credits or linked billing, and
              a model available free to this account.
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void save()}>Save provider settings</Button>
              <Button variant="secondary" onClick={() => void save(true)}>
                Remove provider key and permission
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft({ ...(saved ?? defaults) })
                  setError('')
                  setMessage('Saved settings reloaded. Unsaved changes were discarded.')
                }}
              >
                Reload saved provider settings
              </Button>
            </div>
          </fieldset>
        )}
        {stale && (
          <p role="alert">
            Saved provider settings changed in another operation. Reload before saving or testing.
          </p>
        )}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <p>
          {saved?.enabled
            ? saved.verified
              ? 'The saved settings passed a provider Test.'
              : 'Provider not verified. Copy and paste is available; Test must pass before Draft it.'
            : 'Automatic mode is off.'}
        </p>
        {(dirty || stale) && (
          <p>
            Save or reload your settings before Test. Test sends only a fixed fictional passage,
            never your directory.
          </p>
        )}
        <AutomaticAction
          purpose="test"
          disabled={busy || dirty || stale || !draft}
          onBusy={setRequestBusy}
        />
      </Card>
    </section>
  )
}
