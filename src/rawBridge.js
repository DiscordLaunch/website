import {
  createSupabaseBrowserClient,
  loadRemoteVisualState,
  readLocalVisualState,
} from './cmsStorage.js'
import { sanitizeInlineHtml, sanitizeInlineStyle, sanitizeUrl } from './safeContent.js'

const STORAGE_KEY = 'divine.cms.content.v2'
const visualEditableSelector = [
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

function readContent() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function readVisualState() {
  return readLocalVisualState()
}

function assignVisualIds() {
  const elements = [
    ...document.querySelectorAll(visualEditableSelector),
    ...document.querySelectorAll('section, .section-inner, .hero-vsl, .video-testimonial-grid, .testimonial-marquee-window, .review-marquee-track, .screenshot-wall-track, .screenshot-wall-row, .card-grid-4, .testimonial-grid, .steps-row, .footer-socials'),
  ]
  elements.forEach((element, index) => {
    if (!element.dataset.veId) element.dataset.veId = element.dataset.veKey || `ve-${index}`
  })
}

function applyVisualState(visualState = readVisualState()) {
  if (!visualState) return
  assignVisualIds()

  if (Array.isArray(visualState.rotatingWords) && visualState.rotatingWords.length) {
    const words = visualState.rotatingWords.map((word) => String(word).trim()).filter(Boolean)
    const rotatingWord = document.getElementById('rotating-word')
    if (words.length && rotatingWord) rotatingWord.textContent = words[0]
    if (window.__divineRotation) window.__divineRotation.words = words
  }

  Object.entries(visualState.text || {}).forEach(([id, html]) => {
    const element = document.querySelector(`[data-ve-id="${id}"]`)
    if (element) element.innerHTML = sanitizeInlineHtml(html)
  })

  Object.entries(visualState.attrs || {}).forEach(([id, attrs]) => {
    const element = document.querySelector(`[data-ve-id="${id}"]`)
    if (!element) return
    Object.entries(attrs).forEach(([name, value]) => {
      if (value === '' && name === 'data-video-url') element.removeAttribute(name)
      else if (value) setSafeAttribute(element, name, value)
    })
  })
  applyAttrRefs(visualState.attrRefs)
  applyTextRefs(visualState.textRefs)
  renderImagePlaceholders()
  renderVideoEmbeds()

  ;(visualState.inserts || []).forEach((insert) => {
    if (document.querySelector(`[data-ve-insert-id="${insert.id}"]`)) return
    const fallbackParent = insert.parentSelector ? document.querySelector(insert.parentSelector) : null
    const parent = fallbackParent || document.querySelector(`[data-ve-id="${insert.parentId}"]`)
    if (!parent) return
    const afterElement = insert.afterRef
      ? document.querySelectorAll(insert.afterRef.selector)[insert.afterRef.index]
      : null
    const html = sanitizeInlineHtml(insert.html)
    if (afterElement?.parentElement === parent) afterElement.insertAdjacentHTML('afterend', html)
    else parent.insertAdjacentHTML('beforeend', html)
  })

  applyStarRatings(visualState.starRatings)
  applyRemovals(visualState.removals)
  renderImagePlaceholders()
  renderVideoEmbeds()
}

async function applyRemoteVisualState() {
  try {
    const supabase = await createSupabaseBrowserClient()
    if (!supabase) return
    const visualState = await loadRemoteVisualState(supabase)
    if (visualState) applyVisualState(visualState)
  } catch (error) {
    console.warn('Unable to load visual editor state from Supabase.', error)
  }
}

function applyTextRefs(refs) {
  if (!Array.isArray(refs)) return
  refs.forEach((item) => {
    const element = document.querySelectorAll(item.selector)[item.index]
    if (element) element.innerHTML = sanitizeInlineHtml(item.html)
  })
}

function setSafeAttribute(element, name, value) {
  if (name === 'href') {
    const safeUrl = sanitizeUrl(value)
    if (safeUrl) element.setAttribute(name, safeUrl)
    else element.removeAttribute(name)
    return
  }

  if (name === 'src' || name === 'data-ve-image-url') {
    const safeUrl = sanitizeUrl(value, { allowDataImage: name === 'data-ve-image-url' })
    if (safeUrl) element.setAttribute(name, safeUrl)
    else element.removeAttribute(name)
    return
  }

  if (name === 'data-video-url') {
    const safeUrl = sanitizeUrl(value, { allowRelative: false })
    if (safeUrl) element.setAttribute(name, safeUrl)
    else element.removeAttribute(name)
    return
  }

  if (name === 'style') {
    const safeStyle = sanitizeInlineStyle(value)
    if (safeStyle) element.setAttribute(name, safeStyle)
    else element.removeAttribute(name)
    return
  }

  if (name.startsWith('on')) return
  element.setAttribute(name, value)
}

function applyAttrRefs(refs) {
  if (!Array.isArray(refs)) return
  refs.forEach((item) => {
    const element = document.querySelectorAll(item.selector)[item.index]
    if (!element) return
    Object.entries(item.attrs || {}).forEach(([name, value]) => {
      if (value === '' && name === 'data-video-url') element.removeAttribute(name)
      else if (value === '' && name === 'data-ve-image-url') element.removeAttribute(name)
      else setSafeAttribute(element, name, value)
    })
  })
}

function renderImagePlaceholder(element) {
  if (!element) return
  const imageUrl = sanitizeUrl(element.dataset.veImageUrl, { allowDataImage: true })
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

function applyRemovals(removals) {
  if (!Array.isArray(removals)) return
  removals.forEach((item) => {
    const element = document.querySelectorAll(item.selector)[item.index]
    if (element) element.remove()
  })
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

function toAutoplayEmbedUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    url.searchParams.set('autoplay', '1')
    if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      url.searchParams.set('playsinline', '1')
    }
    return url.toString()
  } catch {
    const separator = value.includes('?') ? '&' : '?'
    return `${value}${separator}autoplay=1`
  }
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
  const embedUrl = sanitizeUrl(toEmbedUrl(url), { allowRelative: false })
  if (!mount || !embedUrl) return
  ensureVideoEmbedStyle()
  restoreVideoPlaceholder(element)
  mount.classList.add('ve-video-has-embed')
  mount.dataset.veEmbedUrl = embedUrl
  applyVideoThumbnail(element, url)
  mount.setAttribute('role', 'button')
  mount.setAttribute('tabindex', '0')
  const play = (event) => {
    event.preventDefault()
    event.stopPropagation()
    mount.removeAttribute('role')
    mount.removeAttribute('tabindex')
    mount.style.removeProperty('background-image')
    mount.style.removeProperty('background-size')
    mount.style.removeProperty('background-position')
    mount.innerHTML = videoIframeMarkup(toAutoplayEmbedUrl(embedUrl))
  }
  mount.onclick = play
  mount.onkeydown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    play(event)
  }
}

