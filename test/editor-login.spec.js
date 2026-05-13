import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

test('keeps the public page open and protects the editor route', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/')
  await expect(page.locator('h1').first()).not.toHaveText('Editor login')

  await page.goto('http://127.0.0.1:5173/editor')
  await expect(page.getByRole('heading', { name: 'Editor login' })).toBeVisible()
  await expect(page.locator('.ve-toolbar')).toHaveCount(0)

  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.getByText('Incorrect password.')).toBeVisible()

  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()
  await expect(page.locator('.ve-toolbar')).toHaveClass(/ve-dock/)
  await expect(page.locator('.ve-dock-title')).toHaveText('Visual editor')
  await expect(page.locator('[data-ve-container]')).toHaveCount(0)

  await expect(page.locator('.discord-name').first()).toHaveAttribute('contenteditable', 'true')

  await page.locator('.screenshot-placeholder').first().click()
  await page.getByRole('button', { name: 'Edit selected' }).click()
  await expect(page.getByLabel('Image URL')).toBeVisible()

  await page.getByLabel('Image URL').fill('https://example.com/member-win.jpg')
  await page.getByRole('button', { name: 'Apply selected settings' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.goto('http://127.0.0.1:5173/')
  await expect(page.locator('.screenshot-placeholder').first()).toHaveClass(/ve-image-placeholder-filled/)
})

test('lets an unlocked editor change the local editor password from a separate account dock', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()

  await expect(page.locator('.ve-header')).toHaveCount(0)
  await expect(page.locator('.ve-toolbar')).toContainText('Visual editor')
  await expect(page.locator('.ve-toolbar')).not.toContainText('Change password')
  await expect(page.locator('.ve-toolbar')).toContainText('View page')
  await expect(page.locator('.ve-account-dock')).toBeVisible()
  await expect(page.locator('.ve-account-dock')).not.toContainText('View page')
  const toolbarBox = await page.locator('.ve-toolbar').boundingBox()
  const accountBox = await page.locator('.ve-account-dock').boundingBox()
  expect(Math.abs((toolbarBox.y + toolbarBox.height) - (accountBox.y + accountBox.height))).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByRole('dialog', { name: 'Change editor password' })).toBeVisible()

  await page.getByLabel('Current password').fill('change-this-password')
  await page.getByLabel('New password', { exact: true }).fill('updated-editor-password')
  await page.getByLabel('Confirm new password').fill('updated-editor-password')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByText('Password updated')).toBeVisible()

  await page.evaluate(() => sessionStorage.removeItem('divine.editor.auth.v1'))
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.getByText('Incorrect password.')).toBeVisible()

  await page.getByLabel('Password').fill('updated-editor-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()
})

test('edits hero review cards and Whop proof row text', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()

  await page.locator('.hero-test-card blockquote').first().fill('"Updated reseller win from the editor."')
  await page.locator('.hero-test-author').first().fill('- Updated Member')
  await page.locator('.hero-proof-label').fill('4,501+ Reviews on')
  await page.locator('.hero-proof-note').fill('Free for 5 days. Cancel anytime.')
  await expect(page.locator('.hero-proof-badge')).toHaveText('Whop')
  await expect(page.locator('.hero-proof-badge img')).toHaveJSProperty('complete', true)
  await page.locator('[data-ve-key="hero-test-1-stars"]').click()
  await page.getByRole('button', { name: 'Edit selected' }).click()
  await page.getByLabel('Star count').fill('4')
  await page.getByRole('button', { name: 'Apply selected settings' }).click()
  await expect(page.locator('[data-ve-key="hero-test-1-stars"]')).toHaveText('★★★★')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.goto('http://127.0.0.1:5173/')
  await expect(page.locator('.hero-test-card blockquote').first()).toHaveText('"Updated reseller win from the editor."')
  await expect(page.locator('.hero-test-author').first()).toHaveText('- Updated Member')
  await expect(page.locator('[data-ve-key="hero-test-1-stars"]')).toHaveText('★★★★')
  await expect(page.locator('.hero-proof-label')).toHaveText('4,501+ Reviews on')
  await expect(page.locator('.hero-proof-note')).toHaveText('Free for 5 days. Cancel anytime.')
})

