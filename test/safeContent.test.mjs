import test from 'node:test'
import assert from 'node:assert/strict'

import {
  escapeHtml,
  sanitizeInlineHtml,
  sanitizeInlineStyle,
  sanitizeUrl,
} from '../src/safeContent.js'

test('escapes HTML when DOM sanitization is unavailable', () => {
  assert.equal(
    sanitizeInlineHtml('<img src=x onerror=alert(1)>Safe'),
    '&lt;img src=x onerror=alert(1)&gt;Safe',
  )
})

test('allows secure web, local dev, mail, phone, and relative URLs', () => {
  assert.equal(sanitizeUrl('/contact'), '/contact')
  assert.equal(sanitizeUrl('https://example.com/path'), 'https://example.com/path')
  assert.equal(sanitizeUrl('http://127.0.0.1:5173/editor'), 'http://127.0.0.1:5173/editor')
  assert.equal(sanitizeUrl('mailto:hello@example.com'), 'mailto:hello@example.com')
  assert.equal(sanitizeUrl('tel:+15551234567'), 'tel:+15551234567')
})

test('rejects insecure remote, scriptable, and unsafe image data URLs', () => {
  assert.equal(sanitizeUrl('http://example.com/path'), '')
  assert.equal(sanitizeUrl('javascript:alert(1)'), '')
  assert.equal(sanitizeUrl('data:text/html;base64,PHNjcmlwdD4='), '')
  assert.equal(sanitizeUrl('data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+'), '')
})

test('allows raster data images only when explicitly requested', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo='

  assert.equal(sanitizeUrl(png), '')
  assert.equal(sanitizeUrl(png, { allowDataImage: true }), png)
})

test('rejects insecure remote image URLs even when data images are allowed', () => {
  assert.equal(sanitizeUrl('http://example.com/proof.png', { allowDataImage: true }), '')
})

test('escapes HTML entities consistently', () => {
  assert.equal(escapeHtml(`"<script>'&`), '&quot;&lt;script&gt;&#39;&amp;')
})

test('keeps only safe inline color declarations', () => {
  assert.equal(sanitizeInlineStyle('color: #ff0000; position: fixed'), 'color: #ff0000')
  assert.equal(sanitizeInlineStyle('color: rgb(22, 163, 74); background: url(javascript:alert(1))'), 'color: rgb(22, 163, 74)')
  assert.equal(sanitizeInlineStyle('width: expression(alert(1))'), '')
})
