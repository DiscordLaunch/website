import {
  createSupabaseBrowserClient,
  loadRemoteVisualState,
  readLocalVisualState,
  saveRemoteVisualState,
  VISUAL_STORE_KEY,
  writeLocalVisualState,
} from './cmsStorage.js'
import { changeEditorPassword } from './editorAuth.js'

const containerSelector = [
  '.video-testimonial-grid',
  '.testimonial-marquee-window',
  '.review-marquee-track',
  '.screenshot-wall-track',
  '.screenshot-wall-row',
  '.card-grid-4',
  '.testimonial-grid',
  '.steps-row',
  '.stats-grid',
  '.trust-strip',
  '.hero-trust-strip',
  '.hero-testimonials',
  '.footer-socials',
  '.section-inner',
  'section',
  '.hero',
].join(',')
const editableSelector = [
  '.logo',
  '.nav a',
  '.mobile-nav a',
  '.header-cta',
  '.btn-primary',
  '.btn-secondary',
  '.hero-headline-prefix',
  '.hero-headline-suffix',
  '#rotating-word',
  '.hero-sub',
  '.video-placeholder',
  '.hero-trust-strip span',
  '.hero-trust-strip .sep',
  '.section-headline',
  '.section-headline-lg',
  '.section-sub',
  '.proof-layer-headline',
  '.screenshot-placeholder',
  '.tab-preview',
  '.final-cta .section-headline-lg',
  '.final-cta .section-sub',
  '.final-cta p',
  '.final-cta span',
  '.stat-num',
  '.stat-label',
  '.trust-stat .num',
  '.trust-stat .label',
  '.hero-test-card blockquote',
  '.hero-trust-strip .stars',
  '.hero-test-stars',
  '.hero-test-author',
  '.hero-proof-stars',
  '.hero-proof-label',
  '.hero-proof-badge',
  '.hero-proof-note',
  '.testimonial-stars',
  '.vt-label',
  '.testimonial-card blockquote',
  '.testimonial-author',
  '.marquee-stars',
  '.marquee-card blockquote',
  '.marquee-quote',
  '.marquee-author',
  '.tab-btn',
  '.tab-info h3',
  '.tab-info p',
  '.tab-info li',
  '.card h3',
  '.card p',
  '.split-card h3',
  '.split-card li',
  '.step h3',
  '.step p',
  '.step-num',
  '.comp-header div',
  '.comp-row div',
  '.discord-avatar',
  '.discord-name',
  '.discord-channel',
  '.discord-msg',
  '.discord-reaction',
  '.accordion-trigger',
  '.accordion-body-inner',
  '.footer-brand',
  '.footer-brand .footer-logo',
  '.footer-links a',
  '.footer-copy',
  '.footer-disclaimer',
].join(',')
const selectableSelector = [
  editableSelector,
  '.card',
  '.step',
  '.stat-block',
  '.trust-stat',
  '.video-test-card',
  '.testimonial-card',
  '.hero-test-card',
  '.hero-proof-row',
  '.hero-vsl',
  '.screenshot-wall',
  '.screenshot-wall-track',
  '.screenshot-wall-row',
  '.screenshot-placeholder',
  '.tab-preview',
  '.final-cta',
  '.bottom-proof-grid',
  '.discord-screenshot-card',
  '.card-icon',
  '.step-num',
  '.play-icon',
  '.mini-play',
  '.footer-socials a',
  'img',
  'svg',
].join(',')
const stableSelectors = [
  '.header-cta',
  '.hero-cta-row .btn-primary',
  '.final-cta .btn-primary',
  '.nav a',
  '.mobile-nav a',
  '.footer-links a',
  '.footer-socials a',
  '.hero-trust-strip .stars',
  '.hero-trust-strip .sep',
  '.hero-trust-strip span',
  '.hero-headline-prefix',
  '.hero-headline-suffix',
  '#rotating-word',
  '.hero-sub',
  '.video-placeholder',
  '.hero-test-stars',
  '.hero-test-card',
  '.hero-test-card blockquote',
  '.hero-test-author',
  '.hero-proof-stars',
  '.hero-proof-label',
  '.hero-proof-badge',
  '.hero-proof-note',
  '.testimonial-stars',
  '.testimonial-card',
  '.testimonial-card blockquote',
  '.testimonial-author',
  '.marquee-stars',
  '.marquee-card blockquote',
  '.marquee-quote',
  '.marquee-author',
  '.proof-layer-headline',
  '.screenshot-placeholder',
  '.tab-preview',
  '.final-cta .section-headline-lg',
  '.final-cta .section-sub',
  '.final-cta p',
  '.final-cta span',
  '.card',
  '.card h3',
  '.card p',
  '.split-card h3',
  '.split-card li',
  '.step',
  '.step h3',
  '.step p',
  '.step-num',
  '.video-test-card',
  '.vt-label',
  '.stat-block',
  '.stat-num',
  '.stat-label',
  '.trust-stat',
  '.trust-stat .num',
  '.trust-stat .label',
  '.comp-row',
  '.comp-header div',
  '.comp-row div',
  '.accordion-item',
  '.accordion-trigger',
  '.accordion-body-inner',
  '.tab-btn',
  '.tab-info h3',
  '.tab-info p',
  '.tab-info li',
  '.discord-screenshot-card',
  '.discord-avatar',
  '.discord-name',
  '.discord-channel',
  '.discord-msg',
  '.discord-reaction',
  '.footer-brand',
  '.footer-brand .footer-logo',
  '.footer-copy',
  '.footer-disclaimer',
]
const removableSelectors = [
  '[data-ve-insert-id]',
  '.card',
  '.step',
  '.testimonial-card',
  '.video-test-card',
  '.hero-test-card',
  '.discord-screenshot-card',
  '.screenshot-placeholder',
  '.stat-block',
  '.trust-stat',
  '.comp-row',
  '.accordion-item',
  '.footer-socials a',
  '.hero-trust-strip .stars',
  '.hero-trust-strip .sep',
  '.hero-trust-strip span',
].join(',')
const duplicateLayerSelector = [
  '[data-ve-insert-id]',
  '.card',
  '.step',
  '.testimonial-card',
  '.video-test-card',
  '.hero-test-card',
  '.hero-vsl',
  '.screenshot-placeholder',
  '.discord-screenshot-card',
  '.stat-block',
  '.trust-stat',
  '.comp-row',
  '.accordion-item',
  '.footer-socials a',
  '.hero-trust-strip .stars',
  '.hero-trust-strip .sep',
  '.hero-trust-strip span',
].join(',')

