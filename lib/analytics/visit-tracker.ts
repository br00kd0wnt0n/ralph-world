/**
 * Anonymous, cookie-free visit counter for landing pages (Issue 9 to start).
 *
 * Google Analytics only runs after "Accept all", so it can't say how many
 * ad clicks actually reached the page. This sends one ping per page load,
 * whatever the cookie choice, so the two can be compared. It also records
 * whether the cookie banner was shown and what the visitor chose, which
 * explains the gap.
 *
 * Nothing is stored on the device. The visit id is random and lives in
 * memory for this page load only. No user id, email or IP is stored; the
 * server keeps the source, device type and in-app browser only.
 */

const ENDPOINT = '/api/visits'

type Banner = 'shown' | 'already_chosen' | 'unknown'
type ConsentEvent = 'consent_all' | 'consent_necessary'

interface VisitPayload {
  visitId: string
  event: 'view' | ConsentEvent
  path: string
  landing: boolean
  utm: Record<string, string>
  fbclid: boolean
  ttclid: boolean
  liFatId: boolean
  referrerHost: string | null
  banner: Banner
}

let bannerState: Banner = 'unknown'
let lastVisit: VisitPayload | null = null
const sentConsent = new Set<string>()

/** Called by the cookie banner on page load: was it shown? */
export function noteBannerState(shown: boolean): void {
  bannerState = shown ? 'shown' : 'already_chosen'
}

/** Called by the cookie banner when the visitor picks an option. */
export function noteConsentChoice(choice: 'cookies_all' | 'cookies_necessary'): void {
  bannerState = 'already_chosen' // for any later page visited in this tab
  if (!lastVisit) return
  const event: ConsentEvent = choice === 'cookies_all' ? 'consent_all' : 'consent_necessary'
  const key = `${lastVisit.visitId}:${event}`
  if (sentConsent.has(key)) return
  sentConsent.add(key)
  send({ ...lastVisit, event })
}

function isAutomated(): boolean {
  return typeof navigator !== 'undefined' && navigator.webdriver === true
}

/** Was this the first page loaded in the tab (rather than reached by clicking around)? */
function isLandingPage(path: string): boolean {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    if (!nav?.name) return true
    return new URL(nav.name).pathname === path
  } catch {
    return true
  }
}

function referrerHost(): string | null {
  try {
    return document.referrer ? new URL(document.referrer).hostname : null
  } catch {
    return null
  }
}

function newVisitId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback for older browsers: RFC 4122 v4 shape from Math.random.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function send(payload: VisitPayload): void {
  const body = JSON.stringify(payload)
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
      if (ok) return
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {})
  } catch {
    /* never break the page over a stat */
  }
}

/**
 * Record one visit to `path`. Call once when the page mounts. Waits a tick
 * so the cookie banner (mounted later in the tree) has reported whether it
 * is showing.
 */
export function trackVisit(path: string): void {
  if (typeof window === 'undefined' || isAutomated()) return
  const params = new URLSearchParams(window.location.search)
  const utm: Record<string, string> = {}
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const v = params.get(key)
    if (v) utm[key] = v.slice(0, 100)
  }
  const landing = isLandingPage(path)
  setTimeout(() => {
    lastVisit = {
      visitId: newVisitId(),
      event: 'view',
      path,
      landing,
      utm,
      fbclid: params.has('fbclid'),
      ttclid: params.has('ttclid'),
      liFatId: params.has('li_fat_id'),
      referrerHost: landing ? referrerHost() : null,
      banner: bannerState,
    }
    send(lastVisit)
  }, 0)
}

/** Test seam. */
export function _resetVisitTracker(): void {
  bannerState = 'unknown'
  lastVisit = null
  sentConsent.clear()
}
