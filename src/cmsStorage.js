import { refreshSupabaseAuthSession } from './supabaseAuth.js'

export const VISUAL_STORE_KEY = 'divine.visual.page.v1'
export const CMS_CONTENT_TABLE = 'site_content'
export const CMS_CONTENT_ID = 'visual-page'
export const CMS_IMAGE_BUCKET = 'cms-images'
export const MAX_REMOTE_VISUAL_STATE_BYTES = 500_000

export function createEmptyVisualState() {
  return {
    text: {},
    attrs: {},
    attrRefs: [],
    inserts: [],
    rotatingWords: null,
    starRatings: [],
    textRefs: [],
    removals: [],
  }
}

const keyedHeroProofSelectors = new Set([
  '.hero-test-stars',
  '.hero-test-card blockquote',
  '.hero-test-author',
  '.hero-proof-stars',
  '.hero-proof-label',
  '.hero-proof-note',
])

export function normalizeHeroProofState(value = {}) {
  const state = value && typeof value === 'object' ? value : createEmptyVisualState()

  return {
    ...state,
    textRefs: Array.isArray(state.textRefs)
      ? state.textRefs.filter((item) => !keyedHeroProofSelectors.has(item.selector))
      : [],
    starRatings: Array.isArray(state.starRatings)
      ? state.starRatings.filter((item) => !keyedHeroProofSelectors.has(item.selector))
      : [],
  }
}

export function normalizeVisualState(value = {}) {
  const state = value && typeof value === 'object' ? value : {}

  return normalizeHeroProofState({
    text: state.text || {},
    attrs: state.attrs || {},
    attrRefs: Array.isArray(state.attrRefs) ? state.attrRefs : [],
    inserts: Array.isArray(state.inserts) ? state.inserts : [],
    rotatingWords: Array.isArray(state.rotatingWords) ? state.rotatingWords : null,
    starRatings: Array.isArray(state.starRatings) ? state.starRatings : [],
    textRefs: Array.isArray(state.textRefs) ? state.textRefs : [],
    removals: Array.isArray(state.removals) ? state.removals : [],
  })
}

export function getVisualStateByteSize(state) {
  return new TextEncoder().encode(JSON.stringify(normalizeVisualState(state))).byteLength
}

function assertRemoteVisualStateSize(state) {
  const bytes = getVisualStateByteSize(state)
  if (bytes > MAX_REMOTE_VISUAL_STATE_BYTES) {
    throw new Error(`Visual editor state is too large to sync remotely (${bytes} bytes).`)
  }
}

export function readLocalVisualState(storage = window.localStorage) {
  try {
    return normalizeVisualState(JSON.parse(storage.getItem(VISUAL_STORE_KEY)) || {})
  } catch {
    return createEmptyVisualState()
  }
}

export function writeLocalVisualState(state, storage = window.localStorage) {
  storage.setItem(VISUAL_STORE_KEY, JSON.stringify(normalizeVisualState(state)))
}

export function hasSupabaseConfig(env = {}) {
  return Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
}

export async function createSupabaseBrowserClient(env = import.meta.env) {
  if (!hasSupabaseConfig(env)) return null
  const session = await refreshSupabaseAuthSession({ env })

  return {
    url: String(env.VITE_SUPABASE_URL).replace(/\/$/, ''),
    anonKey: env.VITE_SUPABASE_ANON_KEY,
    accessToken: session?.accessToken || '',
    fetch: fetch.bind(globalThis),
  }
}

function createRestHeaders(client, extra = {}) {
  return {
    apikey: client.anonKey,
    Authorization: `Bearer ${client.accessToken || client.anonKey}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function parseRestResponse(response) {
  if (response.ok) return response.status === 204 ? null : response.json()

  let message = `Supabase request failed with ${response.status}`
  try {
    const error = await response.json()
    message = error.message || message
  } catch {
    // Keep the status-based message.
  }
  throw new Error(message)
}

async function loadRemoteVisualStateViaRest(client) {
  const url = `${client.url}/rest/v1/${CMS_CONTENT_TABLE}?id=eq.${encodeURIComponent(CMS_CONTENT_ID)}&select=content`
  const rows = await parseRestResponse(await client.fetch(url, {
    headers: createRestHeaders(client),
  }))

  return rows?.[0]?.content ? normalizeVisualState(rows[0].content) : null
}

async function saveRemoteVisualStateViaRest(client, state) {
  assertRemoteVisualStateSize(state)
  const url = `${client.url}/rest/v1/${CMS_CONTENT_TABLE}?on_conflict=id`
  await parseRestResponse(await client.fetch(url, {
    method: 'POST',
    headers: createRestHeaders(client, {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify({
      id: CMS_CONTENT_ID,
      content: normalizeVisualState(state),
      updated_at: new Date().toISOString(),
    }),
  }))
}

async function loadRemoteVisualStateViaSdk(supabase) {
  const { data, error } = await supabase
    .from(CMS_CONTENT_TABLE)
    .select('content')
    .eq('id', CMS_CONTENT_ID)
    .maybeSingle()

  if (error) throw error
  return data?.content ? normalizeVisualState(data.content) : null
}

async function saveRemoteVisualStateViaSdk(supabase, state) {
  assertRemoteVisualStateSize(state)
  const { error } = await supabase
    .from(CMS_CONTENT_TABLE)
    .upsert({
      id: CMS_CONTENT_ID,
      content: normalizeVisualState(state),
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
}

export async function loadRemoteVisualState(client) {
  if (!client) return null
  if (typeof client.from === 'function') return loadRemoteVisualStateViaSdk(client)
  return loadRemoteVisualStateViaRest(client)
}

export async function saveRemoteVisualState(client, state) {
  if (!client) return
  if (typeof client.from === 'function') {
    await saveRemoteVisualStateViaSdk(client, state)
    return
  }

  await saveRemoteVisualStateViaRest(client, state)
}