let selectedElement = null
let selectedContainer = null
let inspectorOpen = false
let state = readState()
let isDirty = false
let restoringHistory = false
let historyTimer = null
let supabaseClient = null
const undoStack = []
const redoStack = []
const MAX_INLINE_IMAGE_UPLOAD_BYTES = 750_000

function readState() {
  return readLocalVisualState()
}

function saveState(showFeedback = false) {
  writeLocalVisualState(state)
  syncRemoteState()
  isDirty = false
  updateUndoRedoButtons()
  if (showFeedback === true) showToast('Saved')
}

async function syncRemoteState() {
  if (!supabaseClient) return

  try {
    await saveRemoteVisualState(supabaseClient, state)
  } catch (error) {
    console.warn('Unable to sync visual editor state to Supabase.', error)
    showToast('Saved locally')
  }
}

async function loadRemoteState() {
  supabaseClient = await createSupabaseBrowserClient()
  if (!supabaseClient) return

  try {
    const remoteState = await loadRemoteVisualState(supabaseClient)
    if (!remoteState) return
    state = remoteState
    writeLocalVisualState(state)
    applySavedState()
    assignIds()
    makeEditable()
    renderImagePlaceholders()
    renderVideoEmbeds()
    pushHistory()
    showToast('Loaded cloud draft')
  } catch (error) {
    console.warn('Unable to load visual editor state from Supabase.', error)
    showToast('Using local draft')
  }
}

function markDirty(message = '') {
  isDirty = true
  updateUndoRedoButtons()
  if (message) showToast(message)
}

function cloneState(value = state) {
  return JSON.parse(JSON.stringify(value))
}

function cleanupHistoryClone(root) {
  root.querySelectorAll('.ve-toolbar,.ve-inspector,.ve-toast').forEach((node) => node.remove())
  root.querySelectorAll('.ve-editable,.ve-selected,[contenteditable],[data-ve-editable-bound]').forEach((node) => {
    node.classList.remove('ve-editable', 've-selected')
    node.removeAttribute('contenteditable')
    node.removeAttribute('data-ve-editable-bound')
  })
  root.removeAttribute('data-ve-click-bound')
}

function captureSnapshot() {
  const body = document.body.cloneNode(true)
  cleanupHistoryClone(body)
  return {
    state: cloneState(),
    html: body.innerHTML,
  }
}

function pushHistory() {
  if (restoringHistory) return
  historyTimer = null
  const snapshot = captureSnapshot()
  const previous = undoStack[undoStack.length - 1]
  if (previous && previous.html === snapshot.html && JSON.stringify(previous.state) === JSON.stringify(snapshot.state)) return
  undoStack.push(snapshot)
  if (undoStack.length > 80) undoStack.shift()
  redoStack.length = 0
  updateUndoRedoButtons()
}

function scheduleHistoryPush() {
  clearTimeout(historyTimer)
  historyTimer = setTimeout(pushHistory, 350)
}

function flushHistory() {
  if (!historyTimer) return
  clearTimeout(historyTimer)
  historyTimer = null
  pushHistory()
}

function restoreSnapshot(snapshot, message) {
  if (!snapshot) return
  restoringHistory = true
  clearTimeout(historyTimer)
  state = cloneState(snapshot.state)
  selectedElement = null
  selectedContainer = null
  inspectorOpen = false
  document.body.innerHTML = snapshot.html
  disablePageMotion()
  assignIds()
  makeEditable()
  mountEditorUi()
  renderVideoEmbeds()
  restoringHistory = false
  markDirty(message)
}

function undoEdit() {
  flushHistory()
  if (undoStack.length <= 1 && isDirty && undoStack[0]) {
    redoStack.push(captureSnapshot())
    restoreSnapshot(undoStack[0], 'Undone')
    return
  }
  if (undoStack.length <= 1) return
  redoStack.push(undoStack.pop())
  restoreSnapshot(undoStack[undoStack.length - 1], 'Undone')
}

function redoEdit() {
  flushHistory()
  const next = redoStack.pop()
  if (!next) return
  undoStack.push(next)
  restoreSnapshot(next, 'Redone')
}

function updateUndoRedoButtons() {
  const undoButton = document.querySelector('[data-ve-undo]')
  const redoButton = document.querySelector('[data-ve-redo]')
  const saveButton = document.querySelector('[data-ve-save]')
  if (undoButton) undoButton.disabled = undoStack.length <= 1 && !isDirty
  if (redoButton) redoButton.disabled = redoStack.length === 0
  if (saveButton) saveButton.textContent = isDirty ? 'Save changes' : 'Saved'
}

