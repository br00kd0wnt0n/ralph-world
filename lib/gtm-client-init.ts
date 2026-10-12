/**
 * Lazy Google Tag Manager initialisation.
 *
 * Same consent-gated pattern as initSentryClient() in sentry-client-init.ts —
 * CookieBanner calls this once the visitor has accepted analytics cookies
 * (or has previously accepted, on mount for returning visitors).
 *
 * Idempotent — safe to call multiple times.
 */

let initialised = false

export function initGTM(): void {
  if (initialised) return
  if (typeof window === 'undefined') return
  const id = process.env.NEXT_PUBLIC_GTM_ID
  // No container ID configured = nothing to initialise. Keeps dev/staging quiet.
  if (!id) return

  type DataLayerEvent = { 'gtm.start': number; event: string }
  const w = window as unknown as { dataLayer?: DataLayerEvent[] }
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}&l=dataLayer`
  document.head.appendChild(script)

  initialised = true
}

/**
 * Push a custom event to the GTM dataLayer. No-op until initGTM() has run,
 * i.e. until the visitor has accepted analytics cookies.
 */
export function trackEvent(event: string, params: Record<string, string> = {}): void {
  if (!initialised || typeof window === 'undefined') return
  const w = window as unknown as { dataLayer?: Record<string, unknown>[] }
  w.dataLayer?.push({ event, ...params })
}
