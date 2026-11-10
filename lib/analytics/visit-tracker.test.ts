// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetVisitTracker,
  noteBannerState,
  noteConsentChoice,
  trackVisit,
} from './visit-tracker'

type Sent = { url: string; body: Record<string, unknown> }
let sent: Sent[]

beforeEach(() => {
  vi.useFakeTimers()
  sent = []
  _resetVisitTracker()
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: (url: string, blob: Blob) => {
      void blob.text().then((t) => sent.push({ url, body: JSON.parse(t) }))
      return true
    },
  })
  window.history.replaceState(null, '', '/issue9?utm_source=ig&utm_medium=paid_social&utm_content=Unboxing&fbclid=abc')
})
afterEach(() => {
  vi.useRealTimers()
})

async function flush() {
  vi.runAllTimers()
  await vi.waitFor(() => expect(sent.length).toBeGreaterThan(0))
}

describe('visit tracker', () => {
  it('sends one view with UTMs, click ids and the banner state', async () => {
    trackVisit('/issue9')
    noteBannerState(true) // banner mounts after the page
    await flush()
    expect(sent).toHaveLength(1)
    const b = sent[0].body
    expect(sent[0].url).toBe('/api/visits')
    expect(b.event).toBe('view')
    expect(b.path).toBe('/issue9')
    expect(b.utm).toEqual({ utm_source: 'ig', utm_medium: 'paid_social', utm_content: 'Unboxing' })
    expect(b.fbclid).toBe(true)
    expect(b.ttclid).toBe(false)
    expect(b.banner).toBe('shown')
    expect(String(b.visitId)).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('sends the cookie choice once, against the same visit', async () => {
    trackVisit('/issue9')
    await flush()
    noteConsentChoice('cookies_all')
    noteConsentChoice('cookies_all')
    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(sent[1].body.event).toBe('consent_all')
    expect(sent[1].body.visitId).toBe(sent[0].body.visitId)
  })

  it('sends nothing for a cookie choice with no tracked visit', () => {
    noteConsentChoice('cookies_necessary')
    expect(sent).toHaveLength(0)
  })

  it('stores nothing on the device', async () => {
    const before = { ls: localStorage.length, ss: sessionStorage.length, ck: document.cookie }
    trackVisit('/issue9')
    await flush()
    expect(localStorage.length).toBe(before.ls)
    expect(sessionStorage.length).toBe(before.ss)
    expect(document.cookie).toBe(before.ck)
  })

  it('stays silent for automated browsers', () => {
    Object.defineProperty(navigator, 'webdriver', { configurable: true, value: true })
    trackVisit('/issue9')
    vi.runAllTimers()
    expect(sent).toHaveLength(0)
    Object.defineProperty(navigator, 'webdriver', { configurable: true, value: false })
  })
})
