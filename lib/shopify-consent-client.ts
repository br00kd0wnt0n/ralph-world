/**
 * Passes the ralph.world cookie banner choice to Shopify checkout.
 *
 * The shop is headless: browsing and the basket are on ralph.world, but
 * checkout is Shopify-hosted on shop.ralph.world, which shows no banner of
 * its own. Without this, Shopify treats UK/EU buyers as "not consented" for
 * the whole checkout and blocks the Meta app pixel's Purchase event.
 *
 * Shopify's Customer Privacy API records the choice in a `_tracking_consent`
 * cookie on .ralph.world, which checkout on shop.ralph.world reads. Same call
 * and parameters as Hydrogen's useCustomerPrivacy.
 * Docs: https://shopify.dev/docs/api/customer-privacy
 */

const CONSENT_API_SRC =
  'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js'
const CHECKOUT_DOMAIN = 'shop.ralph.world'
const STOREFRONT_ROOT_DOMAIN = 'ralph.world'

type Consent = {
  analytics: boolean
  marketing: boolean
  preferences: boolean
  sale_of_data: boolean
}

type CustomerPrivacy = {
  setTrackingConsent: (
    consent: Record<string, unknown>,
    callback: (result?: { error?: unknown }) => void
  ) => void
  currentVisitorConsent?: () => Partial<Record<keyof Consent, string>>
}

function getApi(): CustomerPrivacy | undefined {
  const w = window as unknown as { Shopify?: { customerPrivacy?: CustomerPrivacy } }
  return w.Shopify?.customerPrivacy
}

let loading: Promise<CustomerPrivacy | undefined> | null = null

function loadApi(): Promise<CustomerPrivacy | undefined> {
  if (loading) return loading
  loading = new Promise((resolve) => {
    const existing = getApi()
    if (existing) return resolve(existing)
    const script = document.createElement('script')
    script.src = CONSENT_API_SRC
    script.async = true
    script.onload = () => resolve(getApi())
    script.onerror = () => {
      loading = null // allow a retry on the next choice
      resolve(undefined)
    }
    document.head.appendChild(script)
  })
  return loading
}

/** True only on ralph.world itself, where the cookie can reach checkout. */
function onRalphWorld(): boolean {
  const host = window.location.hostname
  return host === STOREFRONT_ROOT_DOMAIN || host.endsWith(`.${STOREFRONT_ROOT_DOMAIN}`)
}

/**
 * Record the visitor's banner choice with Shopify.
 *
 * @param granted  true for "Accept all", false for "Necessary only".
 * @param token    The public Storefront API token.
 * @param onlyIfDifferent  Skip the call when Shopify already has this
 *   choice. Used on page load for returning visitors.
 */
export async function syncShopifyConsent(
  granted: boolean,
  token: string | undefined,
  { onlyIfDifferent = false }: { onlyIfDifferent?: boolean } = {}
): Promise<void> {
  if (typeof window === 'undefined' || !token || !onRalphWorld()) return
  try {
    const api = await loadApi()
    if (!api) return

    if (onlyIfDifferent) {
      const current = api.currentVisitorConsent?.()
      const want = granted ? 'yes' : 'no'
      if (current?.analytics === want && current?.marketing === want) return
    }

    const consent: Consent = {
      analytics: granted,
      marketing: granted,
      preferences: granted,
      sale_of_data: granted,
    }
    api.setTrackingConsent(
      {
        ...consent,
        headlessStorefront: true,
        checkoutRootDomain: CHECKOUT_DOMAIN,
        storefrontRootDomain: STOREFRONT_ROOT_DOMAIN,
        storefrontAccessToken: token,
      },
      (result) => {
        if (result?.error) console.error('[shopify-consent]', result.error)
      }
    )
  } catch (err) {
    console.error('[shopify-consent]', err)
  }
}
