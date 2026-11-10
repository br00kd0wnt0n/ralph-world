/**
 * Classifies an anonymous page visit (see lib/analytics/visit-tracker.ts and
 * app/api/visits/route.ts). Pure, so it runs and is tested server-side.
 */

export type VisitSource =
  | 'meta'
  | 'tiktok'
  | 'linkedin'
  | 'email'
  | 'google'
  | 'other'
  | 'direct'
  | 'internal'

export interface VisitSignals {
  /** True when this page was the first one loaded (not reached by clicking around the site). */
  landing: boolean
  utmSource?: string | null
  utmMedium?: string | null
  fbclid?: boolean
  ttclid?: boolean
  liFatId?: boolean
  referrerHost?: string | null
}

const META_UTM = /^(fb|facebook|ig|instagram|meta|msg|messenger|an|audience_network|ig_.*|fb_.*)$/
const EMAIL_UTM = /^(email|newsletter|mailchimp|substack|shopify|klaviyo|resend)$/
const PAID_MEDIUM = /(paid|cpc|ppc|cpm|^ads?$|_ads?$|^ads?_|display)/

function hostMatches(host: string, domains: string[]): boolean {
  return domains.some((d) => host === d || host.endsWith(`.${d}`))
}

export function classifySource(s: VisitSignals): VisitSource {
  if (!s.landing) return 'internal'
  if (s.ttclid) return 'tiktok'
  if (s.liFatId) return 'linkedin'

  const src = s.utmSource?.trim().toLowerCase()
  const medium = s.utmMedium?.trim().toLowerCase()
  if (src) {
    if (META_UTM.test(src)) return 'meta'
    if (src === 'tiktok') return 'tiktok'
    if (src === 'linkedin' || src === 'li') return 'linkedin'
    if (EMAIL_UTM.test(src) || medium === 'email') return 'email'
    if (src === 'google') return 'google'
    return 'other'
  }
  if (medium === 'email') return 'email'
  // Meta adds fbclid to outbound links from organic posts too, so it marks
  // the platform, not whether it was an ad.
  if (s.fbclid) return 'meta'

  const host = s.referrerHost?.trim().toLowerCase()
  if (!host) return 'direct'
  if (hostMatches(host, ['ralph.world'])) return 'internal'
  if (hostMatches(host, ['facebook.com', 'instagram.com', 'fb.com', 'fb.me', 'messenger.com']))
    return 'meta'
  if (hostMatches(host, ['tiktok.com'])) return 'tiktok'
  if (hostMatches(host, ['linkedin.com', 'lnkd.in'])) return 'linkedin'
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'google'
  return 'other'
}

/** A paid ad click: tagged as paid, or carrying a TikTok/LinkedIn ad click id. */
export function isPaidVisit(s: VisitSignals): boolean {
  if (s.ttclid || s.liFatId) return true
  const medium = s.utmMedium?.trim().toLowerCase()
  return Boolean(medium && PAID_MEDIUM.test(medium))
}

export type VisitBrowser = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'browser'

/** Which app's built-in browser the page opened in, if any. */
export function classifyBrowser(ua: string): VisitBrowser {
  if (/Instagram/i.test(ua)) return 'instagram'
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(ua)) return 'facebook'
  if (/musical_ly|BytedanceWebview|TikTok|trill_/i.test(ua)) return 'tiktok'
  if (/LinkedInApp/i.test(ua)) return 'linkedin'
  return 'browser'
}

export function classifyDevice(ua: string): 'mobile' | 'desktop' {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile' : 'desktop'
}

const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|go-http|node-fetch|axios|java\//i

export function isBotUserAgent(ua: string | null | undefined): boolean {
  return !ua || BOT_UA.test(ua)
}

/** Hostname only, lower-cased; null for anything that isn't a plausible host. */
export function cleanHost(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase().slice(0, 200)
  return /^[a-z0-9.-]+$/.test(v) && v.includes('.') ? v : null
}