test('ignores legacy testimonial refs when saving keyed hero review edits', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/')
  await page.evaluate(() => {
    localStorage.setItem('divine.visual.page.v1', JSON.stringify({
      text: {},
      attrs: {},
      attrRefs: [],
      inserts: [],
      rotatingWords: null,
      starRatings: [
        { selector: '.hero-test-stars', index: 0, rating: 3 },
      ],
      textRefs: [
        { selector: '.hero-test-card blockquote', index: 0, html: 'Legacy quote that should not come back' },
        { selector: '.hero-test-author', index: 0, html: '- Legacy Author' },
      ],
      removals: [],
    }))
  })

  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()
  await expect(page.locator('[data-ve-key="hero-test-1-quote"]')).not.toHaveText('Legacy quote that should not come back')
  await expect(page.locator('[data-ve-key="hero-test-1-quote"]')).toHaveAttribute('contenteditable', 'true')

  await page.locator('[data-ve-key="hero-test-1-quote"]').fill('"Clean saved testimonial."')
  await page.locator('[data-ve-key="hero-test-1-author"]').fill('- Clean Author')
  await page.locator('[data-ve-key="hero-test-1-stars"]').click()
  await page.getByRole('button', { name: 'Edit selected' }).click()
  await page.getByLabel('Star count').fill('4')
  await page.getByRole('button', { name: 'Apply selected settings' }).click()
  await expect(page.locator('[data-ve-key="hero-test-1-stars"]')).toHaveText('★★★★')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.goto('http://127.0.0.1:5173/')
  await expect(page.locator('[data-ve-key="hero-test-1-quote"]')).toHaveText('"Clean saved testimonial."')
  await expect(page.locator('[data-ve-key="hero-test-1-author"]')).toHaveText('- Clean Author')
  await expect(page.locator('[data-ve-key="hero-test-1-stars"]')).toHaveText('★★★★')
})

test('renders a branded 404 for unknown slugs', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/sdadasd')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back home' })).toHaveAttribute('href', '/')
  await expect(page.getByRole('link', { name: 'Open editor' })).toHaveCount(0)
  await expect(page.locator('.hero')).toHaveCount(0)
})

test('exposes footer social links and final review section text in the editor', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()

  await expect(page.locator('.final-cta span').filter({ hasText: '4,500+ Reviews on' })).toHaveAttribute('contenteditable', 'true')

  await page.locator('.footer-socials a svg').first().click()
  await page.getByRole('button', { name: 'Edit selected' }).click()
  await expect(page.getByLabel('Link URL')).toBeVisible()

  await page.getByLabel('Link URL').fill('https://x.com/divine')
  await page.getByRole('button', { name: 'Apply selected settings' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.goto('http://127.0.0.1:5173/')
  await expect(page.locator('.footer-socials a').first()).toHaveAttribute('href', 'https://x.com/divine')
})

test('edits proof layer headlines without duplicating original text', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()

  const headline = page.locator('[data-ve-key="proof-video-headline"]')
  await headline.fill('Member stories that prove it works')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.goto('http://127.0.0.1:5173/')
  await expect(page.locator('[data-ve-key="proof-video-headline"]')).toHaveText('Member stories that prove it works')
  await expect(page.locator('[data-ve-key="proof-video-headline"]')).not.toContainText('Hear it from members who started where you are')
})

test('exposes previously skipped page copy in the editor', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()

  await expect(page.locator('.hero-headline-suffix')).toHaveAttribute('contenteditable', 'true')
  await expect(page.locator('.video-placeholder')).toHaveAttribute('contenteditable', 'true')
  await expect(page.locator('.comp-header div').nth(1)).toHaveAttribute('contenteditable', 'true')
  await expect(page.locator('.marquee-card blockquote').first()).toHaveAttribute('contenteditable', 'true')
  await expect(page.locator('.step-num').first()).toHaveAttribute('contenteditable', 'true')

  await page.locator('.hero-headline-suffix').fill('PROFIT')
  await page.locator('.comp-header div').nth(1).fill('Divine wins')
  await page.locator('.marquee-card blockquote').first().fill('"Updated marquee proof."')
  await page.locator('.step-num').first().fill('A1')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.goto('http://127.0.0.1:5173/')
  await expect(page.locator('.hero-headline-suffix')).toHaveText('PROFIT')
  await expect(page.locator('.comp-header div').nth(1)).toHaveText('Divine wins')
  await expect(page.locator('.marquee-card blockquote').first()).toHaveText('"Updated marquee proof."')
  await expect(page.locator('.step-num').first()).toHaveText('A1')
})

