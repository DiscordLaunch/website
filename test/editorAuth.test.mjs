import test from 'node:test'
import assert from 'node:assert/strict'

import {
  EDITOR_AUTH_SESSION_KEY,
  EDITOR_PASSWORD_OVERRIDE_KEY,
  changeEditorPassword,
  getEditorPassword,
  isEditorUnlocked,
  normalizePassword,
  unlockEditor,
} from '../src/editorAuth.js'

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

test('normalizes passwords by trimming surrounding whitespace', () => {
  assert.equal(normalizePassword('  secret  '), 'secret')
})

test('reads the editor password from Vite environment config', () => {
  assert.equal(getEditorPassword({ VITE_EDITOR_PASSWORD: 'admin-pass' }), 'admin-pass')
})

test('uses a stored editor password override before the environment password', () => {
  const storage = createStorage({ [EDITOR_PASSWORD_OVERRIDE_KEY]: 'changed-pass' })

  assert.equal(getEditorPassword({ VITE_EDITOR_PASSWORD: 'admin-pass' }, storage), 'changed-pass')
})

test('changes the stored editor password when the current password is correct', async () => {
  const passwordStorage = createStorage()
  const sessionStorage = createStorage()

  const result = await changeEditorPassword(
    'admin-pass',
    ' changed-pass ',
    ' changed-pass ',
    { VITE_EDITOR_PASSWORD: 'admin-pass' },
    passwordStorage,
    sessionStorage,
  )

  assert.deepEqual(result, { ok: true })
  assert.equal(passwordStorage.getItem(EDITOR_PASSWORD_OVERRIDE_KEY), 'changed-pass')
  assert.equal(sessionStorage.getItem(EDITOR_AUTH_SESSION_KEY), '1')
})

test('does not change the editor password when confirmation does not match', async () => {
  const passwordStorage = createStorage()

  const result = await changeEditorPassword(
    'admin-pass',
    'new-pass',
    'different-pass',
    { VITE_EDITOR_PASSWORD: 'admin-pass' },
    passwordStorage,
    createStorage(),
  )

  assert.equal(result.ok, false)
  assert.equal(result.error, 'Passwords do not match.')
  assert.equal(passwordStorage.getItem(EDITOR_PASSWORD_OVERRIDE_KEY), null)
})

test('does not change the editor password when the current password is wrong', async () => {
  const passwordStorage = createStorage()

  const result = await changeEditorPassword(
    'wrong-pass',
    'new-pass',
    'new-pass',
    { VITE_EDITOR_PASSWORD: 'admin-pass' },
    passwordStorage,
    createStorage(),
  )

  assert.equal(result.ok, false)
  assert.equal(result.error, 'Current password is incorrect.')
  assert.equal(passwordStorage.getItem(EDITOR_PASSWORD_OVERRIDE_KEY), null)
})

test('does not unlock when the submitted password is wrong', () => {
  const storage = createStorage()

  assert.equal(unlockEditor('wrong', 'right', storage), false)
  assert.equal(storage.getItem(EDITOR_AUTH_SESSION_KEY), null)
})

test('stores a session flag when the submitted password is correct', () => {
  const storage = createStorage()

  assert.equal(unlockEditor(' right ', 'right', storage), true)
  assert.equal(storage.getItem(EDITOR_AUTH_SESSION_KEY), '1')
})

test('treats an existing session flag as unlocked', () => {
  const storage = createStorage({ [EDITOR_AUTH_SESSION_KEY]: '1' })

  assert.equal(isEditorUnlocked(storage), true)
})
