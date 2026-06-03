'use server'

import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { createSubscriptionCheckout } from '@/lib/stripe/checkout'
import { createPortalSession } from '@/lib/stripe/portal'

/**
 * /account server actions — Task 2.5.
 *
 * Two flows, both end in a Next.js redirect() that throws (so the
 * actions never return on the happy path):
 *
 *   - startSubscriptionCheckout — for free/guest users. Creates a
 *     Stripe Checkout session and redirects there.
 *   - openBillingPortal — for paid users. Creates a Stripe Customer
 *     Portal session and redirects there. Portal handles cancel /
 *     update payment / view invoices.
 *
 * Errors land on /account?upgrade=error (legacy param name — the
 * existing UI already renders a friendly banner for it).
 */

export async function startSubscriptionCheckout(): Promise<void> {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    redirect('/login?callbackUrl=/account')
  }

  // Find existing stripe_customer_id if any (so the new subscription
  // is bound to the same Stripe customer record across cancel/resub).
  let stripeCustomerId: string | null = null
  let tier: string | null = null
  try {
    const db = getDb()
    const [row] = await db
      .select({
        tier: profiles.tier,
        stripeCustomerId: profiles.stripeCustomerId,
      })
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .limit(1)
    if (row) {
      tier = row.tier
      stripeCustomerId = row.stripeCustomerId
    }
  } catch (err) {
    console.error('[account/checkout] profile lookup failed:', err)
    redirect('/account?upgrade=error')
  }

  if (tier === 'paid') {
    // Already paid — don't let them double-subscribe.
    redirect('/account')
  }

  let url: string
  try {
    const result = await createSubscriptionCheckout({
      userId: session.user.id,
      email: session.user.email,
      stripeCustomerId,
    })
    url = result.url
  } catch (err) {
    console.error('[account/checkout] Stripe Checkout creation failed:', err)
    redirect('/account?upgrade=error')
  }
  redirect(url)
}

export async function openBillingPortal(): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/account')
  }

  let stripeCustomerId: string | null = null
  try {
    const db = getDb()
    const [row] = await db
      .select({ stripeCustomerId: profiles.stripeCustomerId })
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .limit(1)
    stripeCustomerId = row?.stripeCustomerId ?? null
  } catch (err) {
    console.error('[account/portal] profile lookup failed:', err)
    redirect('/account?upgrade=error')
  }

  if (!stripeCustomerId) {
    // Not subscribed — nothing to manage. Bounce back.
    redirect('/account')
  }

  let url: string
  try {
    const result = await createPortalSession({ stripeCustomerId })
    url = result.url
  } catch (err) {
    console.error('[account/portal] Stripe portal creation failed:', err)
    redirect('/account?upgrade=error')
  }
  redirect(url)
}