function assignIds() {
  const elements = [
    ...document.querySelectorAll(editableSelector),
    ...document.querySelectorAll(selectableSelector),
    ...document.querySelectorAll(containerSelector),
  ]
  elements.forEach((element, index) => {
    if (!element.dataset.veId) element.dataset.veId = element.dataset.veKey || `ve-${index}`
  })
}

function cleanEditableHtml(html) {
  const template = document.createElement('template')
  template.innerHTML = html
  template.content.querySelectorAll('.ve-toolbar,.ve-inspector').forEach((node) => node.remove())
  template.content.querySelectorAll('[contenteditable]').forEach((node) => {
    node.removeAttribute('contenteditable')
    node.classList.remove('ve-editable', 've-selected')
  })
  template.content.querySelectorAll('.ve-selected').forEach((node) => node.classList.remove('ve-selected'))
  return template.innerHTML
}

function applySavedState() {
  Object.entries(state.text || {}).forEach(([id, html]) => {
    const element = document.querySelector(`[data-ve-id="${id}"]`)
    if (element) element.innerHTML = html
  })

  Object.entries(state.attrs || {}).forEach(([id, attrs]) => {
    const element = document.querySelector(`[data-ve-id="${id}"]`)
    if (!element) return
    Object.entries(attrs).forEach(([name, value]) => {
      if (value === '' && name === 'data-video-url') element.removeAttribute(name)
      else if (value) element.setAttribute(name, value)
    })
  })
  applyAttrRefs(state.attrRefs)
  applyTextRefs(state.textRefs)
  renderImagePlaceholders()
  renderVideoEmbeds()

  ;(state.inserts || []).forEach((insert) => {
    if (document.querySelector(`[data-ve-insert-id="${insert.id}"]`)) return
    const fallbackParent = insert.parentSelector ? document.querySelector(insert.parentSelector) : null
    const parent = fallbackParent || document.querySelector(`[data-ve-id="${insert.parentId}"]`)
    if (!parent) return
    const afterElement = insert.afterRef
      ? document.querySelectorAll(insert.afterRef.selector)[insert.afterRef.index]
      : null
    if (afterElement?.parentElement === parent) afterElement.insertAdjacentHTML('afterend', insert.html)
    else parent.insertAdjacentHTML('beforeend', insert.html)
  })

  applyStarRatings(state.starRatings)
  applyRemovals(state.removals)
  renderImagePlaceholders()
  renderVideoEmbeds()
}

function makeEditable() {
  document.querySelectorAll(editableSelector).forEach((element) => {
    if (element.closest('.ve-toolbar,.ve-inspector')) return
    if (element.dataset.veEditableBound === 'true') return
    element.setAttribute('contenteditable', 'true')
    element.classList.add('ve-editable')
    element.dataset.veEditableBound = 'true'
    element.addEventListener('input', () => {
      const html = cleanEditableHtml(element.innerHTML)
      state.text[element.dataset.veId] = html
      saveTextRef(element, html)
      markDirty()
      scheduleHistoryPush()
    })
  })

  if (document.body.dataset.veClickBound === 'true') return
  document.body.dataset.veClickBound = 'true'
  document.addEventListener('click', (event) => {
    if (event.target.closest('.ve-toolbar,.ve-inspector')) return
    const socialLink = event.target.closest('.footer-socials a')
    const target = socialLink || event.target.closest(selectableSelector) || event.target.closest('[data-ve-id], [data-ve-inserted]')
    if (!target) return
    if (target.closest('a,button')) event.preventDefault()
    selectElement(target)
  }, true)
}

function selectElement(element) {
  selectedElement?.classList.remove('ve-selected')
  selectedElement = element
  selectedElement.classList.add('ve-selected')
  updateInspector()
  if (selectedElement.id === 'rotating-word') openInspector()
}

function getStableRef(element) {
  if (!element) return null
  const selector = stableSelectors.find((candidate) => element.matches(candidate))
  if (!selector) return null
  const index = [...document.querySelectorAll(selector)].indexOf(element)
  if (index < 0) return null
  return { selector, index }
}

function upsertByRef(collection, ref, values) {
  if (!ref) return
  const existing = collection.find((item) => item.selector === ref.selector && item.index === ref.index)
  if (existing) Object.assign(existing, values)
  else collection.push({ ...ref, ...values })
}

function saveTextRef(element, html) {
  if (element.dataset.veKey) return
  upsertByRef(state.textRefs, getStableRef(element), { html })
}

function applyTextRefs(refs) {
  if (!Array.isArray(refs)) return
  refs.forEach((item) => {
    const element = document.querySelectorAll(item.selector)[item.index]
    if (element) element.innerHTML = item.html
  })
}

function saveAttrRef(element, attrs) {
  upsertByRef(state.attrRefs, getStableRef(element), { attrs })
}

function applyAttrRefs(refs) {
  if (!Array.isArray(refs)) return
  refs.forEach((item) => {
    const element = document.querySelectorAll(item.selector)[item.index]
    if (!element) return
    Object.entries(item.attrs || {}).forEach(([name, value]) => {
      if (value === '' && name === 'data-video-url') element.removeAttribute(name)
      else if (value === '' && name === 'data-ve-image-url') element.removeAttribute(name)
      else element.setAttribute(name, value)
    })
  })
}

