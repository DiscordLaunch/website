export const SUPABASE_AUTH_SESSION_KEY = 'divine.supabase.auth.v1'
export const CMS_EDITOR_ROLE = 'cms_editor'

function normalizeSupabaseUrl(value) {
  return String(value || '').replace(/\/$/, '')
}

export function hasSupabaseAuthConfig(env = {}) {
  return Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
}

export function getSupabaseConfig(env = {}) {
  if (!hasSupabaseAuthConfig(env)) return null

  return {
    url: normalizeSupabaseUrl(env.VITE_SUPABASE_URL),
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  }
}

function getBrowserStorage(name) {
  return typeof window === 'undefined' ? null : window[name]
}

function getFetch(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable.')
  return fetchImpl.bind(globalThis)
}

function parseStoredSession(value) {
  if (!value) return null
  try {
    const session = JSON.parse(value)
    return session?.accessToken && session?.user?.email ? session : null
  } catch {
    return null
  }
}

export function readSupabaseAuthSession(storage = getBrowserStorage('localStorage')) {
  return parseStoredSession(storage?.getItem(SUPABASE_AUTH_SESSION_KEY))
}

export function writeSupabaseAuthSession(session, storage = getBrowserStorage('localStorage')) {
  if (!storage) return
  storage.setItem(SUPABASE_AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSupabaseAuthSession(storage = getBrowserStorage('localStorage')) {
  storage?.removeItem(SUPABASE_AUTH_SESSION_KEY)
}

export function isCmsEditorSession(session) {
  return session?.user?.app_metadata?.role === CMS_EDITOR_ROLE
}

function isSessionFresh(session, nowSeconds = Math.floor(Date.now() / 1000)) {
  return !session?.expiresAt || session.expiresAt - 60 > nowSeconds
}

async function parseAuthResponse(response) {
  let payload
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (response.ok) return payload

  const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || `Supabase Auth request failed with ${response.status}`
  throw new Error(message)
}

function toStoredSession(payload) {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || '',
    expiresAt: payload.expires_at || 0,
    user: payload.user,
  }
}

export async function signInSupabaseEditor(email, password, {
  env = import.meta.env,
  storage = getBrowserStorage('localStorage'),
  fetchImpl = globalThis.fetch,
} = {}) {
  const config = getSupabaseConfig(env)
  if (!config) return { ok: false, error: 'Supabase is not configured.' }

  try {
    const response = await getFetch(fetchImpl)(`${config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: String(email || '').trim(), password }),
    })
    const payload = await parseAuthResponse(response)
    const session = toStoredSession(payload)

    if (!isCmsEditorSession(session)) {
      clearSupabaseAuthSession(storage)
      return { ok: false, error: 'This account is not allowed to edit the CMS.' }
    }

    writeSupabaseAuthSession(session, storage)
    return { ok: true, session }
  } catch (error) {
    clearSupabaseAuthSession(storage)
    return { ok: false, error: error.message || 'Unable to sign in.' }
  }
}

export async function refreshSupabaseAuthSession({
  env = import.meta.env,
  storage = getBrowserStorage('localStorage'),
  fetchImpl = globalThis.fetch,
} = {}) {
  const config = getSupabaseConfig(env)
  const session = readSupabaseAuthSession(storage)
  if (!config || !session?.refreshToken) return session
  if (isSessionFresh(session)) return session

  try {
    const response = await getFetch(fetchImpl)(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    })
    const payload = await parseAuthResponse(response)
    const refreshed = toStoredSession(payload)
    if (!isCmsEditorSession(refreshed)) {
      clearSupabaseAuthSession(storage)
      return null
    }

    writeSupabaseAuthSession(refreshed, storage)
    return refreshed
  } catch {
    clearSupabaseAuthSession(storage)
    return null
  }
}

export async function updateSupabaseEditorPassword(currentPassword, newPassword, confirmPassword, {
  env = import.meta.env,
  storage = getBrowserStorage('localStorage'),
  fetchImpl = globalThis.fetch,
} = {}) {
  const config = getSupabaseConfig(env)
  const session = readSupabaseAuthSession(storage)
  const normalizedNew = String(newPassword || '').trim()
  const normalizedConfirm = String(confirmPassword || '').trim()

  if (!config) return { ok: false, error: 'Supabase is not configured.' }
  if (!session) return { ok: false, error: 'Sign in again before changing your password.' }
  if (!normalizedNew) return { ok: false, error: 'Enter a new password.' }
  if (normalizedNew !== normalizedConfirm) return { ok: false, error: 'Passwords do not match.' }

  const verified = await signInSupabaseEditor(session.user.email, currentPassword, { env, storage, fetchImpl })
  if (!verified.ok) return { ok: false, error: 'Current password is incorrect.' }

  try {
    const response = await getFetch(fetchImpl)(`${config.url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${verified.session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: normalizedNew }),
    })
    await parseAuthResponse(response)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error.message || 'Unable to update password.' }
  }
}
