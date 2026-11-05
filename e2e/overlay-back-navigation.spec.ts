import { test, expect, type Page } from '@playwright/test'

// Back/Forward around the magazine, shop and events overlays. Those overlays
// write URLs behind Next's back (History.prototype, null state), which Next's
// popstate handler ignores. Leaving via a link and pressing Back used to show
// the right URL over the wrong page. See lib/overlay-history.ts.
//
// Read-only: only navigates and opens overlays. Runs against the dev server
// or PLAYWRIGHT_BASE_URL. Needs at least one published article and product.

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
] as const

// The article overlay (the cookie banner is a non-modal dialog too).
const ARTICLE_DIALOG = '[role="dialog"][aria-modal="true"]'

const TITLES = {
  '/magazine': /^Magazine \| Ralph/,
  '/shop': /^Shop \| Ralph/,
  '/events': /^Events \| Ralph/,
  '/lab': /^Lab \| Ralph/,
} as const

/** Click an in-site link the way a reader would (nav or mobile menu). */
async function goViaLink(page: Page, href: keyof typeof TITLES) {
  const visible = page.locator(`a[href="${href}"]:visible`).first()
  if ((await visible.count()) === 0) {
    await page.getByRole('button', { name: 'Open menu' }).click()
  }
  await page.locator(`a[href="${href}"]:visible`).first().click()
  await expect(page).toHaveURL(new RegExp(`${href}$`))
  await expect(page).toHaveTitle(TITLES[href])
}

/** URL path and the page Next actually rendered (via its metadata title). */
async function expectPage(page: Page, path: string, title: RegExp) {
  await expect(page).toHaveURL((url) => url.pathname === path)
  await expect(page).toHaveTitle(title)
}

for (const vp of VIEWPORTS) {
  test.describe(`overlay Back navigation @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('magazine: direct article link → close → Shop → Back', async ({ page }) => {
      await page.goto('/magazine')
      const slug = await firstArticleSlug(page)
      await page.goto(`/magazine/${slug}`)
      await expect(page.locator(ARTICLE_DIALOG)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page).toHaveURL(/\/magazine$/)

      await goViaLink(page, '/shop')
      await page.goBack()
      await expectPage(page, '/magazine', TITLES['/magazine'])
      await expect(page.locator('.mag-grid-card').first()).toBeVisible()
      await expect(page.locator(ARTICLE_DIALOG)).toHaveCount(0)

      // Forward returns to the shop, natively.
      await page.goForward()
      await expectPage(page, '/shop', TITLES['/shop'])
    })

    test('magazine: grid card → close → Shop → Back → Back', async ({ page }) => {
      await page.goto('/magazine')
      await openFirstArticle(page)
      await page.keyboard.press('Escape')
      await expect(page).toHaveURL(/\/magazine$/)

      await goViaLink(page, '/shop')
      await page.goBack()
      await expectPage(page, '/magazine', TITLES['/magazine'])

      // One more Back: the article entry, handled by the magazine page itself.
      await page.goBack()
      await expect(page).toHaveURL(/\/magazine\/[^/]+$/)
      await expect(page).toHaveTitle(TITLES['/magazine'])
    })

    test('magazine: in-page Back/Forward keeps the page mounted', async ({ page }) => {
      await page.goto('/magazine')
      // Marker survives only if the page is not re-mounted.
      await page.evaluate(() => document.querySelector('.mag-grid-card')?.setAttribute('data-e2e-mark', '1'))
      const slug = await openFirstArticle(page)

      await page.goBack()
      await expect(page).toHaveURL(/\/magazine$/)
      await expect(page.locator(ARTICLE_DIALOG)).toHaveCount(0)

      await page.goForward()
      await expect(page).toHaveURL(new RegExp(`/magazine/${slug}$`))
      await expect(page).toHaveTitle(TITLES['/magazine'])
      await expect(page.locator('.mag-grid-card[data-e2e-mark="1"]')).toHaveCount(1)
    })

    test('shop: product → close → Magazine → Back', async ({ page }) => {
      const handle = await openFirstProduct(page)
      await page.getByRole('button', { name: '< Back' }).click()
      await expect(page).toHaveURL(/\/shop$/)

      await goViaLink(page, '/magazine')
      await page.goBack()
      await expectPage(page, '/shop', TITLES['/shop'])

      // The product entry belongs to the shop page: URL only, no re-render.
      await page.goBack()
      await expect(page).toHaveURL(new RegExp(`/shop/${handle}$`))
      await expect(page).toHaveTitle(TITLES['/shop'])
    })

    test('events: panel → close → Lab → Back', async ({ page }) => {
      // There may be no upcoming events to open, so replay the exact history
      // calls MinglingCharacters makes (handleShowMore, then closeExpanded).
      await page.goto('/events')
      await expect(page).toHaveTitle(TITLES['/events'])
      await page.evaluate(() => {
        History.prototype.pushState.call(window.history, null, '', '/events/e2e-fake')
        History.prototype.pushState.call(window.history, null, '', '/events')
      })

      await goViaLink(page, '/lab')
      await page.goBack()
      await expectPage(page, '/events', TITLES['/events'])
      await page.goBack()
      await expect(page).toHaveURL(/\/events\/e2e-fake$/)
      await expect(page).toHaveTitle(TITLES['/events'])
    })
  })
}

function lastSegment(page: Page): string {
  return new URL(page.url()).pathname.split('/')[2]
}

async function firstArticleSlug(page: Page): Promise<string> {
  const slug = await openFirstArticle(page)
  await page.keyboard.press('Escape')
  return slug
}

async function openFirstArticle(page: Page): Promise<string> {
  await page.locator('.mag-grid-card:visible').first().click()
  await expect(page).toHaveURL(/\/magazine\/[^/]+$/)
  await expect(page.locator(ARTICLE_DIALOG)).toBeVisible()
  return lastSegment(page)
}

/** Opens the first product that shows in place (some redirect to a campaign page). */
async function openFirstProduct(page: Page): Promise<string> {
  const back = page.getByRole('button', { name: '< Back' })
  for (let i = 0; i < 6; i++) {
    await page.goto('/shop')
    await page.locator('.group > button:has(img):visible').nth(i).click()
    try {
      await expect(back).toBeVisible({ timeout: 5000 })
      await expect(page).toHaveURL(/\/shop\/[^/]+$/)
      return lastSegment(page)
    } catch {
      // Redirected (e.g. Issue 9 → /issue9): try the next card.
    }
  }
  throw new Error('No product opened in place on /shop')
}