function renderImagePlaceholder(element) {
  if (!element) return
  const imageUrl = element.dataset.veImageUrl
  if (!imageUrl) {
    element.classList.remove('ve-image-placeholder-filled')
    element.style.removeProperty('background-image')
    element.style.removeProperty('background-size')
    element.style.removeProperty('background-position')
    return
  }

  element.classList.add('ve-image-placeholder-filled')
  element.style.backgroundImage = `url("${imageUrl.replaceAll('"', '%22')}")`
  element.style.backgroundSize = 'cover'
  element.style.backgroundPosition = 'center'
}

function renderImagePlaceholders() {
  document.querySelectorAll('.screenshot-placeholder[data-ve-image-url], .tab-preview[data-ve-image-url]').forEach(renderImagePlaceholder)
}

function getSelectedLink() {
  if (!selectedElement) return null
  return selectedElement.matches('a') ? selectedElement : selectedElement.querySelector('a')
}

function getSelectedImage() {
  if (!selectedElement) return null
  return selectedElement.matches('img') ? selectedElement : selectedElement.querySelector('img')
}

function getSelectedImagePlaceholder() {
  if (!selectedElement) return null
  return selectedElement.closest('.screenshot-placeholder, .tab-preview')
}

function getSelectedVideoTarget() {
  if (!selectedElement) return null
  return selectedElement.closest('.hero-vsl, .video-test-card, [data-video-url]')
}

function getSelectedIconTarget() {
  if (!selectedElement) return null
  if (selectedElement.matches('svg')) {
    return selectedElement.closest('.card-icon,.step-num,.play-icon,.mini-play,.footer-socials a') || selectedElement.parentElement
  }
  if (selectedElement.matches('.card-icon,.step-num,.play-icon,.mini-play,.footer-socials a')) return selectedElement
  return null
}

function getSelectedTextColorTarget() {
  if (!selectedElement) return null
  if (selectedElement.closest('.ve-toolbar,.ve-inspector')) return null
  return selectedElement.matches(editableSelector) ? selectedElement : null
}

function getRotatingWords() {
  if (Array.isArray(state.rotatingWords) && state.rotatingWords.length) return state.rotatingWords
  if (Array.isArray(window.__divineRotation?.words) && window.__divineRotation.words.length) return window.__divineRotation.words
  const word = document.getElementById('rotating-word')?.textContent.trim()
  return word ? [word] : []
}

function updateInspector() {
  const label = document.querySelector('[data-ve-selected-label]')
  const linkInput = document.querySelector('[data-ve-link]')
  const imageInput = document.querySelector('[data-ve-image]')
  const altInput = document.querySelector('[data-ve-alt]')
  const videoInput = document.querySelector('[data-ve-video]')
  const iconInput = document.querySelector('[data-ve-icon]')
  const colorInput = document.querySelector('[data-ve-color]')
  const colorHexInput = document.querySelector('[data-ve-color-hex]')
  const rotatingInput = document.querySelector('[data-ve-rotating]')
  const starsInput = document.querySelector('[data-ve-stars]')
  const linkField = document.querySelector('[data-ve-link-field]')
  const imageField = document.querySelector('[data-ve-image-field]')
  const imageUploadField = document.querySelector('[data-ve-image-upload-field]')
  const altField = document.querySelector('[data-ve-alt-field]')
  const videoField = document.querySelector('[data-ve-video-field]')
  const iconField = document.querySelector('[data-ve-icon-field]')
  const colorField = document.querySelector('[data-ve-color-field]')
  const rotatingField = document.querySelector('[data-ve-rotating-field]')
  const starsField = document.querySelector('[data-ve-stars-field]')
  const containerLabel = document.querySelector('[data-ve-container-label]')
  if (!label || !selectedElement) return

  label.textContent = selectedElement.className || selectedElement.tagName.toLowerCase()
  const link = getSelectedLink()
  const image = getSelectedImage()
  const imagePlaceholder = getSelectedImagePlaceholder()
  const video = getSelectedVideoTarget()
  const icon = getSelectedIconTarget()
  const textColor = getSelectedTextColorTarget()
  const stars = getSelectedStarsTarget()

  linkField.hidden = !link
  imageField.hidden = !image && !imagePlaceholder
  imageUploadField.hidden = !image && !imagePlaceholder
  altField.hidden = !image
  videoField.hidden = !video
  iconField.hidden = !icon
  colorField.hidden = !textColor
  rotatingField.hidden = selectedElement.id !== 'rotating-word'
  starsField.hidden = !stars

  linkInput.value = link?.getAttribute('href') || ''
  imageInput.value = image?.getAttribute('src') || imagePlaceholder?.dataset.veImageUrl || ''
  altInput.value = image?.getAttribute('alt') || ''
  videoInput.value = video?.dataset.videoUrl || ''
  iconInput.value = icon?.outerHTML || icon?.innerHTML || ''
  const selectedColor = textColor ? rgbToHex(getComputedStyle(textColor).color) : '#000000'
  colorInput.value = selectedColor
  colorHexInput.value = selectedColor
  rotatingInput.value = getRotatingWords().join('\n')
  starsInput.value = stars ? countStars(stars.textContent) : 5
  containerLabel.textContent = selectedContainer
    ? selectedContainer.className || selectedContainer.tagName.toLowerCase()
    : 'nearest parent'
}

function rgbToHex(value) {
  const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!match) return '#000000'
  return `#${[match[1], match[2], match[3]]
    .map((channel) => Number.parseInt(channel, 10).toString(16).padStart(2, '0'))
    .join('')}`
}

