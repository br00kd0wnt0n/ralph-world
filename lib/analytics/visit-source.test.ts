import { describe, expect, it } from 'vitest'
import {
  classifyBrowser,
  classifyDevice,
  classifySource,
  cleanHost,
  isBotUserAgent,
  isPaidVisit,
} from './visit-source'

const IG_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0'
const FB_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]'
const TT_UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6'
const LI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30'
const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'

describe('classifySource', () => {
  it('maps Meta dynamic site_source_name values and plain names to meta', () => {
    for (const s of ['fb', 'ig', 'facebook', 'Instagram', 'msg', 'an', 'ig_stories'])
      expect(classifySource({ landing: true, utmSource: s })).toBe('meta')
  })
  it('uses ad click ids for TikTok and LinkedIn', () => {
    expect(classifySource({ landing: true, ttclid: true })).toBe('tiktok')
    expect(classifySource({ landing: true, liFatId: true })).toBe('linkedin')
  })
  it('treats fbclid without UTMs as Meta', () => {
    expect(classifySource({ landing: true, fbclid: true })).toBe('meta')
  })
  it('recognises email and unknown utm sources', () => {
    expect(classifySource({ landing: true, utmSource: 'shopify', utmMedium: 'email' })).toBe('email')
    expect(classifySource({ landing: true, utmSource: 'newsletter' })).toBe('email')
    expect(classifySource({ landing: true, utmSource: 'reddit' })).toBe('other')
  })
  it('falls back to the referrer host', () => {
    expect(classifySource({ landing: true, referrerHost: 'l.instagram.com' })).toBe('meta')
    expect(classifySource({ landing: true, referrerHost: 'www.google.co.uk' })).toBe('google')
    expect(classifySource({ landing: true, referrerHost: 'www.linkedin.com' })).toBe('linkedin')
    expect(classifySource({ landing: true, referrerHost: 'shop.ralph.world' })).toBe('internal')
    expect(classifySource({ landing: true, referrerHost: 'news.ycombinator.com' })).toBe('other')
    expect(classifySource({ landing: true })).toBe('direct')
  })
  it('marks pages reached by clicking around the site as internal', () => {
    expect(classifySource({ landing: false, utmSource: 'ig' })).toBe('internal')
  })
  it('does not treat a lookalike host as Meta', () => {
    expect(classifySource({ landing: true, referrerHost: 'notfacebook.com' })).toBe('other')
  })
})

describe('isPaidVisit', () => {
  it('is paid for paid mediums and ad click ids', () => {
    expect(isPaidVisit({ landing: true, utmMedium: 'paid_social' })).toBe(true)
    expect(isPaidVisit({ landing: true, utmMedium: 'paid' })).toBe(true)
    expect(isPaidVisit({ landing: true, utmMedium: 'cpc' })).toBe(true)
    expect(isPaidVisit({ landing: true, ttclid: true })).toBe(true)
    expect(isPaidVisit({ landing: true, liFatId: true })).toBe(true)
  })
  it('is not paid for fbclid alone, organic or email', () => {
    expect(isPaidVisit({ landing: true, fbclid: true })).toBe(false)
    expect(isPaidVisit({ landing: true, utmMedium: 'manychat' })).toBe(false)
    expect(isPaidVisit({ landing: true, utmMedium: 'email' })).toBe(false)
    expect(isPaidVisit({ landing: true, utmMedium: 'social' })).toBe(false)
  })
})

describe('browser, device and bots', () => {
  it('detects in-app browsers', () => {
    expect(classifyBrowser(IG_UA)).toBe('instagram')
    expect(classifyBrowser(FB_UA)).toBe('facebook')
    expect(classifyBrowser(TT_UA)).toBe('tiktok')
    expect(classifyBrowser(LI_UA)).toBe('linkedin')
    expect(classifyBrowser(MAC_UA)).toBe('browser')
  })
  it('detects device type', () => {
    expect(classifyDevice(IG_UA)).toBe('mobile')
    expect(classifyDevice(TT_UA)).toBe('mobile')
    expect(classifyDevice(MAC_UA)).toBe('desktop')
  })
  it('drops crawlers and link-preview fetchers but not real browsers', () => {
    expect(isBotUserAgent('facebookexternalhit/1.1')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBotUserAgent('curl/8.4.0')).toBe(true)
    expect(isBotUserAgent(null)).toBe(true)
    for (const ua of [IG_UA, FB_UA, TT_UA, LI_UA, MAC_UA]) expect(isBotUserAgent(ua)).toBe(false)
  })
  it('accepts only plain host names', () => {
    expect(cleanHost('L.Instagram.com')).toBe('l.instagram.com')
    expect(cleanHost('https://x.com/a')).toBeNull()
    expect(cleanHost('localhost')).toBeNull()
    expect(cleanHost(42)).toBeNull()
  })
})
