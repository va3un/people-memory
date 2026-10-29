// Provider credentials and consent stay only in device settings, never in portable directory records.
import { ProviderError } from './providerError'
import { z } from 'zod'
import { db } from '../db/database'
import { newId } from '../db/records'
export const PROVIDER_KEY = 'capture:automatic'
const settingsSchema = z
  .object({
    version: z.literal(1),
    revision: z.string(),
    enabled: z.boolean(),
    provider: z.enum(['openrouter', 'gemini']),
    model: z.string().max(150),
    apiKey: z.string().max(4096),
    freeAccountConfirmed: z.boolean(),
    consented: z.boolean(),
    verified: z.boolean(),
  })
  .strict()
export type ProviderSettings = z.infer<typeof settingsSchema>
export type ProviderInput = Pick<
  ProviderSettings,
  'enabled' | 'provider' | 'model' | 'apiKey' | 'freeAccountConfirmed'
>
export const defaults: ProviderSettings = {
  version: 1,
  revision: '',
  enabled: false,
  provider: 'openrouter',
  model: '',
  apiKey: '',
  freeAccountConfirmed: false,
  consented: false,
  verified: false,
}
export async function readProviderSettings(): Promise<ProviderSettings> {
  const parsed = settingsSchema.safeParse((await db.deviceSettings.get(PROVIDER_KEY))?.value)
  return parsed.success ? parsed.data : { ...defaults }
}
export function validateProvider(settings: ProviderInput): void {
  if (!settings.enabled)
    throw new ProviderError(
      'settings',
      'Automatic capture is off. Enable and save it in Settings, or use copy and paste without a key.',
    )
  if (!settings.apiKey)
    throw new ProviderError(
      'settings',
      'No API key. Add a free key in Settings, or use copy and paste.',
    )
  if (!/^[\x21-\x7e]{8,4096}$/.test(settings.apiKey))
    throw new ProviderError('settings', 'Invalid API key format. Re-enter the key in Settings.')
  if (!settings.freeAccountConfirmed)
    throw new ProviderError(
      'settings',
      'Confirm a free account with no payment method or linked billing before sending.',
    )
  if (!settings.model || settings.model.includes(settings.apiKey))
    throw new ProviderError(
      'settings',
      'Enter a current free model name in Settings, separate from the API key.',
    )
  if (settings.provider === 'openrouter') {
    if (
      settings.model !== 'openrouter/free' &&
      !/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*:free$/.test(settings.model)
    )
      throw new ProviderError(
        'settings',
        'OpenRouter requires openrouter/free or a model ID ending in :free. Paid models and paid fallbacks are not allowed.',
      )
  } else if (settings.provider === 'gemini') {
    if (!/^(?:models\/)?gemini-[a-z0-9._-]{1,100}$/.test(settings.model))
      throw new ProviderError(
        'settings',
        'Enter a Gemini model ID available on your project’s free tier. Do not enter a URL.',
      )
  } else throw new ProviderError('settings', 'Choose Gemini or OpenRouter.')
}
async function update(
  expected: string,
  change: (current: ProviderSettings) => ProviderSettings | null,
) {
  return db.transaction('rw', db.deviceSettings, async () => {
    const current = await readProviderSettings()
    if (current.revision !== expected)
      throw new ProviderError(
        'settings',
        'Provider settings changed. Reload the saved settings and try again.',
      )
    const next = change(current)
    if (next)
      await db.deviceSettings.put({
        key: PROVIDER_KEY,
        value: next,
        updated_at: new Date().toISOString(),
      })
    else await db.deviceSettings.delete(PROVIDER_KEY)
    return next
  })
}
export async function saveProviderSettings(input: ProviderInput, expected: string): Promise<void> {
  const parsed = settingsSchema.safeParse({
    ...defaults,
    ...input,
    version: 1,
    revision: newId(),
    consented: false,
    verified: false,
  })
  if (!parsed.success)
    throw new ProviderError(
      'settings',
      'Invalid provider settings. Check the fields and try again.',
    )
  const next = {
    ...parsed.data,
    model: parsed.data.model.trim(),
    apiKey: parsed.data.apiKey.trim(),
  }
  if (next.enabled) validateProvider(next)
  await update(expected, () => next)
}
export async function acceptProviderConsent(expected: string): Promise<void> {
  await update(expected, (current) => {
    validateProvider(current)
    return { ...current, consented: true }
  })
}
export async function setProviderVerified(expected: string, verified: boolean): Promise<void> {
  await update(expected, (current) => {
    if (verified && (!current.enabled || !current.consented))
      throw new ProviderError(
        'settings',
        'Provider permission was revoked. Nothing was sent again.',
      )
    return { ...current, verified }
  })
}
export async function forgetProvider(expected: string): Promise<void> {
  await update(expected, () => null)
}