test('changes selected text color from the editor inspector', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()

  await page.locator('.hero-sub').click()
  await page.getByRole('button', { name: 'Edit selected' }).click()
  await expect(page.getByLabel('Text color')).toBeVisible()
  await page.getByLabel('Text color').fill('#ff0000')
  await page.getByRole('button', { name: 'Apply selected settings' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.goto('http://127.0.0.1:5173/')
  await expect(page.locator('.hero-sub')).toHaveCSS('color', 'rgb(255, 0, 0)')
})

test('accepts typed hex text colors in the editor inspector', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()

  await page.locator('.section-sub').first().click()
  await page.getByRole('button', { name: 'Edit selected' }).click()
  await expect(page.getByLabel('Hex color')).toHaveValue(/#[0-9a-f]{6}/i)
  await page.getByLabel('Hex color').fill('#16a34a')
  await page.getByRole('button', { name: 'Apply selected settings' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.goto('http://127.0.0.1:5173/')
  await expect(page.locator('.section-sub').first()).toHaveCSS('color', 'rgb(22, 163, 74)')
})

test('keeps video testimonial card position stable when hovering the play button', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/')
  const card = page.locator('.video-test-card').first()
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveClass(/visible|video-test-card/)
  await page.waitForTimeout(500)
  const playButton = card.locator('.mini-play')
  const before = await playButton.boundingBox()
  await page.mouse.move((before?.x || 0) + (before?.width || 0) / 2, (before?.y || 0) + (before?.height || 0) / 2)
  const after = await playButton.boundingBox()

  expect(after?.x).toBeCloseTo(before?.x || 0, 0)
  expect(after?.y).toBeCloseTo(before?.y || 0, 0)
  expect(after?.width).toBeCloseTo(before?.width || 0, 0)
  expect(after?.height).toBeCloseTo(before?.height || 0, 0)
})

test('keeps video testimonial play button stable in the editor', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()

  const card = page.locator('.video-test-card').first()
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const playButton = card.locator('.mini-play')
  const before = await playButton.boundingBox()
  await playButton.hover()
  const after = await playButton.boundingBox()

  expect(after?.x).toBeCloseTo(before?.x || 0, 0)
  expect(after?.y).toBeCloseTo(before?.y || 0, 0)
  expect(after?.width).toBeCloseTo(before?.width || 0, 0)
  expect(after?.height).toBeCloseTo(before?.height || 0, 0)
})

test('uses an in-app confirmation dialog for reset edits', async ({ page }) => {
  await page.addInitScript(() => {
    window.confirm = () => {
      window.__browserConfirmCalled = true
      return false
    }
  })

  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()

  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByRole('dialog', { name: 'Reset visual edits?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Keep editing' })).toBeVisible()

  const browserConfirmCalled = await page.evaluate(() => window.__browserConfirmCalled === true)
  expect(browserConfirmCalled).toBe(false)
})

test('rejects oversized inline image uploads before they inflate saved state', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/editor')
  await page.getByLabel('Password').fill('change-this-password')
  await page.getByRole('button', { name: 'Unlock editor' }).click()
  await expect(page.locator('.ve-toolbar')).toBeVisible()

  await page.locator('.screenshot-placeholder').first().click()
  await page.getByRole('button', { name: 'Edit selected' }).click()
  await page.locator('[data-ve-image-upload]').setInputFiles({
    name: 'large-proof.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(800_001),
  })

  await expect(page.getByText('Image is too large')).toBeVisible()
  await expect(page.getByLabel('Image URL')).not.toHaveValue(/data:image/)
})
