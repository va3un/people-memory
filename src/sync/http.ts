// Bounded HTTPS requests use fixed Dropbox origins and replace every remote error with a safe app message.
export class SyncError extends Error {
  constructor(
    public kind: 'revision' | 'missing' | 'auth' | 'network' | 'invalid' | 'quota',
    message: string,
  ) {
    super(message)
  }
}
export async function bytes(
  response: Response,
  limit: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel()
    throw new SyncError('invalid', 'Dropbox response exceeds the safe size limit.')
  }
  if (!response.body) throw new SyncError('invalid', 'Dropbox returned an empty response.')
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = []
  let size = 0
  let expire: ReturnType<typeof setTimeout> | undefined
  const abort = () => {
    void reader.cancel().catch(() => {})
  }
  signal?.addEventListener('abort', abort)
  const timeout = new Promise<never>((_resolve, reject) => {
    expire = setTimeout(() => {
      abort()
      reject(new SyncError('network', 'Dropbox download timed out. Local data was kept.'))
    }, 45_000)
  })
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout])
      if (signal?.aborted) throw new SyncError('network', 'Sync cancelled. Local data was kept.')
      if (done) break
      size += value.length
      if (size > limit)
        throw new SyncError('invalid', 'Dropbox response exceeds the safe size limit.')
      chunks.push(value)
    }
  } catch (error) {
    try {
      await reader.cancel()
    } catch {
      /* already aborted */
    }
    throw error instanceof SyncError
      ? error
      : new SyncError(
          'network',
          'Dropbox download was interrupted. Local data was kept; retry later.',
        )
  } finally {
    clearTimeout(expire)
    signal?.removeEventListener('abort', abort)
    reader.releaseLock()
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}
export async function json(
  response: Response,
  limit = 64 * 1024,
  signal?: AbortSignal,
): Promise<any> {
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(await bytes(response, limit, signal)),
    )
  } catch (error) {
    if (error instanceof SyncError) throw error
    throw new SyncError(
      'invalid',
      'Dropbox returned malformed or oversized data. Local records were kept.',
    )
  }
}
export async function request(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController(),
    abort = () => controller.abort()
  signal?.addEventListener('abort', abort)
  if (signal?.aborted) controller.abort()
  const timer = window.setTimeout(abort, 45_000)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      redirect: 'error',
      mode: 'cors',
    })
  } catch {
    throw new SyncError(
      'network',
      'Dropbox is offline, blocked or timed out. Local changes are kept; retry when connected.',
    )
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}
export function safeMessage(error: unknown) {
  return error instanceof SyncError
    ? error.message
    : 'Sync stopped safely. Local data and recovery copies were kept. Check Dropbox setup and retry.'
}
export async function failure(response: Response): Promise<never> {
  if (response.status === 401)
    throw new SyncError('auth', 'Dropbox authorization expired. Sign in again; local data is kept.')
  if (response.status === 409) {
    const value = await json(response)
    const tag = value?.error?.['.tag']
    if (
      tag === 'insufficient_space' ||
      value?.error?.path?.['.tag'] === 'insufficient_space' ||
      value?.error?.reason?.['.tag'] === 'insufficient_space' ||
      value?.error?.path?.reason?.['.tag'] === 'insufficient_space'
    )
      throw new SyncError(
        'quota',
        'Dropbox free storage is full. Local changes are kept. Pause sync or safely free space; do not upgrade or add billing.',
      )
    if (tag === 'path' && value.error.path?.['.tag'] === 'not_found')
      throw new SyncError('missing', 'Dropbox file is missing.')
    throw new SyncError(
      'revision',
      'Dropbox changed during sync. Retry without overwriting another device.',
    )
  }
  if (response.status === 429)
    throw new SyncError(
      'network',
      'Dropbox rate limit reached. Wait and retry; local changes are kept.',
    )
  throw new SyncError(
    'network',
    'Dropbox rejected the request. Check the App folder permissions and retry; local data is kept.',
  )
}
