import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SUPABASE_AUTH_SESSION_KEY,
  clearSupabaseAuthSession,
  readSupabaseAuthSession,
  refreshSupabaseAuthSession,
  signInSupabaseEditor,
  updateSupabaseEditorPassword,
} from '../src/supabaseAuth.js'

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial))

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
  }
}

const env = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
}

function authPayload(overrides = {}) {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: 123,
    user: {
      email: 'editor@example.com',
      app_metadata: { role: 'cms_editor' },
      ...overrides.user,
    },
    ...overrides,
  }
}

test('stores a Supabase editor session after role-authorized sign-in', async () => {
  const storage = createStorage()
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return Response.json(authPayload())
  }

  const result = await signInSupabaseEditor('editor@example.com', 'secret', { env, storage, fetchImpl })

  assert.equal(result.ok, true)
  assert.equal(readSupabaseAuthSession(storage).accessToken, 'access-token')
  assert.equal(calls[0].url, 'https://example.supabase.co/auth/v1/token?grant_type=password')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    email: 'editor@example.com',
    password: 'secret',
  })
})

test('rejects Supabase users without the cms_editor app metadata role', async () => {
  const storage = createStorage({
    [SUPABASE_AUTH_SESSION_KEY]: JSON.stringify({ accessToken: 'old', user: { email: 'old@example.com' } }),
  })
  const fetchImpl = async () => Response.json(authPayload({ user: { app_metadata: { role: 'member' } } }))

  const result = await signInSupabaseEditor('member@example.com', 'secret', { env, storage, fetchImpl })

  assert.equal(result.ok, false)
  assert.match(result.error, /not allowed/i)
  assert.equal(storage.getItem(SUPABASE_AUTH_SESSION_KEY), null)
})

test('updates a Supabase editor password after verifying the current password', async () => {
  const storage = createStorage({
    [SUPABASE_AUTH_SESSION_KEY]: JSON.stringify(authPayload().user
      ? { accessToken: 'existing-token', user: authPayload().user }
      : {}),
  })
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/auth/v1/token?grant_type=password')) return Response.json(authPayload())
    return Response.json({ user: authPayload().user })
  }

  const result = await updateSupabaseEditorPassword('old-password', 'new-password', 'new-password', {
    env,
    storage,
    fetchImpl,
  })

  assert.equal(result.ok, true)
  assert.equal(calls.length, 2)
  assert.equal(calls[1].url, 'https://example.supabase.co/auth/v1/user')
  assert.equal(calls[1].options.headers.Authorization, 'Bearer access-token')
  assert.deepEqual(JSON.parse(calls[1].options.body), { password: 'new-password' })
})

test('refreshes expired Supabase editor sessions', async () => {
  const storage = createStorage({
    [SUPABASE_AUTH_SESSION_KEY]: JSON.stringify({
      accessToken: 'expired-token',
      refreshToken: 'refresh-token',
      expiresAt: 1,
      user: { email: 'editor@example.com', app_metadata: { role: 'cms_editor' } },
    }),
  })
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return Response.json(authPayload({ access_token: 'fresh-token' }))
  }

  const session = await refreshSupabaseAuthSession({ env, storage, fetchImpl })

  assert.equal(session.accessToken, 'fresh-token')
  assert.equal(readSupabaseAuthSession(storage).accessToken, 'fresh-token')
  assert.equal(calls[0].url, 'https://example.supabase.co/auth/v1/token?grant_type=refresh_token')
  assert.deepEqual(JSON.parse(calls[0].options.body), { refresh_token: 'refresh-token' })
})

test('does not refresh fresh Supabase editor sessions', async () => {
  const storage = createStorage({
    [SUPABASE_AUTH_SESSION_KEY]: JSON.stringify({
      accessToken: 'fresh-token',
      refreshToken: 'refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: { email: 'editor@example.com', app_metadata: { role: 'cms_editor' } },
    }),
  })
  let called = false
  const fetchImpl = async () => {
    called = true
    return Response.json(authPayload())
  }

  const session = await refreshSupabaseAuthSession({ env, storage, fetchImpl })

  assert.equal(session.accessToken, 'fresh-token')
  assert.equal(called, false)
})

test('clears Supabase editor sessions', () => {
  const storage = createStorage({
    [SUPABASE_AUTH_SESSION_KEY]: JSON.stringify({ accessToken: 'token', user: { email: 'editor@example.com' } }),
  })

  clearSupabaseAuthSession(storage)

  assert.equal(readSupabaseAuthSession(storage), null)
})