function videoIframeMarkup(embedUrl) {
  return `
    <iframe
      class="ve-video-embed"
      src="${String(embedUrl).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"
      title="Embedded video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      loading="lazy"></iframe>
  `
}

function restoreVideoPlaceholder(element) {
  const mount = getVideoMount(element)
  if (!mount) return
  mount.classList.remove('ve-video-has-embed')
  mount.onclick = null
  mount.onkeydown = null
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

function ensureVideoEmbedStyle() {
  if (document.getElementById('ve-video-embed-style')) return
  const style = document.createElement('style')
  style.id = 've-video-embed-style'
  style.textContent = `
    .ve-video-has-embed{position:relative}
    .ve-video-has-embed{cursor:pointer}
    .ve-video-embed{position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;border:0;background:#000}
  `
  document.head.append(style)
}

function applyStarRatings(ratings) {
  if (!Array.isArray(ratings)) return
  ratings.forEach((item) => {
    const element = document.querySelectorAll(item.selector)[item.index]
    const rating = Math.max(1, Math.min(5, Number.parseInt(item.rating, 10) || 5))
    if (element) element.textContent = '★'.repeat(rating)
  })
}

function setElementText(selector, value) {
  if (!value) return
  const element = document.querySelector(selector)
  if (element) element.textContent = value
}

function setTextBesideIcon(selector, value) {
  if (!value) return
  const element = document.querySelector(selector)
  if (!element) return
  const icon = element.querySelector('svg,img')
  element.textContent = ''
  if (icon) element.append(icon)
  element.append(document.createTextNode(value))
}

function setButtonText(selector, value) {
  if (!value) return
  document.querySelectorAll(selector).forEach((button) => {
    const icon = button.querySelector('svg,img')
    button.textContent = value
    if (icon) button.append(icon)
  })
}

function setLink(selector, url) {
  const safeUrl = sanitizeUrl(url)
  if (!safeUrl) return
  document.querySelectorAll(selector).forEach((link) => {
    link.setAttribute('href', safeUrl)
  })
}

function renderStats(selector, stats, valueClass, labelClass) {
  if (!Array.isArray(stats)) return
  const items = document.querySelectorAll(selector)
  items.forEach((item, index) => {
    const stat = stats[index]
    if (!stat) return
    const value = item.querySelector(valueClass)
    const label = item.querySelector(labelClass)
    if (value) value.textContent = stat.value || ''
    if (label) label.textContent = stat.label || ''
  })
}

function applyHero(content) {
  setTextBesideIcon('.logo', content.brand?.name)
  setTextBesideIcon('.footer-logo', content.brand?.name)
  setElementText('.hero-headline-prefix', content.hero?.titlePrefix)
  setElementText('#rotating-word', content.hero?.rotatingWords?.[0])
  const word = document.querySelector('#rotating-word')
  const wrap = document.querySelector('.rotating-wrap')
  if (word && wrap) wrap.style.width = `${word.offsetWidth}px`
  setElementText('.hero-sub', content.hero?.subtitle)
  setButtonText('.hero-cta-row .btn-primary', content.hero?.primaryCta)
  setLink('.header-cta', content.links?.headerCta)
  setLink('.hero-cta-row .btn-primary', content.links?.heroCta)
  setLink('.final-cta .btn-primary', content.links?.finalCta)

  setElementText('.hero-headline-suffix', content.hero?.titleSuffix)
}

function applyVideos(content) {
  const heroPlay = document.querySelector('.video-placeholder .play-icon')
  const heroVideo = document.querySelector('.hero-vsl')
  if (heroPlay && content.videos?.hero?.label) {
    const label = document.createTextNode(content.videos.hero.label)
    const placeholder = document.querySelector('.video-placeholder')
    placeholder.textContent = ''
    placeholder.append(heroPlay, label)
  }
  if (heroVideo && content.videos?.hero?.url) {
    heroVideo.dataset.videoUrl = content.videos.hero.url
    renderVideoEmbed(heroVideo, content.videos.hero.url)
  }

  if (!Array.isArray(content.videos?.testimonials)) return
  const grid = document.querySelector('.video-testimonial-grid')
  if (!grid) return
  grid.innerHTML = ''
  content.videos.testimonials.forEach((video) => {
    const card = document.createElement('div')
    card.className = 'video-test-card'
    const thumb = document.createElement('div')
    thumb.className = 'video-test-thumb'
    thumb.innerHTML = '<div class="mini-play"><svg class="play-triangle" width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><polygon points="7,4 20,12 7,20"/></svg></div>'
    const label = document.createElement('div')
    label.className = 'vt-label'
    label.textContent = video.title || 'Video testimonial'
    card.append(thumb, label)
    if (video.url) {
      card.dataset.videoUrl = video.url
      renderVideoEmbed(card, video.url)
    }
    grid.append(card)
  })
}

function applyStats(content) {
  renderStats('.trust-strip .trust-stat', content.stats, '.num', '.label')
  renderStats('.stats-grid .stat-block', content.stats, '.stat-num', '.stat-label')
}

function applyComparison(content) {
  if (content.why?.heading) {
    const heading = document.querySelector('#why .section-headline-lg')
    if (heading) heading.textContent = content.why.heading
  }

  if (!Array.isArray(content.why?.rows)) return
  const rows = document.querySelectorAll('#why .comp-row')
  rows.forEach((row, index) => {
    const item = content.why.rows[index]
    if (!item) return
    const cells = row.querySelectorAll('div')
    if (cells[0]) cells[0].textContent = item.feature || ''
    if (cells[1]) cells[1].textContent = item.divine || ''
    if (cells[2]) cells[2].textContent = item.others || ''
  })
}

function applyCards(content) {
  if (content.inside?.heading) {
    const heading = document.querySelector('#inside .section-headline, .card-grid-4')?.closest('.section-inner')?.querySelector('.section-headline-lg, .section-headline')
    if (heading) heading.textContent = content.inside.heading
  }

  if (!Array.isArray(content.inside?.cards)) return
  const grid = document.querySelector('.card-grid-4')
  if (!grid) return
  grid.innerHTML = ''
  content.inside.cards.forEach((item) => {
    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = '<div class="card-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/></svg></div>'
    const title = document.createElement('h3')
    title.textContent = item.title || ''
    const body = document.createElement('p')
    body.textContent = item.body || ''
    card.append(title, body)
    grid.append(card)
  })
}

function applyHow(content) {
  if (content.how?.heading) {
    const heading = document.querySelector('#how .section-headline-lg')
    if (heading) heading.textContent = content.how.heading
  }
  if (content.how?.subtitle) {
    const subtitle = document.querySelector('#how .section-sub')
    if (subtitle) subtitle.textContent = content.how.subtitle
  }

  if (!Array.isArray(content.how?.steps)) return
  document.querySelectorAll('#how .step').forEach((step, index) => {
    const item = content.how.steps[index]
    if (!item) return
    const title = step.querySelector('h3')
    const body = step.querySelector('p')
    if (title) title.textContent = item.title || ''
    if (body) body.textContent = item.body || ''
  })
}

function applyFaq(content) {
  if (!Array.isArray(content.faq)) return
  const list = document.querySelector('#faq .accordion')
  if (!list) return
  list.innerHTML = content.faq.map((item) => `
    <div class="accordion-item">
      <button class="accordion-trigger">${escapeFaqText(item.question)} <span class="icon">+</span></button>
      <div class="accordion-body"><div class="accordion-body-inner">${sanitizeInlineHtml(item.answer)}</div></div>
    </div>
  `).join('')
}

function applyTestimonials(content) {
  if (!Array.isArray(content.testimonials)) return

  const heroGrid = document.querySelector('.hero-testimonials')
  if (heroGrid) {
    heroGrid.innerHTML = ''
    content.testimonials.slice(0, 2).forEach((item) => {
      const card = document.createElement('div')
      card.className = 'hero-test-card'
      card.innerHTML = '<div class="hero-test-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>'
      const quote = document.createElement('blockquote')
      quote.textContent = `"${item.quote || ''}"`
      const author = document.createElement('div')
      author.className = 'hero-test-author'
      author.textContent = `— ${item.name || ''}`
      card.append(quote, author)
      heroGrid.append(card)
    })
  }

  const grid = document.querySelector('.testimonial-grid')
  if (!grid) return
  grid.innerHTML = ''
  content.testimonials.forEach((item) => {
    const card = document.createElement('div')
    card.className = 'testimonial-card'
    card.innerHTML = '<div class="testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>'
    const quote = document.createElement('blockquote')
    quote.textContent = `"${item.quote || ''}"`
    const author = document.createElement('div')
    author.className = 'testimonial-author'
    author.textContent = `— ${item.name || ''}`
    card.append(quote, author)
    grid.append(card)
  })
}

const socialIcons = {
  x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  instagram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>',
  tiktok: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.17a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.6z"/></svg>',
  youtube: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
}

function applySocials(content) {
  if (!Array.isArray(content.socials)) return
  const container = document.querySelector('.footer-socials')
  if (!container) return
  container.innerHTML = ''
  content.socials.forEach((social) => {
    const link = document.createElement('a')
    link.href = sanitizeUrl(social.url) || '#'
    link.setAttribute('aria-label', social.label || social.icon || 'Social link')
    link.innerHTML = socialIcons[(social.icon || '').toLowerCase()] || socialIcons.x
    container.append(link)
  })
}

function escapeFaqText(value) {
  const span = document.createElement('span')
  span.textContent = value || ''
  return span.innerHTML
}

const content = readContent()
if (content) {
  applyHero(content)
  applyVideos(content)
  applyStats(content)
  applyComparison(content)
  applyCards(content)
  applyHow(content)
  applyTestimonials(content)
  applyFaq(content)
  applySocials(content)
}

applyVisualState()
applyRemoteVisualState()
