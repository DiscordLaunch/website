import {
  hasSupabaseAuthConfig,
  isCmsEditorSession,
  readSupabaseAuthSession,
  signInSupabaseEditor,
  updateSupabaseEditorPassword,
} from './supabaseAuth.js'

export const EDITOR_AUTH_SESSION_KEY = 'divine.editor.auth.v1'
export const EDITOR_PASSWORD_OVERRIDE_KEY = 'divine.editor.password.v1'

export function normalizePassword(value) {
  return String(value || '').trim()
}

function getBrowserStorage(name) {
  return typeof window === 'undefined' ? null : window[name]
}

export function getEditorPassword(env = {}, storage = getBrowserStorage('localStorage')) {
  const storedPassword = storage ? normalizePassword(storage.getItem(EDITOR_PASSWORD_OVERRIDE_KEY)) : ''
  return storedPassword || normalizePassword(env.VITE_EDITOR_PASSWORD)
}

export function isEditorUnlocked(storage = window.sessionStorage) {
  return storage.getItem(EDITOR_AUTH_SESSION_KEY) === '1'
}

export function unlockEditor(submittedPassword, configuredPassword, storage = window.sessionStorage) {
  if (!configuredPassword) return false
  if (normalizePassword(submittedPassword) !== configuredPassword) return false

  storage.setItem(EDITOR_AUTH_SESSION_KEY, '1')
  return true
}

export function lockEditor(storage = window.sessionStorage) {
  storage.removeItem(EDITOR_AUTH_SESSION_KEY)
}

export async function changeEditorPassword(
  currentPassword,
  newPassword,
  confirmPassword,
  env = import.meta.env,
  passwordStorage = getBrowserStorage('localStorage'),
  sessionStorage = getBrowserStorage('sessionStorage'),
) {
  if (hasSupabaseAuthConfig(env)) {
    return updateSupabaseEditorPassword(currentPassword, newPassword, confirmPassword, {
      env,
      storage: passwordStorage,
    })
  }

  if (!passwordStorage || !sessionStorage) return { ok: false, error: 'Password storage is unavailable.' }

  const configuredPassword = getEditorPassword(env, passwordStorage)
  const normalizedCurrent = normalizePassword(currentPassword)
  const normalizedNew = normalizePassword(newPassword)
  const normalizedConfirm = normalizePassword(confirmPassword)

  if (!configuredPassword || normalizedCurrent !== configuredPassword) {
    return { ok: false, error: 'Current password is incorrect.' }
  }

  if (!normalizedNew) return { ok: false, error: 'Enter a new password.' }
  if (normalizedNew !== normalizedConfirm) return { ok: false, error: 'Passwords do not match.' }

  passwordStorage.setItem(EDITOR_PASSWORD_OVERRIDE_KEY, normalizedNew)
  unlockEditor(normalizedNew, normalizedNew, sessionStorage)
  return { ok: true }
}

export async function ensureEditorAccess(env = import.meta.env) {
  if (hasSupabaseAuthConfig(env)) {
    const session = readSupabaseAuthSession()
    if (isCmsEditorSession(session)) return true

    renderLogin({ mode: 'supabase', configuredPassword: true, env })
    return false
  }

  const configuredPassword = getEditorPassword(env)

  if (isEditorUnlocked()) return true

  renderLogin({ mode: 'local', configuredPassword })
  return false
}

function renderLogin({ mode, configuredPassword, env }) {
  const isSupabase = mode === 'supabase'
  const supabaseEditorEmail = String(env?.VITE_SUPABASE_EDITOR_EMAIL || '').trim()
  const showSupabaseEmail = isSupabase && !supabaseEditorEmail
  document.body.classList.add('ve-auth-page')
  document.body.innerHTML = `
    <main class="ve-auth-shell">
      <form class="ve-auth-card" data-editor-login>
        <div>
          <p class="ve-auth-kicker">Divine CMS</p>
          <h1>Editor login</h1>
          <p class="ve-auth-copy">Enter the editor password to manage page content.</p>
        </div>
        ${
          showSupabaseEmail
            ? `<label>
                <span>Email</span>
                <input type="email" name="email" autocomplete="username" required>
              </label>`
            : ''
        }
        <label>
          <span>Password</span>
          <input
            type="password"
            name="password"
            autocomplete="current-password"
            ${configuredPassword ? '' : 'disabled'}
            required
          >
        </label>
        <p class="ve-auth-error" data-editor-login-error hidden>${isSupabase ? 'Unable to sign in.' : 'Incorrect password.'}</p>
        ${
          configuredPassword
            ? '<button type="submit">Unlock editor</button>'
            : '<p class="ve-auth-error">Set VITE_EDITOR_PASSWORD before opening the editor, or configure Supabase Auth.</p>'
        }
      </form>
    </main>
  `

  const form = document.querySelector('[data-editor-login]')
  const emailInput = form?.querySelector('input[name="email"]')
  const input = form?.querySelector('input[name="password"]')
  const error = form?.querySelector('[data-editor-login-error]')

  form?.addEventListener('submit', async (event) => {
    event.preventDefault()
    error.hidden = true

    if (isSupabase) {
      const result = await signInSupabaseEditor(supabaseEditorEmail || emailInput.value, input.value, { env })
      if (result.ok) {
        window.location.reload()
        return
      }

      error.textContent = result.error
      error.hidden = false
      input.select()
      input.focus()
      return
    }

    if (unlockEditor(input.value, configuredPassword)) {
      window.location.reload()
      return
    }

    error.hidden = false
    input.select()
    input.focus()
  })

  ;(emailInput || input)?.focus()
}