function normalizeHexColor(value) {
  const trimmed = String(value || '').trim()
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase()
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed.toLowerCase()}`
  return ''
}

function openInspector() {
  inspectorOpen = true
  const inspector = document.querySelector('.ve-inspector')
  const toggle = document.querySelector('[data-ve-panel]')
  if (inspector) inspector.hidden = false
  if (toggle) toggle.textContent = 'Hide settings'
}

function closeInspector() {
  inspectorOpen = false
  const inspector = document.querySelector('.ve-inspector')
  const toggle = document.querySelector('[data-ve-panel]')
  if (inspector) inspector.hidden = true
  if (toggle) toggle.textContent = 'Edit selected'
}

function toggleInspector() {
  if (inspectorOpen) closeInspector()
  else openInspector()
}

function applyInspector() {
  if (!selectedElement) return
  const linkValue = document.querySelector('[data-ve-link]').value.trim()
  const imageValue = document.querySelector('[data-ve-image]').value.trim()
  const altValue = document.querySelector('[data-ve-alt]').value.trim()
  const videoValue = document.querySelector('[data-ve-video]').value.trim()
  const iconValue = document.querySelector('[data-ve-icon]').value.trim()
  const colorValue = normalizeHexColor(document.querySelector('[data-ve-color-hex]').value)
    || normalizeHexColor(document.querySelector('[data-ve-color]').value)
  const rotatingValue = document.querySelector('[data-ve-rotating]').value
  const starsValue = document.querySelector('[data-ve-stars]').value

  const link = getSelectedLink()
  if (link) {
    link.setAttribute('href', linkValue || '#')
    state.attrs[link.dataset.veId || selectedElement.dataset.veId] = {
      ...(state.attrs[link.dataset.veId || selectedElement.dataset.veId] || {}),
      href: linkValue || '#',
    }
    saveAttrRef(link, { href: linkValue || '#' })
  }

  const image = getSelectedImage()
  if (image) {
    if (imageValue) image.setAttribute('src', imageValue)
    image.setAttribute('alt', altValue)
    state.attrs[image.dataset.veId || selectedElement.dataset.veId] = {
      ...(state.attrs[image.dataset.veId || selectedElement.dataset.veId] || {}),
      src: imageValue,
      alt: altValue,
    }
    saveAttrRef(image, { src: imageValue, alt: altValue })
  }

  const imagePlaceholder = getSelectedImagePlaceholder()
  if (imagePlaceholder) {
    if (imageValue) imagePlaceholder.dataset.veImageUrl = imageValue
    else imagePlaceholder.removeAttribute('data-ve-image-url')
    renderImagePlaceholder(imagePlaceholder)
    state.attrs[imagePlaceholder.dataset.veId || selectedElement.dataset.veId] = {
      ...(state.attrs[imagePlaceholder.dataset.veId || selectedElement.dataset.veId] || {}),
      'data-ve-image-url': imageValue,
    }
    saveAttrRef(imagePlaceholder, { 'data-ve-image-url': imageValue })
  }

  const video = getSelectedVideoTarget()
  if (video) {
    if (videoValue) {
      video.dataset.videoUrl = videoValue
      renderVideoEmbed(video, videoValue)
    } else {
      video.removeAttribute('data-video-url')
      restoreVideoPlaceholder(video)
    }
    state.attrs[video.dataset.veId || selectedElement.dataset.veId] = {
      ...(state.attrs[video.dataset.veId || selectedElement.dataset.veId] || {}),
      'data-video-url': videoValue,
    }
    saveAttrRef(video, { 'data-video-url': videoValue })
  }

  const icon = getSelectedIconTarget()
  if (icon && iconValue) {
    icon.innerHTML = iconValue
    state.text[icon.dataset.veId || selectedElement.dataset.veId] = cleanEditableHtml(icon.matches('svg') ? icon.outerHTML : icon.innerHTML)
  }

  const textColor = getSelectedTextColorTarget()
  if (textColor) {
    if (colorValue) textColor.style.color = colorValue
    else textColor.style.removeProperty('color')
    const styleValue = textColor.getAttribute('style') || ''
    state.attrs[textColor.dataset.veId] = {
      ...(state.attrs[textColor.dataset.veId] || {}),
      style: styleValue,
    }
    saveAttrRef(textColor, { style: styleValue })
  }

  if (selectedElement.id === 'rotating-word') {
    const words = rotatingValue.split(/\r?\n|,/).map((word) => word.trim()).filter(Boolean)
    if (words.length) {
      state.rotatingWords = words
      window.__divineRotation = {
        ...(window.__divineRotation || {}),
        words,
      }
      selectedElement.textContent = words[0]
      state.text[selectedElement.dataset.veId] = words[0]
    }
  }

  const stars = getSelectedStarsTarget()
  if (stars) {
    const rating = clampStarCount(Number.parseInt(starsValue, 10))
    stars.textContent = '★'.repeat(rating)
    saveStarRating(stars, rating)
    state.text[stars.dataset.veId || selectedElement.dataset.veId] = stars.textContent
  }

  pushHistory()
  markDirty('Applied to draft')
  updateInspector()
}

function toEmbedUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = getYouTubeId(value)
      return id ? `https://www.youtube.com/embed/${id}` : value
    }
    if (host.endsWith('youtube.com')) {
      const id = getYouTubeId(value)
      return id ? `https://www.youtube.com/embed/${id}` : value
    }
    if (host.endsWith('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}` : value
    }
  } catch {
    return value
  }
  return value
}

