const allowedPaths = new Set([
  '/',
  '/editor',
])

function normalizePath(pathname) {
  const normalized = `/${String(pathname || '/').replace(/^\/+/, '')}`.replace(/\/+$/, '')
  return normalized || '/'
}

export function isKnownAppPath(pathname = window.location.pathname) {
  return allowedPaths.has(normalizePath(pathname))
}

export function renderNotFoundPage() {
  document.title = '404 - Page not found | Divine'
  document.body.className = 'not-found-page'
  document.body.innerHTML = `
    <main class="not-found-shell">
      <a class="not-found-logo" href="/" aria-label="Divine home">
        <svg class="logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="not-found-dg" x1="0%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#9333ea"/><stop offset="55%" stop-color="#c084fc"/><stop offset="100%" stop-color="#c4b5fd"/></linearGradient></defs><path d="M22 8 L55 8 C78 8 92 24 92 44 L92 56 C92 84 70 97 44 97 L22 97 C14 97 8 91 8 83 L8 22 C8 14 14 8 22 8 Z M34 28 L34 77 L44 77 C60 77 72 66 72 52 L72 44 C72 34 64 28 55 28 Z" fill="url(#not-found-dg)"/></svg>
        Divine
      </a>
      <section class="not-found-card" aria-labelledby="not-found-title">
        <p class="not-found-code">404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p>The page you opened does not exist. Head back to the Divine homepage to keep browsing.</p>
        <div class="not-found-actions">
          <a class="btn-primary" href="/">Back home</a>
        </div>
      </section>
    </main>
  `
}
