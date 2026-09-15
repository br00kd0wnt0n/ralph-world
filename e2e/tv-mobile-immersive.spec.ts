import { test, expect, devices } from '@playwright/test'

/**
 * Mobile Ralph TV player — repro coverage for build prompt 01.
 *
 * Root cause under test: isMobile used to be derived from a live
 * `matchMedia('(max-width: 767px)')` query. Rotating a phone to landscape
 * widens it past 767px on almost every device (iPhone 14: 844x390, Pixel 7:
 * 851x393), which flipped isMobile to false and closed the immersive player —
 * exactly what the "Rotate your device" prompt was asking the user to do.
 * TVSet.tsx now decides "mobile" once at mount and never re-derives it from
 * viewport width, so rotating must never unmount the immersive overlay.
 *
 * The broadcaster backend isn't running in this environment, so relay-status
 * is mocked live — the poster/immersive UI only depends on that flag, not on
 * whether the underlying HLS stream actually loads.
 */

// Pick the iPhone 14 device profile's viewport/UA/touch fields individually
// rather than spreading the whole preset — it also carries
// `defaultBrowserType: 'webkit'`, which would silently switch this file to
// WebKit (not installed here; we only need Chromium's mobile emulation).
const iPhone14 = devices['iPhone 14']
test.use({
  viewport: iPhone14.viewport,
  screen: iPhone14.screen,
  userAgent: iPhone14.userAgent,
  deviceScaleFactor: iPhone14.deviceScaleFactor,
  isMobile: iPhone14.isMobile,
  hasTouch: iPhone14.hasTouch,
})

test.beforeEach(async ({ page }) => {
  await page.route('**/api/broadcaster/relay-status', (route) =>
    route.fulfill({ json: { streaming: true, available: true } }),
  )
  await page.route('**/api/broadcaster/schedule*', (route) =>
    route.fulfill({ json: [] }),
  )
  await page.route('**/api/broadcaster/now-playing*', (route) =>
    route.fulfill({ json: { streaming: true, current: null, next: null } }),
  )

  // enterImmersive() requests real element fullscreen on Android/desktop
  // browsers. Chromium under Playwright honours that as a genuine OS-level
  // fullscreen window, which then refuses further page.setViewportSize()
  // calls ("resize minimized/maximized/fullscreen window") — a test-harness
  // limitation, not something the fix depends on: the `immersive` React
  // state (and everything this spec checks) already flips regardless of
  // whether the fullscreen request actually succeeds. Stub it out so
  // rotation can be simulated via viewport resize.
  await page.addInitScript(() => {
    HTMLElement.prototype.requestFullscreen = () => Promise.resolve()
    document.exitFullscreen = () => Promise.resolve()
  })
})

async function dismissCookieBanner(page: import('@playwright/test').Page) {
  const necessaryOnly = page.getByRole('button', { name: 'Necessary only' })
  try {
    await necessaryOnly.waitFor({ state: 'visible', timeout: 3000 })
    await necessaryOnly.click()
  } catch {
    // No consent banner this run — already dismissed, or none rendered.
  }
}

test('poster at 390px opens immersive on tap and survives rotation both ways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tv')
  await dismissCookieBanner(page)

  const poster = page.getByRole('button', { name: 'Tap to watch Ralph TV' })
  await expect(poster).toBeVisible()

  await poster.click()
  const exitButton = page.getByRole('button', { name: 'Exit full screen' })
  await expect(exitButton).toBeVisible()

  // Rotate to landscape (iPhone 14: 844x390) — this used to close immersive.
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(exitButton).toBeVisible()

  // Rotate back to portrait — immersive must still be mounted.
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(exitButton).toBeVisible()

  // Exit returns to the poster with no orphaned overlay.
  await exitButton.click()
  await expect(poster).toBeVisible()
  await expect(exitButton).toBeHidden()
})

/**
 * Vertical clips (build prompt 01 Part C). The broadcaster pads a portrait
 * source into its 16:9 stream — a 9:16 clip becomes a 405x720 strip between
 * black pillars. With `aspect: 'portrait'` on /now-playing the immersive view
 * must zoom to that strip on a portrait phone (scale = (16/9) / (9/16) = 3.16),
 * drop the zoom in landscape, and flip the rotate hint to ask for portrait.
 */
test('portrait clip: zooms to the strip in portrait, hints for portrait in landscape', async ({ page }) => {
  await page.route('**/api/broadcaster/now-playing*', (route) =>
    route.fulfill({
      json: {
        streaming: true,
        current: { showName: 'Vertical Test', assetId: 'v1', aspect: 'portrait', srcWidth: 1080, srcHeight: 1920 },
        next: null,
      },
    }),
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tv')
  await dismissCookieBanner(page)

  await page.getByRole('button', { name: 'Tap to watch Ralph TV' }).click()
  const stage = page.getByTestId('immersive-stage')
  await expect(stage).toHaveAttribute('data-aspect', 'portrait')
  await expect(stage).toHaveAttribute('data-zoom', '3.16')
  await expect(page.getByText(/best in portrait/)).toBeHidden()
  await expect(page.getByText(/best in landscape/)).toBeHidden()

  // Landscape: no zoom (the strip is pillarboxed by nature), hint asks for portrait.
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(stage).toHaveAttribute('data-zoom', '1.00')
  await expect(page.getByText(/best in portrait/)).toBeVisible()

  // Back to portrait: zoom returns, hint goes.
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(stage).toHaveAttribute('data-zoom', '3.16')
  await expect(page.getByText(/best in portrait/)).toBeHidden()
})

test('landscape clip: no zoom in portrait, landscape hint as before', async ({ page }) => {
  await page.route('**/api/broadcaster/now-playing*', (route) =>
    route.fulfill({
      json: {
        streaming: true,
        current: { showName: 'Wide Test', assetId: 'w1', aspect: 'landscape', srcWidth: 1920, srcHeight: 1080 },
        next: null,
      },
    }),
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tv')
  await dismissCookieBanner(page)

  await page.getByRole('button', { name: 'Tap to watch Ralph TV' }).click()
  const stage = page.getByTestId('immersive-stage')
  await expect(stage).toHaveAttribute('data-aspect', 'landscape')
  await expect(stage).toHaveAttribute('data-zoom', '1.00')
  await expect(page.getByText(/best in landscape/)).toBeVisible()
})

test('tapping in landscape opens immersive directly', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/tv')
  await dismissCookieBanner(page)

  const poster = page.getByRole('button', { name: 'Tap to watch Ralph TV' })
  await expect(poster).toBeVisible()

  await poster.click()
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeVisible()
})