function getYouTubeId(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    let id = ''
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || ''
    if (host.endsWith('youtube.com')) {
      id = url.pathname.match(/\/embed\/([^/?]+)/)?.[1]
        || url.pathname.match(/\/shorts\/([^/?]+)/)?.[1]
        || url.searchParams.get('v')
        || ''
    }
    return /^[A-Za-z0-9_-]+$/.test(id) ? id : ''
  } catch {
    return ''
  }
}

function getVideoThumbnailUrl(value) {
  const youtubeId = getYouTubeId(value)
  return youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : ''
}

function getVideoMount(element) {
  if (!element) return null
  if (element.matches('.hero-vsl')) return element.querySelector('.video-container') || element
  return element.querySelector('.video-test-thumb') || element.querySelector('.video-placeholder') || element
}

function applyVideoThumbnail(element, url) {
  const mount = getVideoMount(element)
  const thumbnailUrl = getVideoThumbnailUrl(url)
  if (!mount || !thumbnailUrl) return
  mount.style.backgroundImage = `linear-gradient(rgba(30, 18, 53, 0.18), rgba(30, 18, 53, 0.32)), url("${thumbnailUrl}")`
  mount.style.backgroundSize = 'cover'
  mount.style.backgroundPosition = 'center'
  mount.dataset.veThumbnailUrl = thumbnailUrl
}

function renderVideoEmbed(element, url) {
  const mount = getVideoMount(element)
  const embedUrl = toEmbedUrl(url)
  if (!mount || !embedUrl) return
  restoreVideoPlaceholder(element)
  mount.classList.add('ve-video-has-embed')
  mount.dataset.veEmbedUrl = embedUrl
  applyVideoThumbnail(element, url)
}

function restoreVideoPlaceholder(element) {
  const mount = getVideoMount(element)
  if (!mount) return
  mount.classList.remove('ve-video-has-embed')
  delete mount.dataset.veEmbedUrl
  delete mount.dataset.veThumbnailUrl
  mount.style.removeProperty('background-image')
  mount.style.removeProperty('background-size')
  mount.style.removeProperty('background-position')
  if (element.matches('.hero-vsl')) {
    mount.innerHTML = `
      <div class="video-placeholder">
        <div class="play-icon">
          <svg class="play-triangle" width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><polygon points="7,4 20,12 7,20"/></svg>
        </div>
        See exactly how Divine works
      </div>
    `
    return
  }
  mount.innerHTML = '<div class="mini-play"><svg class="play-triangle" width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><polygon points="7,4 20,12 7,20"/></svg></div>'
}

function renderVideoEmbeds() {
  document.querySelectorAll('.hero-vsl[data-video-url], .video-test-card[data-video-url], [data-video-url]').forEach((element) => {
    renderVideoEmbed(element, element.dataset.videoUrl)
  })
}

function showToast(message) {
  let toast = document.querySelector('.ve-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 've-toast'
    document.body.append(toast)
  }
  toast.textContent = message
  toast.classList.add('show')
  clearTimeout(showToast.timeout)
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 1600)
}

function closeDialog(dialog, restoreFocusTo) {
  dialog.remove()
  restoreFocusTo?.focus()
}

function showConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
}) {
  const restoreFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const dialog = document.createElement('div')
  dialog.className = 've-dialog-backdrop'
  dialog.innerHTML = `
    <section class="ve-dialog" role="dialog" aria-modal="true" aria-labelledby="ve-dialog-title">
      <h2 id="ve-dialog-title">${title}</h2>
      <p>${message}</p>
      <div class="ve-dialog-actions">
        <button type="button" class="ve-dialog-cancel" data-ve-dialog-cancel>${cancelLabel}</button>
        <button type="button" class="ve-dialog-confirm${danger ? ' ve-dialog-danger' : ''}" data-ve-dialog-confirm>${confirmLabel}</button>
      </div>
    </section>
  `

  document.body.append(dialog)
  const cancelButton = dialog.querySelector('[data-ve-dialog-cancel]')
  const confirmButton = dialog.querySelector('[data-ve-dialog-confirm]')

  cancelButton.addEventListener('click', () => closeDialog(dialog, restoreFocusTo))
  confirmButton.addEventListener('click', () => {
    closeDialog(dialog, restoreFocusTo)
    onConfirm?.()
  })
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog, restoreFocusTo)
  })
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDialog(dialog, restoreFocusTo)
  })

  cancelButton.focus()
}

function showPasswordDialog() {
  const restoreFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const dialog = document.createElement('div')
  dialog.className = 've-dialog-backdrop'
  dialog.innerHTML = `
    <section class="ve-dialog" role="dialog" aria-modal="true" aria-labelledby="ve-password-title">
      <h2 id="ve-password-title">Change editor password</h2>
      <p>Use this password the next time this browser opens the editor.</p>
      <form class="ve-dialog-form" data-ve-password-form>
        <label>
          Current password
          <input name="currentPassword" type="password" autocomplete="current-password" required>
        </label>
        <label>
          New password
          <input name="newPassword" type="password" autocomplete="new-password" required>
        </label>
        <label>
          Confirm new password
          <input name="confirmPassword" type="password" autocomplete="new-password" required>
        </label>
        <p class="ve-auth-error" data-ve-password-error hidden></p>
        <div class="ve-dialog-actions">
          <button type="button" class="ve-dialog-cancel" data-ve-dialog-cancel>Cancel</button>
          <button type="submit" class="ve-dialog-confirm">Update password</button>
        </div>
      </form>
    </section>
  `

  document.body.append(dialog)
  const form = dialog.querySelector('[data-ve-password-form]')
  const currentInput = form.querySelector('input[name="currentPassword"]')
  const newInput = form.querySelector('input[name="newPassword"]')
  const confirmInput = form.querySelector('input[name="confirmPassword"]')
  const error = form.querySelector('[data-ve-password-error]')

  dialog.querySelector('[data-ve-dialog-cancel]').addEventListener('click', () => closeDialog(dialog, restoreFocusTo))
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const result = await changeEditorPassword(currentInput.value, newInput.value, confirmInput.value)

    if (result.ok) {
      closeDialog(dialog, restoreFocusTo)
      showToast('Password updated')
      return
    }

    error.textContent = result.error
    error.hidden = false
    currentInput.select()
    currentInput.focus()
  })
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog, restoreFocusTo)
  })
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDialog(dialog, restoreFocusTo)
  })

  currentInput.focus()
}

