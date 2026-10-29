// PKCE grants offline access without an App secret; state is single-use, expiring and bound to this browser's settings.
import { db } from '../db/database'
import { newId } from '../db/records'
import { clientConfig, AUTH, PENDING, getSetting, putSetting, type Auth } from './store'
import { SyncError } from './http'
import { exchangeToken } from './tokens'
const scopes = 'files.content.read files.content.write'
type Pending = {
  state: string
  verifier: string
  redirect: string
  appKey: string
  expires: number
  claimed: boolean
}
function random() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}
export function redirectUri() {
  return location.hostname === 'localhost' && location.port === '5173'
    ? location.origin
    : location.origin + location.pathname
}
export async function startAuthorization(redirect = redirectUri()) {
  const config = await clientConfig()
  if (!config.confirmed || !/^[a-zA-Z0-9]{8,80}$/.test(config.appKey))
    throw new SyncError(
      'auth',
      'Appendix B App folder setup and public App key are required. Live sync is disabled.',
    )
  const uri = new URL(redirect)
  if (
    uri.hash ||
    uri.search ||
    (uri.protocol !== 'https:' &&
      !(uri.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(uri.hostname)))
  )
    throw new SyncError(
      'auth',
      'Use the exact HTTPS app address or localhost redirect from Appendix B.',
    )
  const verifier = random(),
    state = random(),
    digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
    )
  const challenge = btoa(String.fromCharCode(...digest))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  await putSetting(PENDING, {
    state,
    verifier,
    redirect,
    appKey: config.appKey,
    expires: Date.now() + 600_000,
    claimed: false,
  } satisfies Pending)
  const url = new URL('https://www.dropbox.com/oauth2/authorize')
  for (const [key, value] of Object.entries({
    client_id: config.appKey,
    response_type: 'code',
    redirect_uri: redirect,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
    scope: scopes,
    force_reapprove: 'true',
  }))
    url.searchParams.set(key, value)
  return url.href
}
export async function finishAuthorization(callback: string) {
  const url = new URL(callback),
    params = url.searchParams
  if (params.has('error')) {
    await db.transaction('rw', db.deviceSettings, async () => {
      const pending = await getSetting<Pending>(PENDING)
      if (pending && pending.state === params.get('state')) await db.deviceSettings.delete(PENDING)
    })
    throw new SyncError('auth', 'Dropbox sign-in was cancelled or denied. Local data was kept.')
  }
  if (params.getAll('state').length !== 1 || params.getAll('code').length !== 1)
    throw new SyncError('auth', 'Invalid Dropbox callback. Start sign-in again.')
  const pending = await db.transaction('rw', db.deviceSettings, async () => {
    const p = await getSetting<Pending>(PENDING),
      config = await clientConfig()
    if (
      !p ||
      p.claimed ||
      p.expires < Date.now() ||
      p.state !== params.get('state') ||
      new URL(p.redirect).origin + new URL(p.redirect).pathname !== url.origin + url.pathname ||
      config.appKey !== p.appKey ||
      !config.confirmed
    )
      throw new SyncError(
        'auth',
        'Expired or mismatched Dropbox state. Start sign-in again; nothing was connected.',
      )
    await putSetting(PENDING, { ...p, claimed: true })
    return p
  })
  try {
    const value = await exchangeToken(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.get('code')!,
        client_id: pending.appKey,
        code_verifier: pending.verifier,
        redirect_uri: pending.redirect,
      }),
    )
    if (
      typeof value.refresh_token !== 'string' ||
      !/^[\x21-\x7e]{1,8192}$/.test(value.refresh_token) ||
      typeof value.account_id !== 'string' ||
      !/^dbid:[A-Za-z0-9_-]{1,150}$/.test(value.account_id) ||
      value.account_id.includes(value.refresh_token) ||
      value.account_id.includes(value.access_token) ||
      !scopes.split(' ').every((s) =>
        String(value.scope ?? '')
          .split(' ')
          .includes(s),
      )
    )
      throw new SyncError(
        'auth',
        'Dropbox did not grant the required offline App folder permissions. Check Appendix B and sign in again.',
      )
    await db.transaction('rw', db.deviceSettings, async () => {
      const current = await getSetting<Pending>(PENDING),
        config = await clientConfig()
      if (
        current?.state !== pending.state ||
        !current.claimed ||
        config.appKey !== pending.appKey ||
        !config.confirmed
      )
        throw new SyncError(
          'auth',
          'Dropbox sign-in was revoked while waiting. Nothing was connected.',
        )
      await putSetting(AUTH, {
        generation: newId(),
        appKey: pending.appKey,
        account: value.account_id,
        access: value.access_token,
        refresh: value.refresh_token,
        expires: Date.now() + value.expires_in * 1000,
        enabled: false,
      } satisfies Auth)
      await db.deviceSettings.delete(PENDING)
    })
    return value.account_id as string
  } finally {
    await db.transaction('rw', db.deviceSettings, async () => {
      if ((await getSetting<Pending>(PENDING))?.state === pending.state)
        await db.deviceSettings.delete(PENDING)
    })
  }
}
