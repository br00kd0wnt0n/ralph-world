import 'server-only'
import Stripe from 'stripe'

/**
 * Stripe SDK client — Phase 2.
 *
 * Lazy-init pattern matches lib/email/send.ts: instantiate on first use,
 * cache for the process lifetime, expose a `_resetStripeClient()` test
 * seam so unit tests can swap mocks between cases.
 *
 * Env:
 *   STRIPE_SECRET_KEY — sk_test_… or sk_live_…
 *
 * API version is pinned via the constructor so a future Stripe SDK
 * upgrade doesn't silently change webhook payload shapes on us.
 */

let cachedClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  cachedClient = new Stripe(key, {
    // No explicit apiVersion — defaults to the SDK's pinned version.
    // Bumping the SDK = bumping the API version, which is the
    // semantically right behaviour: a new SDK has been tested against
    // a new payload shape.
    appInfo: { name: 'ralph.world', url: 'https://ralph.world' },
  })
  return cachedClient
}

/** Test seam — reset the cached client. */
export function _resetStripeClient(): void {
  cachedClient = null
}