function getSelectedStarsTarget() {
  if (!selectedElement) return null
  if (selectedElement.matches('.hero-trust-strip .stars,.hero-test-stars,.testimonial-stars,.marquee-stars')) {
    return selectedElement
  }

  return selectedElement.querySelector('.hero-trust-strip .stars,.hero-test-stars,.testimonial-stars,.marquee-stars')
}

function getStarSelector(element) {
  if (element.matches('.hero-trust-strip .stars')) return '.hero-trust-strip .stars'
  if (element.matches('.hero-test-stars')) return '.hero-test-stars'
  if (element.matches('.testimonial-stars')) return '.testimonial-stars'
  if (element.matches('.marquee-stars')) return '.marquee-stars'
  return null
}

function saveStarRating(element, rating) {
  const selector = getStarSelector(element)
  if (!selector) return
  const index = [...document.querySelectorAll(selector)].indexOf(element)
  if (index < 0) return
  const existing = state.starRatings.find((item) => item.selector === selector && item.index === index)
  if (existing) {
    existing.rating = rating
  } else {
    state.starRatings.push({ selector, index, rating })
  }
}

function applyStarRatings(ratings) {
  if (!Array.isArray(ratings)) return
  ratings.forEach((item) => {
    const element = document.querySelectorAll(item.selector)[item.index]
    const rating = clampStarCount(Number.parseInt(item.rating, 10))
    if (element) element.textContent = '★'.repeat(rating)
  })
}

function countStars(value) {
  return Math.max(1, Math.min(5, (value.match(/★|\*/g) || []).length || 5))
}

function clampStarCount(value) {
  if (Number.isNaN(value)) return 5
  return Math.max(1, Math.min(5, value))
}

function getInsertContainer() {
  if (selectedContainer?.isConnected) return selectedContainer
  if (!selectedElement) return document.querySelector('.section-inner') || document.body
  return selectedElement.closest(containerSelector) || selectedElement.parentElement || document.body
}

function getContainerFallback(element) {
  if (!element) return 'body'
  const selectors = containerSelector.split(',').map((selector) => selector.trim())
  return selectors.find((selector) => element.matches(selector)) || 'body'
}

function prepareInsertedClone(element) {
  const clone = element.cloneNode(true)
  const id = `insert-${Date.now()}-${Math.random().toString(16).slice(2)}`
  clone.dataset.veInserted = 'true'
  clone.dataset.veInsertId = id
  clone.classList.remove('ve-selected')
  clone.classList.add('ve-inserted')
  clone.querySelectorAll('[data-ve-id], [data-ve-editable-bound], [contenteditable]').forEach((node) => {
    node.removeAttribute('data-ve-id')
    node.removeAttribute('data-ve-editable-bound')
    node.removeAttribute('contenteditable')
    node.classList.remove('ve-editable', 've-selected')
  })
  clone.removeAttribute('data-ve-id')
  clone.removeAttribute('data-ve-editable-bound')
  clone.removeAttribute('contenteditable')
  clone.classList.remove('ve-editable')
  return { clone, id }
}

function getDuplicateTarget() {
  if (!selectedElement) return null
  return selectedElement.closest(duplicateLayerSelector) || selectedElement
}

function duplicateSelected() {
  if (!selectedElement || selectedElement.closest('.ve-toolbar,.ve-inspector')) return
  const source = getDuplicateTarget()
  if (!source) return
  const parent = source.parentElement || getInsertContainer()
  if (!parent) return
  if (!parent.dataset.veId) assignIds()
  const { clone, id } = prepareInsertedClone(source)
  source.insertAdjacentElement('afterend', clone)
  const afterRef = getStableRef(source)
  state.inserts.push({
    id,
    parentId: parent.dataset.veId,
    parentSelector: getContainerFallback(parent),
    afterRef,
    html: clone.outerHTML,
  })
  assignIds()
  makeEditable()
  selectElement(clone)
  pushHistory()
  markDirty('Duplicated in draft')
}

function getRemovalTarget() {
  if (!selectedElement) return null
  return selectedElement.closest(removableSelectors)
}

function removeSelected() {
  const target = getRemovalTarget()
  if (!target || target.closest('.ve-toolbar,.ve-inspector')) return

  const insertId = target.dataset.veInsertId
  if (insertId) {
    state.inserts = state.inserts.filter((insert) => insert.id !== insertId)
  } else {
    upsertByRef(state.removals, getStableRef(target), { removed: true })
  }

  target.remove()
  selectedElement = null
  closeInspector()
  pushHistory()
  markDirty('Removed in draft')
}

