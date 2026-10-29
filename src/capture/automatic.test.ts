// Fictional provider replies exercise consent, free-only requests, failure recovery and credential isolation.
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { DATA_TABLES, validateBackup } from '../backup/schema'
import {
  defaults,
  readProviderSettings,
  saveProviderSettings,
  acceptProviderConsent,
  forgetProvider,
  PROVIDER_KEY,
} from './providerSettings'
import { automaticCapture, TEST_PASSAGE } from './automatic'
import { RESPONSE_LIMIT } from './providerTransport'
import golden from '../test/captureGolden.json'
const key = 'fictional-provider-secret-only'
const input = {
  enabled: true,
  provider: 'openrouter' as const,
  model: 'fictional/test:free',
  apiKey: key,
  freeAccountConfirmed: true,
}
const reply = (content = JSON.stringify(golden)) => ({
  choices: [{ message: { content }, finish_reason: 'stop' }],
})
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
beforeEach(async () => {
  await Promise.all([...DATA_TABLES.map((t) => db.table(t).clear()), db.deviceSettings.clear()])
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response(reply())),
  )
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
async function configured(consent = true) {
  await saveProviderSettings(input, '')
  const saved = await readProviderSettings()
  if (consent) await acceptProviderConsent(saved.revision)
  return saved.revision
}
async function testPassed() {
  const revision = await configured()
  await automaticCapture(TEST_PASSAGE, 'test', revision)
  vi.mocked(fetch).mockClear()
  return revision
}
async function directory() {
  return Object.fromEntries(
    await Promise.all(DATA_TABLES.map(async (t) => [t, await db.table(t).toArray()])),
  )
}
it('starts off with no key and makes no request for absent/disabled settings', async () => {
  expect(await readProviderSettings()).toEqual(defaults)
  await expect(automaticCapture(TEST_PASSAGE, 'test', '')).rejects.toThrow('copy and paste')
  expect(fetch).not.toHaveBeenCalled()
})
it('rejects missing keys, paid models, unsafe identifiers and unconfirmed free accounts without sending', async () => {
  for (const change of [
    { apiKey: '' },
    { model: 'vendor/paid' },
    { model: 'vendor/test:FREE' },
    { model: 'vendor/free:online' },
    { model: 'https://evil.invalid/key' },
    { model: 'vendor/x:free?key=oops' },
    { freeAccountConfirmed: false },
    { apiKey: 'secret\nheader' },
    { model: 'vendor/' + key + ':free' },
  ])
    await expect(saveProviderSettings({ ...input, ...change }, '')).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
  expect(await readProviderSettings()).toEqual(defaults)
})
it('requires explicit consent before Test and a passed Test before drafting', async () => {
  const revision = await configured(false)
  await expect(automaticCapture(TEST_PASSAGE, 'test', revision)).rejects.toThrow('Consent')
  await acceptProviderConsent(revision)
  await expect(automaticCapture('Fictional text', 'draft', revision)).rejects.toThrow(
    'successful provider Test',
  )
  expect(fetch).not.toHaveBeenCalled()
})
it('Test sends only a fixed fictional extraction prompt and marks only device metadata, not records', async () => {
  const revision = await configured(),
    before = await directory()
  const result = await automaticCapture(TEST_PASSAGE, 'test', revision)
  expect(result.draft.people).toHaveLength(3)
  expect(await directory()).toEqual(before)
  expect((await readProviderSettings()).verified).toBe(true)
  const [url, options] = vi.mocked(fetch).mock.calls[0]
  expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
  expect(String(url)).not.toContain(key)
  expect(options?.body).not.toContain(key)
  expect(options?.headers).toEqual({
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + key,
  })
  const body = JSON.parse(String(options?.body))
  expect(body.model).toBe(input.model)
  expect(body).not.toHaveProperty('models')
  expect(body.provider.allow_fallbacks).toBe(false)
  expect(body.messages[0].content).toContain(TEST_PASSAGE)
  expect(options).toMatchObject({
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    redirect: 'error',
    mode: 'cors',
  })
  await expect(automaticCapture('Arbitrary private text', 'test', revision)).rejects.toThrow(
    'fixed fictional',
  )
})
it('draft payload is only passage and instructions, never Me, directory, keys or device settings', async () => {
  const revision = await testPassed()
  await db.people.put({
    id: crypto.randomUUID(),
    full_name: 'Fictional Hidden Directory',
    display_name: 'Fictional',
    phones: [],
    nicknames: [],
    gender: 'unknown',
    is_me: true,
    deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  await automaticCapture('Sanket Bobhate is fictional.', 'draft', revision)
  const body = String(vi.mocked(fetch).mock.calls[0][1]?.body)
  expect(body).toContain('Sanket Bobhate')
  expect(body).not.toContain('Fictional Hidden Directory')
  expect(body).not.toContain(key)
  expect(body).not.toContain('deviceSettings')
})
it('Gemini uses its fixed endpoint and key header, strips model prefix, and ignores thought text', async () => {
  await saveProviderSettings(
    { ...input, provider: 'gemini', model: 'models/gemini-fictional-free' },
    '',
  )
  const revision = (await readProviderSettings()).revision
  await acceptProviderConsent(revision)
  vi.mocked(fetch).mockResolvedValue(
    response({
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [{ text: 'private reasoning', thought: true }, { text: JSON.stringify(golden) }],
          },
        },
      ],
    }),
  )
  await automaticCapture(TEST_PASSAGE, 'test', revision)
  const [url, options] = vi.mocked(fetch).mock.calls[0]
  expect(url).toBe(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-fictional-free:generateContent',
  )
  expect(String(url)).not.toContain(key)
  expect(options?.headers).toEqual({ 'Content-Type': 'application/json', 'x-goog-api-key': key })
  expect(JSON.parse(String(options?.body))).not.toHaveProperty('tools')
})
it.each([
  [429, 'quota'],
  [402, 'quota'],
  [401, 'key'],
  [403, 'permission'],
  [404, 'model'],
  [400, 'model'],
  [422, 'model'],
  [503, 'unavailable'],
])(
  'maps HTTP %s to safe error containing %s with copy/paste and no retries',
  async (status, word) => {
    const revision = await testPassed(),
      before = await directory()
    vi.mocked(fetch).mockResolvedValue(
      response({ error: { message: key + ' echoed private passage' } }, status as number),
    )
    let message = ''
    try {
      await automaticCapture('Fictional passage', 'draft', revision)
    } catch (error) {
      message = (error as Error).message
    }
    expect(message.toLowerCase()).toContain(word)
    expect(message).toContain('copy and paste')
    expect(message).not.toContain(key)
    expect(message).not.toContain('echoed')
    expect(fetch).toHaveBeenCalledOnce()
    expect(await directory()).toEqual(before)
    if ([400, 401, 403, 404, 422, 503].includes(status as number))
      expect((await readProviderSettings()).verified).toBe(false)
  },
)
it('network/CORS failure invalidates verification, sanitizes browser errors and keeps copy/paste available', async () => {
  const revision = await testPassed()
  vi.mocked(fetch).mockRejectedValue(new TypeError('blocked ' + key))
  await expect(automaticCapture('Fictional text', 'draft', revision)).rejects.toThrow(
    'Use copy and paste',
  )
  expect((await readProviderSettings()).verified).toBe(false)
  expect(fetch).toHaveBeenCalledOnce()
})
it.each([
  'not capture JSON',
  '{"schema":9}',
  JSON.stringify({ ...golden, relationships: [{ a: 'missing', b: 'ME', type: 'friend' }] }),
])('refuses malformed capture answer %s and never verifies or writes records', async (answer) => {
  const revision = await configured(),
    before = await directory()
  vi.mocked(fetch).mockResolvedValue(response(reply(answer)))
  await expect(automaticCapture(TEST_PASSAGE, 'test', revision)).rejects.toThrow(
    'invalid capture JSON',
  )
  expect((await readProviderSettings()).verified).toBe(false)
  expect(await directory()).toEqual(before)
})
it('rejects bad envelopes, in-band errors, empty or truncated replies and malformed UTF-8 without raw messages', async () => {
  const revision = await configured()
  for (const body of [
    null,
    {},
    reply(''),
    { error: { code: 429, message: key } },
    { choices: [{ message: { content: JSON.stringify(golden) }, finish_reason: 'length' }] },
  ]) {
    vi.mocked(fetch).mockResolvedValue(response(body))
    await expect(automaticCapture(TEST_PASSAGE, 'test', revision)).rejects.toThrow()
  }
  vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array([0xff, 0xff])))
  await expect(automaticCapture(TEST_PASSAGE, 'test', revision)).rejects.toThrow('bad JSON')
})
it('bounds advertised and streamed response size plus extracted answer size', async () => {
  const revision = await configured()
  vi.mocked(fetch).mockResolvedValue(
    new Response('{}', { headers: { 'content-length': String(RESPONSE_LIMIT + 1) } }),
  )
  await expect(automaticCapture(TEST_PASSAGE, 'test', revision)).rejects.toThrow('too large')
  const cancelled = vi.fn()
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(RESPONSE_LIMIT + 1))
        },
        cancel: cancelled,
      }),
    ),
  )
  await expect(automaticCapture(TEST_PASSAGE, 'test', revision)).rejects.toThrow('too large')
  expect(cancelled).toHaveBeenCalled()
  vi.mocked(fetch).mockResolvedValue(response(reply('x'.repeat(262145))))
  await expect(automaticCapture(TEST_PASSAGE, 'test', revision)).rejects.toThrow(
    'invalid capture JSON',
  )
})
it('configuration changes revoke consent and verification, stale writes cannot replace another tab’s key', async () => {
  const revision = await testPassed(),
    next = { ...input, model: 'fictional/other:free' }
  await saveProviderSettings(next, revision)
  expect((await readProviderSettings()).consented).toBe(false)
  expect((await readProviderSettings()).verified).toBe(false)
  await expect(saveProviderSettings(input, revision)).rejects.toThrow('changed')
  await expect(acceptProviderConsent(revision)).rejects.toThrow('changed')
  expect(fetch).not.toHaveBeenCalled()
})
it('cancellation before sending makes no request; cancellation during a request discards a late answer', async () => {
  const revision = await configured(),
    before = new AbortController()
  before.abort()
  await expect(automaticCapture(TEST_PASSAGE, 'test', revision, before.signal)).rejects.toThrow(
    'cancelled',
  )
  expect(fetch).not.toHaveBeenCalled()
  let complete!: (value: Response) => void
  vi.mocked(fetch).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve
      }),
  )
  const during = new AbortController(),
    pending = automaticCapture(TEST_PASSAGE, 'test', revision, during.signal)
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  during.abort()
  complete(response(reply()))
  await expect(pending).rejects.toThrow('cancelled')
  expect((await readProviderSettings()).verified).toBe(false)
})
it('45-second timeout aborts the only request without retry', async () => {
  const revision = await configured()
  const timer = vi.spyOn(window, 'setTimeout')
  vi.mocked(fetch).mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options?.signal?.addEventListener('abort', () => reject(new Error(key))),
      ),
  )
  const pending = automaticCapture(TEST_PASSAGE, 'test', revision)
  const assertion = expect(pending).rejects.toThrow('timed out')
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  const expire = timer.mock.calls.find((call) => call[1] === 45_000)![0]
  ;(expire as () => void)()
  await assertion
  expect(fetch).toHaveBeenCalledOnce()
  expect((await readProviderSettings()).verified).toBe(false)
})
it('revoking/removing settings during a pending request discards its response and never recreates the key', async () => {
  const revision = await configured()
  let complete!: (value: Response) => void
  vi.mocked(fetch).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve
      }),
  )
  const pending = automaticCapture(TEST_PASSAGE, 'test', revision)
  const assertion = expect(pending).rejects.toThrow()
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  await forgetProvider(revision)
  complete(response(reply()))
  await assertion
  expect(await db.deviceSettings.get(PROVIDER_KEY)).toBeUndefined()
})
it('duplicate actions cannot send another request while the first is pending', async () => {
  const revision = await configured()
  let complete!: (value: Response) => void
  vi.mocked(fetch).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve
      }),
  )
  const first = automaticCapture(TEST_PASSAGE, 'test', revision)
  await expect(automaticCapture(TEST_PASSAGE, 'test', revision)).rejects.toThrow('already running')
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  complete(response(reply()))
  await first
})
it('provider secrets/permissions never enter full backups and incoming device settings remain invalid', async () => {
  await configured()
  const tables = await directory()
  const backup = validateBackup({
    format: 'people-memory',
    schema: 1,
    exported_at: new Date().toISOString(),
    tables,
  })
  expect(JSON.stringify(backup)).not.toContain(key)
  expect(JSON.stringify(backup)).not.toContain(PROVIDER_KEY)
  expect(() =>
    validateBackup({ ...backup, deviceSettings: [{ key: PROVIDER_KEY, value: input }] }),
  ).toThrow()
})
it('never exposes a reflected API key even inside an otherwise valid or escaped capture answer', async () => {
  const revision = await configured()
  for (const escaped of [false, true]) {
    const content = JSON.stringify({ ...golden, uncertain: [key] })
    vi.mocked(fetch).mockResolvedValue(
      response(reply(escaped ? content.replaceAll('fictional', '\\u0066ictional') : content)),
    )
    try {
      await automaticCapture(TEST_PASSAGE, 'test', revision)
      expect.unreachable()
    } catch (error) {
      expect((error as Error).message).toContain('invalid capture JSON')
      expect((error as Error).message).not.toContain(key)
    }
  }
  expect((await readProviderSettings()).verified).toBe(false)
})
it('a failed verification write keeps automatic drafting unavailable and exposes no storage exception or key', async () => {
  const revision = await configured(),
    fail = () => {
      throw new Error('storage error containing ' + key)
    }
  db.deviceSettings.hook('updating', fail)
  try {
    await expect(automaticCapture(TEST_PASSAGE, 'test', revision)).rejects.toThrow(
      'Could not use these settings',
    )
  } finally {
    db.deviceSettings.hook('updating').unsubscribe(fail)
  }
  expect((await readProviderSettings()).verified).toBe(false)
  await expect(automaticCapture('Fictional text', 'draft', revision)).rejects.toThrow(
    'successful provider Test',
  )
  expect(fetch).toHaveBeenCalledOnce()
})
