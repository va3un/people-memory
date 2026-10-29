// Provider failures expose only fixed app messages, never server bodies, credentials or passages.
export class ProviderError extends Error {
  constructor(
    public kind: 'blocked' | 'quota' | 'model' | 'auth' | 'response' | 'cancelled' | 'settings',
    message: string,
  ) {
    super(message)
  }
}
export function statusError(status: number): ProviderError {
  if (status === 429 || status === 402)
    return new ProviderError(
      'quota',
      'Free quota or availability is exhausted. Wait for a reset or use copy and paste. Do not add credit or upgrade.',
    )
  if (status === 401 || status === 403)
    return new ProviderError(
      'auth',
      'The free API key or project permission was rejected. Check the saved key and free-tier access; use copy and paste meanwhile.',
    )
  if (status === 400 || status === 404 || status === 422)
    return new ProviderError(
      'model',
      'The model was not found, is unavailable on the free tier, or rejected the request. Check its current model ID, then Test again. Use copy and paste meanwhile.',
    )
  return new ProviderError(
    'blocked',
    'The provider is unavailable or blocked this request. Use copy and paste and try Test later.',
  )
}