function applyRemovals(removals) {
  if (!Array.isArray(removals)) return
  removals.forEach((item) => {
    const element = document.querySelectorAll(item.selector)[item.index]
    if (element) element.remove()
  })
}

function disablePageMotion() {
  document.body.classList.add('ve-editor-mode')
  if (window.__divineRotation?.intervalId) {
    clearInterval(window.__divineRotation.intervalId)
    window.__divineRotation.intervalId = null
  }
  const word = document.getElementById('rotating-word')
  if (word) word.classList.remove('slide-out', 'slide-in-prepare', 'slide-in')
}

function mountEditorUi() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="ve-control-row" aria-label="Editor controls">
    <div class="ve-toolbar ve-dock" aria-label="Visual editor controls">
      <strong class="ve-dock-title">Visual editor</strong>
      <button type="button" data-ve-undo disabled>Undo</button>
      <button type="button" data-ve-redo disabled>Redo</button>
      <button class="ve-save" type="button" data-ve-save>Saved</button>
      <button type="button" data-ve-panel>Edit selected</button>
      <button type="button" data-ve-duplicate>Duplicate</button>
      <button class="ve-danger" type="button" data-ve-remove>Remove</button>
      <button class="ve-danger" type="button" data-ve-reset>Reset</button>
      <a href="/">View page</a>
    </div>
    <div class="ve-account-dock" aria-label="Editor account controls">
      <button type="button" data-ve-change-password>Change password</button>
    </div>
    </div>
    <aside class="ve-inspector" hidden>
      <div class="ve-inspector-head">
        <strong>Selected: <span data-ve-selected-label>None</span></strong>
        <button class="ve-close" type="button" data-ve-close aria-label="Close settings">Close</button>
      </div>
      <p class="ve-help">Click directly on the page to edit. This panel stays on the canvas so the page remains full width.</p>
      <label data-ve-link-field>Link URL<input data-ve-link type="url" placeholder="https:// or #section"></label>
      <label data-ve-image-field>Image URL<input data-ve-image type="url" placeholder="https://image.jpg"></label>
      <label data-ve-image-upload-field>Upload image<input data-ve-image-upload type="file" accept="image/*"></label>
      <label data-ve-alt-field>Image alt text<input data-ve-alt type="text"></label>
      <label data-ve-video-field>Video URL<input data-ve-video type="url" placeholder="YouTube URL, or leave blank to remove embed"></label>
      <label data-ve-color-field hidden>Text color<span class="ve-color-controls"><input data-ve-color type="color" aria-label="Text color"><input data-ve-color-hex type="text" aria-label="Hex color" placeholder="#7c3aed" maxlength="7" spellcheck="false"></span></label>
      <label data-ve-rotating-field hidden>Rotating words<textarea data-ve-rotating rows="7" spellcheck="false"></textarea></label>
      <label data-ve-stars-field hidden>Star count<input data-ve-stars type="number" min="1" max="5" step="1"></label>
      <label data-ve-icon-field>Icon / SVG HTML<textarea data-ve-icon rows="5" spellcheck="false" placeholder="<svg ...></svg>"></textarea></label>
      <button type="button" data-ve-apply>Apply selected settings</button>
    </aside>
  `)

  document.querySelector('[data-ve-save]').addEventListener('click', () => saveState(true))
  document.querySelector('[data-ve-undo]').addEventListener('click', undoEdit)
  document.querySelector('[data-ve-redo]').addEventListener('click', redoEdit)
  document.querySelector('[data-ve-panel]').addEventListener('click', toggleInspector)
  document.querySelector('[data-ve-close]').addEventListener('click', closeInspector)
  document.querySelector('[data-ve-apply]').addEventListener('click', applyInspector)
  document.querySelector('[data-ve-duplicate]').addEventListener('click', duplicateSelected)
  document.querySelector('[data-ve-remove]').addEventListener('click', removeSelected)
  document.querySelector('[data-ve-change-password]').addEventListener('click', showPasswordDialog)
  document.querySelector('[data-ve-color]').addEventListener('input', (event) => {
    document.querySelector('[data-ve-color-hex]').value = event.target.value
  })
  document.querySelector('[data-ve-color-hex]').addEventListener('input', (event) => {
    const color = normalizeHexColor(event.target.value)
    if (color) document.querySelector('[data-ve-color]').value = color
  })
  document.querySelector('[data-ve-reset]').addEventListener('click', () => {
    showConfirmDialog({
      title: 'Reset visual edits?',
      message: 'This removes all saved editor changes from this browser and reloads the editor.',
      confirmLabel: 'Reset edits',
      cancelLabel: 'Keep editing',
      danger: true,
      onConfirm: () => {
        localStorage.removeItem(VISUAL_STORE_KEY)
        window.location.reload()
      },
    })
  })
  document.querySelector('[data-ve-image-upload]').addEventListener('change', handleImageUpload)
  updateUndoRedoButtons()
}

function handleImageUpload(event) {
  const file = event.target.files?.[0]
  const input = document.querySelector('[data-ve-image]')
  if (!file || !input) return

  if (file.size > MAX_INLINE_IMAGE_UPLOAD_BYTES) {
    event.target.value = ''
    showToast('Image is too large')
    return
  }

  const reader = new FileReader()
  reader.addEventListener('load', () => {
    input.value = String(reader.result || '')
    applyInspector()
    event.target.value = ''
  })
  reader.readAsDataURL(file)
}

disablePageMotion()
assignIds()
applySavedState()
assignIds()
makeEditable()
mountEditorUi()
pushHistory()
loadRemoteState()
