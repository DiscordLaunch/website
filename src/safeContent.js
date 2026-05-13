const SAFE_URL_PROTOCOLS = new Set(['https:', 'mailto:', 'tel:'])
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:gif|jpe?g|png|webp);base64,/i
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])
const ALLOWED_INLINE_TAGS = new Set(['A', 'B', 'BR', 'EM', 'I', 'LI', 'OL', 'P', 'SPAN', 'STRONG', 'U', 'UL'])
const ALLOWED_INLINE_ATTRS = new Set(['class', 'href', 'target', 'rel', 'aria-label'])
const SAFE_COLOR_PATTERN = /^(?:#[\da-f]{3}|#[\da-f]{6}|rgba?\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function sanitizeUrl(value, { allowRelative = true, allowDataImage = false } = {}) {
  const url = String(value || '').trim()
  if (!url) return ''
  if (allowDataImage && SAFE_DATA_IMAGE_PATTERN.test(url)) return url

  try {
    const origin = typeof window === 'undefined' ? 'https://divine.local' : window.location.origin
    const parsed = new URL(url, origin)
    const isRelative = !/^[a-z][a-z\d+.-]*:/i.test(url)

    if (isRelative && allowRelative) return url
    if (parsed.protocol === 'http:' && LOCAL_HOSTNAMES.has(parsed.hostname)) return parsed.href
    if (SAFE_URL_PROTOCOLS.has(parsed.protocol)) return parsed.href
  } catch {
    return ''
  }

  return ''
}

function sanitizeElement(element) {
  if (!ALLOWED_INLINE_TAGS.has(element.tagName)) {
    element.replaceWith(document.createTextNode(element.textContent || ''))
    return
  }

  for (const attr of [...element.attributes]) {
    const name = attr.name.toLowerCase()
    if (!ALLOWED_INLINE_ATTRS.has(name) || name.startsWith('on')) {
      element.removeAttribute(attr.name)
      continue
    }

    if (name === 'href') {
      const safeUrl = sanitizeUrl(attr.value)
      if (safeUrl) element.setAttribute('href', safeUrl)
      else element.removeAttribute('href')
    }
  }

  if (element.tagName === 'A' && element.getAttribute('target') === '_blank') {
    element.setAttribute('rel', 'noopener noreferrer')
  }
}

export function sanitizeInlineHtml(value) {
  if (typeof document === 'undefined') return escapeHtml(value)

  const template = document.createElement('template')
  template.innerHTML = String(value || '')
  template.content.querySelectorAll('*').forEach(sanitizeElement)
  return template.innerHTML
}

export function sanitizeInlineStyle(value) {
  const declarations = String(value || '')
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)

  const safeDeclarations = declarations.filter((declaration) => {
    const [property, ...rawParts] = declaration.split(':')
    const rawValue = rawParts.join(':').trim()
    return property?.trim().toLowerCase() === 'color' && SAFE_COLOR_PATTERN.test(rawValue)
  })

  return safeDeclarations.join('; ')
}
