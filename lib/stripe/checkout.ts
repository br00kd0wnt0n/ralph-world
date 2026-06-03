import 'server-only'
import type Stripe from 'stripe'
import { getStripeClient } from './client'

/**
 * Stripe Checkout session creation for the £3/month subscription —
 * Task 2.2, arch doc §9.
 *
 * Two exports:
 *   - `buildSubscriptionCheckoutParams` — PURE function that returns
 *     the Stripe params object. No SDK calls, no env reads beyond
 *     what's passed in. Fully unit-testable.
 *   - `createSubscriptionCheckout` — wraps the builder + calls the
 *     Stripe SDK. Reads env vars. The route handler at
 *     /api/checkout/subscribe is a thin shell over this.
 *
 * Customer model:
 *   - If `stripeCustomerId` is set on the profile, we pass `customer`
 *     to bind the new subscription to that existing customer record.
 *     This preserves payment-method history etc.
 *   - If not, we pass `customer_email` and let Stripe create a
 *     customer at checkout. The webhook handler (Task 2.3) catches
 *     the resulting customer id on `checkout.session.completed` and
 *     writes it to profile.stripe_customer_id.
 *
 * UK-only enforcement: `shipping_address_collection.allowed_countries:
 * ['GB']` per arch doc §9. Stripe rejects non-GB shipping addresses
 * at the Checkout UI itself. Defence-in-depth: the webhook handler
 * also validates the address country on receipt.
 *
 * The userId is passed as `metadata.user_id` so the webhook can map
 * back to our profile row even before stripe_customer_id is set.
 */

export interface BuildCheckoutParamsInput {
  userId: string
  email: string
  /** Existing Stripe customer id from profile, or null on first subscribe. */
  stripeCustomerId: string | null
  /** The Stripe Price id for the £3/mo subscription. */
  priceId: string
  /** Absolute URL — Stripe redirects here after successful checkout. */
  successUrl: string
  /** Absolute URL — Stripe redirects here if user backs out. */
  cancelUrl: string
}

export function buildSubscriptionCheckoutParams(
  input: BuildCheckoutParamsInput
): Stripe.Checkout.SessionCreateParams {
  const base: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: input.priceId, quantity: 1 }],
    // UK-only at v1. Stripe rejects non-GB addresses at the Checkout UI.
    shipping_address_collection: { allowed_countries: ['GB'] },
    // Pass userId for the webhook to map back to our profile row.
    // Stripe also surfaces this on the resulting subscription via
    // subscription_data.metadata so customer.subscription.* events
    // can find their way home too.
    metadata: { user_id: input.userId },
    subscription_data: {
      metadata: { user_id: input.userId },
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    // No promotion codes for v1 (arch doc §9 / phase-2-plan decision).
    allow_promotion_codes: false,
  }

  // Customer binding: prefer existing id, otherwise email bootstraps
  // a new customer at checkout. Stripe rejects both being set.
  if (input.stripeCustomerId) {
    base.customer = input.stripeCustomerId
    // customer_update is required when passing both `customer` and
    // `shipping_address_collection` — without it Stripe errors.
    base.customer_update = { shipping: 'auto', address: 'auto', name: 'auto' }
  } else {
    base.customer_email = input.email
  }

  return base
}

export interface CreateCheckoutInput extends Omit<BuildCheckoutParamsInput, 'priceId' | 'successUrl' | 'cancelUrl'> {
  /** Optional override; defaults to STRIPE_PRICE_ID env var. */
  priceId?: string
  /** Optional override; defaults to ${appUrl}/account?subscribed=1. */
  successUrl?: string
  /** Optional override; defaults to ${appUrl}/account. */
  cancelUrl?: string
  /** Optional override; defaults to NEXT_PUBLIC_APP_URL / AUTH_URL. */
  appUrl?: string
}

export interface CreateCheckoutResult {
  url: string
  sessionId: string
}

/**
 * Create a Stripe Checkout Session for the £3/mo subscription.
 * Calls the Stripe SDK. Throws on missing env vars or Stripe API errors.
 */
export async function createSubscriptionCheckout(
  input: CreateCheckoutInput
): Promise<CreateCheckoutResult> {
  const priceId = input.priceId ?? process.env.STRIPE_PRICE_ID
  if (!priceId) throw new Error('STRIPE_PRICE_ID is not set')

  const appUrl =
    input.appUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    'https://ralph.world'
  const successUrl = input.successUrl ?? `${trimSlash(appUrl)}/account?subscribed=1`
  const cancelUrl = input.cancelUrl ?? `${trimSlash(appUrl)}/account`

  const params = buildSubscriptionCheckoutParams({
    userId: input.userId,
    email: input.email,
    stripeCustomerId: input.stripeCustomerId,
    priceId,
    successUrl,
    cancelUrl,
  })

  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.create(params)
  if (!session.url) {
    throw new Error('Stripe returned a session with no url')
  }
  return { url: session.url, sessionId: session.id }
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/, '')
}
