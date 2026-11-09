/**
 * Keeps a Facebook ad click (`fbclid`) linked to the visit when the visitor
 * accepts cookies on a later page than the one they landed on.
 *
 * Meta's pixel only turns `fbclid` into its `_fbc` cookie if the parameter
 * is still in the address bar when the pixel starts. Our pixel starts after
 * "Accept all" (via GTM), so a visitor who lands from an ad, browses, then
 * accepts on another page loses the click, and Meta can't credit the sale
 * (Shopify checkout reads `_fbc` from the shared .ralph.world cookie).
 *
 * The click id is held in memory only (nothing stored before consent) and
 * written as `_fbc` in Meta's own format when the visitor accepts.
 * Format: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc
 */

const ROOT_DOMAIN = 'ralph.world'
const NINETY_DAYS = 90 * 24 * 60 * 60

let landing: { id: string; at: number } | null = null

/** Read fbclid from the landing URL. First call wins; later calls are no-ops. */
export function captureLandingClickId(search: string = window.location.search): void {
  if (landing) return
  const id = new URLSearchParams(search).get('fbclid')
  if (id && /^[A-Za-z0-9_-]{1,500}$/.test(id)) landing = { id, at: Date.now() }
}

function readCookie(name: string): string | null {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return hit ? hit.slice(name.length + 1) : null
}

/**
 * Write `_fbc` for the captured click. Call only after "Accept all", and
 * before the Meta pixel starts so it picks the cookie up.
 */
export function persistClickIdAfterConsent(): void {
  if (!landing || typeof document === 'undefined') return
  const existing = readCookie('_fbc')
  if (existing && existing.endsWith(`.${landing.id}`)) return // already recorded

  const host = window.location.hostname
  const onRalph = host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)
  // Subdomain index 1 = cookie on ralph.world, shared with shop.ralph.world.
  const value = `fb.1.${landing.at}.${landing.id}`
  document.cookie =
    `_fbc=${value}; path=/; max-age=${NINETY_DAYS}; SameSite=Lax` +
    (onRalph ? `; domain=.${ROOT_DOMAIN}; Secure` : '')
}

/** Test seam. */
export function _resetLandingClickId(): void {
  landing = null
}

// Capture on first load, at the landing URL, before any client-side navigation.
if (typeof window !== 'undefined') captureLandingClickId()
