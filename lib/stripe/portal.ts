import 'server-only'
import { getStripeClient } from './client'

/**
 * Stripe Customer Portal session creation — Task 2.5.
 *
 * The Customer Portal is Stripe's hosted page where users can:
 *   - View invoices
 *   - Update payment method
 *   - Cancel subscription
 *
 * We don't reimplement any of that — we just create a session, redirect
 * the user there, and let Stripe handle it. Cancellation events come
 * back via the customer.subscription.deleted webhook (Task 2.3).
 *
 * Portal config (cancel/update-payment/invoices enabled) lives in the
 * Stripe Dashboard → Settings → Billing → Customer Portal. Per Task 2.1
 * setup notes.
 */

export interface CreatePortalSessionInput {
  stripeCustomerId: string
  /** Where to bounce the user back to after they're done in the portal. */
  returnUrl?: string
  /** Optional override; defaults to NEXT_PUBLIC_APP_URL / AUTH_URL. */
  appUrl?: string
}

export interface CreatePortalSessionResult {
  url: string
}

export async function createPortalSession(
  input: CreatePortalSessionInput
): Promise<CreatePortalSessionResult> {
  const appUrl =
    input.appUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    'https://ralph.world'
  const returnUrl = input.returnUrl ?? `${trimSlash(appUrl)}/account`

  const stripe = getStripeClient()
  const session = await stripe.billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: returnUrl,
  })
  if (!session.url) {
    throw new Error('Stripe billing portal returned a session with no url')
  }
  return { url: session.url }
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/, '')
}
