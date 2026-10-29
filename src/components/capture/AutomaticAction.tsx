// Explicit actions and a provider-specific consent sheet are the only route to external requests.
import { ProviderError } from '../../capture/providerError'
import { useEffect, useRef, useState } from 'react'
import { automaticCapture, AUTOMATIC_NOTICE, TEST_PASSAGE } from '../../capture/automatic'
import {
  acceptProviderConsent,
  readProviderSettings,
  validateProvider,
  type ProviderSettings,
} from '../../capture/providerSettings'
import { resolveCapture, type Review } from '../../capture/resolver'
import { useLiveData } from '../../lib/useLiveData'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
type Intent = { settings: ProviderSettings; passage: string }
export function AutomaticAction({
  purpose,
  passage = '',
  disabled = false,
  onDraft,
  onBusy,
  onFallback,
}: {
  purpose: 'test' | 'draft'
  passage?: string
  disabled?: boolean
  onDraft?: (review: Review, answer: string) => void
  onBusy?: (busy: boolean) => void
  onFallback?: () => void
}) {
  const { data: settings, error: loadError } = useLiveData(readProviderSettings)
  const [busy, setBusy] = useState(false),
    [consent, setConsent] = useState<Intent>(),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const sending = useRef(false)
  const lock = useRef(false),
    controller = useRef<AbortController | null>(null),
    mounted = useRef(true)
  const busyCallback = useRef(onBusy)
  busyCallback.current = onBusy
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      controller.current?.abort()
    }
  }, [])
  const markBusy = (value: boolean) => {
    if (mounted.current) {
      setBusy(value)
      busyCallback.current?.(value)
    }
  }
  const finish = () => {
    lock.current = false
    markBusy(false)
  }
  const send = async (intent: Intent, accept = false) => {
    if (sending.current) return
    sending.current = true
    setConsent(undefined)
    controller.current = new AbortController()
    try {
      if (accept) await acceptProviderConsent(intent.settings.revision)
      if (controller.current.signal.aborted || !mounted.current) return
      const result = await automaticCapture(
        intent.passage,
        purpose,
        intent.settings.revision,
        controller.current.signal,
      )
      if (!mounted.current || controller.current.signal.aborted) return
      if (purpose === 'draft') {
        const review = await resolveCapture(result.draft, intent.passage, result.surname)
        if (!mounted.current || controller.current.signal.aborted) return
        onDraft?.(review, result.answer)
        setMessage('Automatic answer is ready for local review. Nothing was saved.')
      } else
        setMessage(
          'Provider Test passed using only the fictional test passage. No directory records were changed.',
        )
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof ProviderError
            ? cause.message
            : 'Automatic capture failed. Use copy and paste.',
        )
    } finally {
      sending.current = false
      controller.current = null
      finish()
    }
  }
  const begin = async () => {
    if (lock.current || disabled) return
    lock.current = true
    markBusy(true)
    setError('')
    setMessage('')
    try {
      const current = await readProviderSettings()
      validateProvider(current)
      if (purpose === 'draft' && !current.verified)
        throw new ProviderError(
          'settings',
          'Run a successful provider Test in Settings first. Copy and paste remains available.',
        )
      const intent = { settings: current, passage: purpose === 'test' ? TEST_PASSAGE : passage }
      if (!current.consented) setConsent(intent)
      else await send(intent)
    } catch (cause) {
      setError(
        cause instanceof ProviderError
          ? cause.message
          : 'Could not read provider settings. Use copy and paste.',
      )
      finish()
    }
  }
  return (
    <section
      className="my-4 space-y-3 rounded-2xl border p-4"
      aria-label={purpose === 'test' ? 'Provider Test' : 'Automatic capture'}
    >
      {purpose === 'draft' && (
        <>
          <h2 className="font-semibold">Optional automatic capture</h2>
          <p>
            {settings?.enabled
              ? 'Configured provider: ' +
                (settings.provider === 'gemini' ? 'Gemini' : 'OpenRouter') +
                '. ' +
                (settings.verified
                  ? 'Test passed for the saved settings.'
                  : 'Provider Test is required before drafting.')
              : 'Automatic mode is off. Copy and paste below works without a key.'}
          </p>
        </>
      )}
      {loadError && <p role="alert">Could not read provider settings. Use copy and paste.</p>}
      <Button
        disabled={disabled || busy || (purpose === 'draft' && !passage.trim())}
        onClick={() => void begin()}
      >
        {purpose === 'test' ? 'Test' : 'Draft it'}
      </Button>
      {busy && !consent && (
        <>
          <p role="status">
            Waiting for the selected provider. No records will be saved automatically.
          </p>
          <Button variant="secondary" onClick={() => controller.current?.abort()}>
            Cancel request
          </Button>
        </>
      )}
      {error && (
        <div role="alert" className="text-danger">
          <p>{error}</p>
          {purpose === 'test' ? (
            <a className="flex min-h-12 items-center text-accent" href="#/add">
              Use copy and paste
            </a>
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                setError('')
                onFallback?.()
              }}
            >
              Use copy and paste
            </Button>
          )}
        </div>
      )}
      {message && <p role="status">{message}</p>}
      <Sheet
        open={!!consent}
        title="Share with AI provider?"
        onClose={() => {
          setConsent(undefined)
          setMessage('Consent cancelled. Nothing was sent.')
          finish()
        }}
      >
        {consent && (
          <div className="space-y-3">
            <p>{AUTOMATIC_NOTICE}</p>
            <p>
              Selected provider: {consent.settings.provider === 'gemini' ? 'Gemini' : 'OpenRouter'}.
              Model: {consent.settings.model}. Consent applies to these saved settings; changing
              them requires permission again.
            </p>
            <p>Only this passage and extraction instructions will be sent:</p>
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border p-3">
              {consent.passage}
            </p>
            <p>
              Use fictional text only. Free quotas and provider terms apply. Cancel to keep using
              copy and paste.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void send(consent, true)}>
                I agree, send this {purpose === 'test' ? 'fictional test' : 'passage'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setConsent(undefined)
                  setMessage('Consent cancelled. Nothing was sent.')
                  finish()
                }}
              >
                Cancel consent
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  )
}
