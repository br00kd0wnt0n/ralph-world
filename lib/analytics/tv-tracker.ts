/**
 * Ralph TV player analytics — first-party, anonymous.
 *
 * Events go to our own /api/broadcaster/events route, which forwards them to
 * the broadcaster backend (the Ralph TV /stats page reads them from there).
 *
 * Privacy design (agreed with Brook, 2026-11-03):
 *  - The session id is a random UUID held in memory for one page load. Nothing
 *    is written to cookies, localStorage or sessionStorage, so nothing is
 *    stored on the visitor's device and no consent banner choice is needed.
 *  - No user id, email or IP is sent. `is_guest` is the most identity we carry.
 *  - The same events are mirrored to GTM as `ralphtv_<name>`; that path stays
 *    consent-gated because trackEvent() no-ops until analytics cookies are
 *    accepted.
 *
 * Event names must match EVENTS in ~/ralphTV/backend/src/analytics-ingest.js.
 */
import { trackEvent } from '@/lib/gtm-client-init'

export type TvSurface = 'tv' | 'home' | 'embed'

export type TvEventName =
  | 'page_view' | 'play_start' | 'heartbeat' | 'show_change'
  | 'unmute' | 'mute' | 'tap_to_watch' | 'immersive_exit' | 'fullscreen_enter'
  | 'overlay_open' | 'gate_shown' | 'subscribe_click' | 'offline_view'
  | 'stall' | 'error' | 'hidden' | 'visible'
  | 'vod_play' | 'back_to_live' | 'share'

export interface TvEvent {
  event: TvEventName
  asset_id?: string | null
  offset_sec?: number | null
  watch_sec?: number | null
  muted?: boolean | null
  props?: Record<string, string | number | boolean | undefined>
}

export const HEARTBEAT_SEC = 15
export const ENDPOINT = '/api/broadcaster/events'
const MAX_BATCH = 25
const FLUSH_DELAY_MS = 2_000
/** GA gets one heartbeat a minute — enough for watch-time Explores, less noise. */
const GTM_HEARTBEAT_EVERY = 4

// Events GA doesn't need (tab focus churn).
const GTM_SKIP = new Set<TvEventName>(['hidden', 'visible'])

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // RFC 4122 v4 from Math.random — old Safari only; fine for an anonymous id.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Automated browsers (Playwright, crawlers that run JS) never report. */
function isAutomated(): boolean {
  return typeof navigator !== 'undefined' && navigator.webdriver === true
}

/**
 * Referrer host for the page_view, e.g. "google.com". Our own site and empty
 * referrers return undefined ("direct" on the stats page).
 */
export function referrerHost(referrer: string, ownHost: string): string | undefined {
  if (!referrer) return undefined
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '')
    const own = ownHost.replace(/^www\./, '')
    if (!host || host === own || host.endsWith(`.${own}`)) return undefined
    return host
  } catch {
    return undefined
  }
}

export interface TvTracker {
  readonly sessionId: string
  track(e: TvEvent): void
  /** Send whatever is queued now (tab hidden / page closing). */
  flush(): void
}

type Sender = (url: string, body: string) => void

function defaultSender(url: string, body: string): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      if (ok) return
    }
    void fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {})
  } catch {
    /* analytics must never break the player */
  }
}

/** One tracker per player page load. */
export function createTvTracker(surface: TvSurface, send: Sender = defaultSender): TvTracker {
  const sessionId = uuid()
  const disabled = typeof window === 'undefined' || isAutomated()
  let queue: TvEvent[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  let heartbeats = 0

  function flush() {
    if (timer) { clearTimeout(timer); timer = null }
    while (queue.length) {
      const events = queue.slice(0, MAX_BATCH)
      queue = queue.slice(MAX_BATCH)
      send(ENDPOINT, JSON.stringify({ session_id: sessionId, surface, events }))
    }
  }

  function mirrorToGtm(e: TvEvent) {
    if (GTM_SKIP.has(e.event)) return
    if (e.event === 'heartbeat' && heartbeats++ % GTM_HEARTBEAT_EVERY !== 0) return
    const params: Record<string, string> = { surface }
    if (e.asset_id) params.asset_id = e.asset_id
    if (e.offset_sec != null) params.offset_sec = String(e.offset_sec)
    if (e.watch_sec != null) params.watch_seconds = String(e.watch_sec)
    if (e.muted != null) params.muted = String(e.muted)
    for (const [k, v] of Object.entries(e.props ?? {})) if (v !== undefined) params[k] = String(v)
    trackEvent(`ralphtv_${e.event}`, params)
  }

  function track(e: TvEvent) {
    if (disabled) return
    queue.push(e)
    mirrorToGtm(e)
    // Exits and page views go straight out; the rest ride a short debounce.
    if (e.event === 'hidden' || e.event === 'page_view' || queue.length >= MAX_BATCH) flush()
    else if (!timer) timer = setTimeout(flush, FLUSH_DELAY_MS)
  }

  return { sessionId, track, flush }
}
