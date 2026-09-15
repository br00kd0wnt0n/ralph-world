import { test, expect, devices } from '@playwright/test'

/**
 * Pixel-based orientation fallback (hooks/useContentAspect.ts) against REAL decoded
 * frames. Opt-in: needs a synthetic HLS server —
 *   bash e2e/fixtures/synth-hls/make.sh
 *   node e2e/fixtures/synth-hls/serve.mjs e2e/fixtures/synth-hls/out 8099
 *   SYNTH_HLS_BASE=http://localhost:8099 npx playwright test e2e/tv-vertical-detector.spec.ts
 *
 * Uses the installed Google Chrome (channel 'chrome'): Playwright's bundled Chromium
 * has no H.264 decoder, so hls.js would never produce a frame to sample.
 *
 * /now-playing is mocked with `aspect: null` — i.e. the broadcaster has NOT probed
 * this clip yet — so the only way the stage can learn the clip is portrait is by
 * looking at the pixels.
 */

const base = process.env.SYNTH_HLS_BASE
test.skip(!base, 'set SYNTH_HLS_BASE to a server built by e2e/fixtures/synth-hls/make.sh')

const iPhone14 = devices['iPhone 14']
test.use({
  channel: 'chrome',
  // The site's CSP only allows connect-src to the real relay/CDN hosts; the
  // synthetic stream is on localhost:<port>, which it (rightly) blocks. Bypass in
  // the harness rather than loosening the policy for a test.
  bypassCSP: true,
  viewport: iPhone14.viewport,
  screen: iPhone14.screen,
  userAgent: iPhone14.userAgent,
  deviceScaleFactor: iPhone14.deviceScaleFactor,
  isMobile: iPhone14.isMobile,
  hasTouch: iPhone14.hasTouch,
})

function mockBroadcaster(page: import('@playwright/test').Page, streamUrl: string) {
  return Promise.all([
    page.route('**/api/broadcaster/relay-status', (route) =>
      route.fulfill({ json: { streaming: true, available: true } }),
    ),
    page.route('**/api/broadcaster/schedule*', (route) => route.fulfill({ json: [] })),
    page.route('**/api/broadcaster/now-playing*', (route) =>
      route.fulfill({
        json: { streaming: true, current: { showName: 'Unprobed', assetId: 'u1', aspect: null }, next: null },
      }),
    ),
    page.route('**/api/broadcaster/relay-url', (route) => route.fulfill({ json: { url: streamUrl } })),
    page.addInitScript(() => {
      HTMLElement.prototype.requestFullscreen = () => Promise.resolve()
      document.exitFullscreen = () => Promise.resolve()
    }),
  ])
}

async function dismissCookieBanner(page: import('@playwright/test').Page) {
  const necessaryOnly = page.getByRole('button', { name: 'Necessary only' })
  try {
    await necessaryOnly.waitFor({ state: 'visible', timeout: 3000 })
    await necessaryOnly.click()
  } catch {
    /* none this run */
  }
}

test('pillarboxed portrait stream is detected from pixels and zoomed', async ({ page }) => {
  await mockBroadcaster(page, `${base}/portrait/stream.m3u8`)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tv')
  await dismissCookieBanner(page)
  await page.getByRole('button', { name: 'Tap to watch Ralph TV' }).click()

  const stage = page.getByTestId('immersive-stage')
  await expect(stage).toHaveAttribute('data-aspect', 'unknown')
  // Three agreeing 2s samples after the first decoded frame → ~8s worst case.
  await expect(stage).toHaveAttribute('data-aspect', 'portrait', { timeout: 20_000 })
  // No srcWidth/srcHeight → the 9:16 default strip → (16/9)/(9/16)
  await expect(stage).toHaveAttribute('data-zoom', '3.16')
})

test('plain landscape stream stays landscape (no false positive)', async ({ page }) => {
  await mockBroadcaster(page, `${base}/landscape/stream.m3u8`)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tv')
  await dismissCookieBanner(page)
  await page.getByRole('button', { name: 'Tap to watch Ralph TV' }).click()

  const stage = page.getByTestId('immersive-stage')
  await expect(stage).toHaveAttribute('data-aspect', 'landscape', { timeout: 20_000 })
  await expect(stage).toHaveAttribute('data-zoom', '1.00')
})
