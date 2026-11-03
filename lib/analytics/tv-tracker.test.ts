import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const trackEvent = vi.fn()
vi.mock('@/lib/gtm-client-init', () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }))

import { createTvTracker, referrerHost, ENDPOINT } from './tv-tracker'

type Sent = { url: string; body: { session_id: string; surface: string; events: { event: string }[] } }

function capture() {
  const sent: Sent[] = []
  const send = (url: string, body: string) => sent.push({ url, body: JSON.parse(body) })
  return { sent, send }
}

describe('referrerHost', () => {
  it('returns the external host without www', () => {
    expect(referrerHost('https://www.google.com/search?q=ralph', 'ralph.world')).toBe('google.com')
  })
  it('treats our own site, subdomains and empty referrers as direct', () => {
    expect(referrerHost('https://ralph.world/magazine', 'ralph.world')).toBeUndefined()
    expect(referrerHost('https://shop.ralph.world/', 'ralph.world')).toBeUndefined()
    expect(referrerHost('', 'ralph.world')).toBeUndefined()
    expect(referrerHost('not a url', 'ralph.world')).toBeUndefined()
  })
})

describe('createTvTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    trackEvent.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('sends page_view immediately with an anonymous session id and surface', () => {
    const { sent, send } = capture()
    const t = createTvTracker('tv', send)
    t.track({ event: 'page_view', props: { ref: 'google.com', is_guest: true } })
    expect(sent).toHaveLength(1)
    expect(sent[0].url).toBe(ENDPOINT)
    expect(sent[0].body.surface).toBe('tv')
    expect(sent[0].body.session_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.stringify(sent[0].body)).not.toMatch(/email|user_id/)
  })

  it('debounces ordinary events and flushes them together', () => {
    const { sent, send } = capture()
    const t = createTvTracker('tv', send)
    t.track({ event: 'play_start', muted: true })
    t.track({ event: 'heartbeat', watch_sec: 15, asset_id: 'a' })
    expect(sent).toHaveLength(0)
    vi.advanceTimersByTime(2_000)
    expect(sent).toHaveLength(1)
    expect(sent[0].body.events.map((e) => e.event)).toEqual(['play_start', 'heartbeat'])
  })

  it('flushes straight away when the tab hides, and splits batches over 25', () => {
    const { sent, send } = capture()
    const t = createTvTracker('home', send)
    for (let i = 0; i < 30; i++) t.track({ event: 'heartbeat', watch_sec: i })
    t.track({ event: 'hidden', watch_sec: 30 })
    const sizes = sent.map((s) => s.body.events.length)
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(31)
    expect(Math.max(...sizes)).toBeLessThanOrEqual(25)
  })

  it('mirrors to GTM with the ralphtv_ prefix, string params, and thinned heartbeats', () => {
    const { send } = capture()
    const t = createTvTracker('tv', send)
    t.track({ event: 'unmute', muted: false, asset_id: 'x', watch_sec: 30 })
    for (let i = 0; i < 8; i++) t.track({ event: 'heartbeat', watch_sec: i * 15 })
    t.track({ event: 'hidden' })
    const names = trackEvent.mock.calls.map((c) => c[0])
    expect(names[0]).toBe('ralphtv_unmute')
    expect(trackEvent.mock.calls[0][1]).toEqual({ surface: 'tv', asset_id: 'x', watch_seconds: '30', muted: 'false' })
    expect(names.filter((n) => n === 'ralphtv_heartbeat')).toHaveLength(2)
    expect(names).not.toContain('ralphtv_hidden')
  })

  it('stays silent in automated browsers', () => {
    const { sent, send } = capture()
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true })
    try {
      const t = createTvTracker('tv', send)
      t.track({ event: 'page_view' })
      t.flush()
      expect(sent).toHaveLength(0)
      expect(trackEvent).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true })
    }
  })
})
