// Fixed HTTPS endpoints, header-only secrets, bounded responses and no retries or paid fallback routes.
import type { ProviderSettings } from './providerSettings'
export const RESPONSE_LIMIT = 512 * 1024
import { ProviderError, statusError } from './providerError'
async function boundedJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > RESPONSE_LIMIT) {
    await response.body?.cancel()
    throw new ProviderError(
      'response',
      'The provider answer was too large. Use a shorter passage or copy and paste.',
    )
  }
  if (!response.body)
    throw new ProviderError(
      'response',
      'The provider returned an empty response. Use copy and paste.',
    )
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > RESPONSE_LIMIT)
        throw new ProviderError(
          'response',
          'The provider answer was too large. Use a shorter passage or copy and paste.',
        )
      chunks.push(value)
    }
  } catch (error) {
    try {
      await reader.cancel()
    } catch {
      /* Abort may have already closed the stream. */
    }
    throw error
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new ProviderError(
      'response',
      'The provider returned bad JSON. Use copy and paste; nothing was saved.',
    )
  }
}
export async function sendProvider(
  settings: ProviderSettings,
  prompt: string,
  signal: AbortSignal,
): Promise<string> {
  const gemini = settings.provider === 'gemini'
  const url = gemini
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model.replace(/^models\//, ''))}:generateContent`
    : 'https://openrouter.ai/api/v1/chat/completions'
  const body = gemini
    ? {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }
    : {
        model: settings.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8192,
        stream: false,
        provider: { allow_fallbacks: false },
      }
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: gemini
        ? { 'Content-Type': 'application/json', 'x-goog-api-key': settings.apiKey }
        : { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
      body: JSON.stringify(body),
      signal,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
      mode: 'cors',
    })
  } catch {
    if (signal.aborted)
      throw new ProviderError(
        'cancelled',
        'Request cancelled or timed out. Nothing was saved; no automatic retry was made.',
      )
    throw new ProviderError(
      'blocked',
      'Browser, network or provider blocked the request. Use copy and paste. Test again when access is available.',
    )
  }
  try {
    if (!response.ok) {
      try {
        await response.body?.cancel()
      } catch {
        /* Never read or echo provider error bodies. */
      }
      throw statusError(response.status)
    }
    const data = (await boundedJson(response)) as {
      error?: { code?: number }
      choices?: { message?: { content?: unknown }; finish_reason?: string }[]
      candidates?: {
        content?: { parts?: { text?: unknown; thought?: boolean }[] }
        finishReason?: string
      }[]
    }
    if (!data || typeof data !== 'object')
      throw new ProviderError('response', 'The provider returned bad JSON. Use copy and paste.')
    if (data.error) throw statusError(typeof data.error.code === 'number' ? data.error.code : 503)
    let text: unknown
    if (gemini) {
      const candidate = data.candidates?.[0]
      if (candidate?.finishReason !== 'STOP')
        throw new ProviderError(
          'response',
          'The provider blocked or truncated the answer. Use a shorter passage or copy and paste.',
        )
      text = candidate.content?.parts
        ?.filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join('')
    } else {
      const choice = data.choices?.[0]
      if (choice?.finish_reason !== 'stop')
        throw new ProviderError(
          'response',
          'The provider blocked or truncated the answer. Use a shorter passage or copy and paste.',
        )
      text = choice.message?.content
    }
    if (typeof text !== 'string' || !text.trim())
      throw new ProviderError(
        'response',
        'The provider returned no usable text. Use copy and paste.',
      )
    return text
  } catch (error) {
    if (error instanceof ProviderError) throw error
    throw new ProviderError(
      'response',
      'Could not read the provider response. Use copy and paste; nothing was saved.',
    )
  }
}
