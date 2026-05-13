import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CMS_CONTENT_ID,
  CMS_CONTENT_TABLE,
  createEmptyVisualState,
  getVisualStateByteSize,
  hasSupabaseConfig,
  loadRemoteVisualState,
  MAX_REMOTE_VISUAL_STATE_BYTES,
  normalizeHeroProofState,
  normalizeVisualState,
  readLocalVisualState,
  saveRemoteVisualState,
  VISUAL_STORE_KEY,
  writeLocalVisualState,
} from '../src/cmsStorage.js'

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial))

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
  }
}

test('normalizes missing visual state fields for editor compatibility', () => {
  const state = normalizeVisualState({ text: { a: 'b' } })

  assert.deepEqual(state, {
    text: { a: 'b' },
    attrs: {},
    attrRefs: [],
    inserts: [],
    rotatingWords: null,
    starRatings: [],
    textRefs: [],
    removals: [],
  })
})

test('drops legacy generated-id edits that target keyed hero proof elements', () => {
  const state = normalizeVisualState({
    text: {
      'hero-test-1-quote': '"Stable quote"',
      've-123': 'Legacy generated quote',
    },
    textRefs: [
      { selector: '.hero-test-card blockquote', index: 0, html: 'Legacy ref quote' },
      { selector: '.hero-proof-label', index: 0, html: 'Legacy proof label' },
      { selector: '.testimonial-card blockquote', index: 0, html: 'Regular testimonial ref' },
    ],
    starRatings: [
      { selector: '.hero-test-stars', index: 0, rating: 4 },
      { selector: '.testimonial-stars', index: 0, rating: 5 },
    ],
  })

  const normalized = normalizeHeroProofState(state)

  assert.equal(normalized.text['hero-test-1-quote'], '"Stable quote"')
  assert.equal(normalized.text['ve-123'], 'Legacy generated quote')
  assert.deepEqual(normalized.textRefs, [
    { selector: '.testimonial-card blockquote', index: 0, html: 'Regular testimonial ref' },
  ])
  assert.deepEqual(normalized.starRatings, [
    { selector: '.testimonial-stars', index: 0, rating: 5 },
  ])
})

test('reads and writes visual state through local storage', () => {
  const storage = createStorage()
  const state = normalizeVisualState({ text: { headline: 'Updated' } })

  writeLocalVisualState(state, storage)

  assert.equal(storage.getItem(VISUAL_STORE_KEY), JSON.stringify(state))
  assert.deepEqual(readLocalVisualState(storage), state)
})

test('estimates visual state payload size before remote sync', () => {
  assert.equal(getVisualStateByteSize({ text: { hero: 'Saved' } }), 129)
})

test('falls back to empty visual state when local storage is invalid', () => {
  const storage = createStorage({ [VISUAL_STORE_KEY]: '{not-json' })

  assert.deepEqual(readLocalVisualState(storage), createEmptyVisualState())
})

test('requires both Supabase URL and anon key before enabling remote storage', () => {
  assert.equal(hasSupabaseConfig({}), false)
  assert.equal(hasSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co' }), false)
  assert.equal(hasSupabaseConfig({ VITE_SUPABASE_ANON_KEY: 'anon' }), false)
  assert.equal(hasSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' }), true)
})

test('loads normalized remote visual state from Supabase content row', async () => {
  const calls = []
  const supabase = {
    from(table) {
      calls.push(['from', table])
      return {
        select(columns) {
          calls.push(['select', columns])
          return {
            eq(column, value) {
              calls.push(['eq', column, value])
              return {
                maybeSingle() {
                  calls.push(['maybeSingle'])
                  return Promise.resolve({ data: { content: { text: { hero: 'Remote' } } }, error: null })
                },
              }
            },
          }
        },
      }
    },
  }

  const state = await loadRemoteVisualState(supabase)

  assert.equal(state.text.hero, 'Remote')
  assert.deepEqual(calls, [
    ['from', CMS_CONTENT_TABLE],
    ['select', 'content'],
    ['eq', 'id', CMS_CONTENT_ID],
    ['maybeSingle'],
  ])
})

test('saves visual state to the configured Supabase content row', async () => {
  let payload
  const supabase = {
    from(table) {
      assert.equal(table, CMS_CONTENT_TABLE)
      return {
        upsert(value) {
          payload = value
          return Promise.resolve({ error: null })
        },
      }
    },
  }

  await saveRemoteVisualState(supabase, { text: { hero: 'Saved' } })

  assert.equal(payload.id, CMS_CONTENT_ID)
  assert.equal(payload.content.text.hero, 'Saved')
  assert.match(payload.updated_at, /^\d{4}-\d{2}-\d{2}T/)
})

test('uses an authenticated REST bearer token when saving remote visual state', async () => {
  let headers
  const client = {
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
    accessToken: 'user-access-token',
    fetch(_url, options) {
      headers = options.headers
      return Promise.resolve({ ok: true, status: 204 })
    },
  }

  await saveRemoteVisualState(client, { text: { hero: 'Saved' } })

  assert.equal(headers.apikey, 'anon-key')
  assert.equal(headers.Authorization, 'Bearer user-access-token')
})

test('rejects oversized visual state before remote sync', async () => {
  let called = false
  const supabase = {
    from() {
      called = true
      return {}
    },
  }

  await assert.rejects(
    () => saveRemoteVisualState(supabase, { text: { hero: 'x'.repeat(MAX_REMOTE_VISUAL_STATE_BYTES) } }),
    /too large/i,
  )
  assert.equal(called, false)
})
