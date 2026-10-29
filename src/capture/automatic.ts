// Every request needs explicit consent and an unchanged saved configuration; drafting also needs a passed Test.
import { liveQuery } from 'dexie'
import { readProviderSettings, validateProvider, setProviderVerified } from './providerSettings'
import { sendProvider } from './providerTransport'
import { ProviderError } from './providerError'
import { buildPrompt } from './prompt'
import { readSurnameSetting } from './settings'
import { parseCapture } from './schema'
export const AUTOMATIC_NOTICE =
  "Your passage may contain other people's information. It will be sent to the selected AI provider and may be used to improve its models under its terms. Your saved directory is not sent."
export const TEST_PASSAGE =
  'Fictional Test Person is my friend. This is a fictional connectivity test.'
let active = false
export async function automaticCapture(
  passage: string,
  purpose: 'test' | 'draft',
  revision: string,
  signal?: AbortSignal,
) {
  if (active)
    throw new ProviderError(
      'settings',
      'A provider request is already running. Wait or cancel it; no second request was sent.',
    )
  active = true
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort)
  const timer = window.setTimeout(abort, 45_000)
  let subscription: ReturnType<ReturnType<typeof liveQuery>['subscribe']> | undefined
  try {
    if (signal?.aborted) controller.abort()
    const settings = await readProviderSettings()
    validateProvider(settings)
    if (settings.revision !== revision || !settings.consented)
      throw new ProviderError(
        'settings',
        'Consent or saved provider settings changed. Review the current settings first. Nothing was sent.',
      )
    if (purpose === 'draft' && !settings.verified)
      throw new ProviderError(
        'settings',
        'Automatic capture needs a successful provider Test in Settings first. Copy and paste remains available.',
      )
    if (purpose === 'test' && passage !== TEST_PASSAGE)
      throw new ProviderError(
        'settings',
        'Provider Test accepts only the fixed fictional test passage.',
      )
    const surname = purpose === 'draft' ? await readSurnameSetting() : false
    const prompt = buildPrompt(passage, surname)
    subscription = liveQuery(readProviderSettings).subscribe({
      next: (current) => {
        if (current.revision !== revision || !current.enabled || !current.consented)
          controller.abort()
      },
      error: abort,
    })
    const latest = await readProviderSettings()
    if (latest.revision !== revision || !latest.enabled || !latest.consented)
      throw new ProviderError('settings', 'Permission changed before sending. Nothing was sent.')
    if (controller.signal.aborted)
      throw new ProviderError('cancelled', 'Request cancelled before sending. Nothing was sent.')
    const answer = await sendProvider(settings, prompt, controller.signal)
    if (controller.signal.aborted)
      throw new ProviderError('cancelled', 'Request cancelled. No draft was applied.')
    const current = await readProviderSettings()
    if (current.revision !== revision || !current.enabled || !current.consented)
      throw new ProviderError(
        'settings',
        'Provider settings changed during the request. Its answer was discarded.',
      )
    let draft
    try {
      if (answer.includes(settings.apiKey)) throw new Error()
      draft = parseCapture(answer)
      if (JSON.stringify(draft).includes(settings.apiKey)) throw new Error()
    } catch {
      throw new ProviderError(
        'response',
        'The provider returned invalid capture JSON. Use copy and paste to correct an answer. Nothing was saved.',
      )
    }
    if (controller.signal.aborted)
      throw new ProviderError('cancelled', 'Request cancelled. No draft was applied.')
    if (purpose === 'test') await setProviderVerified(revision, true)
    return { answer, draft, surname }
  } catch (error) {
    if (error instanceof ProviderError && ['blocked', 'auth', 'model'].includes(error.kind)) {
      try {
        await setProviderVerified(revision, false)
      } catch {
        /* Never restore or overwrite a changed configuration. */
      }
    }
    if (controller.signal.aborted)
      throw new ProviderError(
        'cancelled',
        'Request cancelled, timed out or permission was revoked. No draft was applied. Use copy and paste.',
      )
    if (error instanceof ProviderError) throw error
    // Storage/browser exceptions may contain credentials; surface only fixed application text.
    throw new ProviderError(
      'settings',
      'Could not use these settings. Check the free key, model and permission in Settings, or use copy and paste.',
    )
  } finally {
    subscription?.unsubscribe()
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
    active = false
  }
}
