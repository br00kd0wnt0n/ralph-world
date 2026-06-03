import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { createSubscriptionCheckout } from '@/lib/stripe/checkout'

/**
 * Paid-tier checkout entry — Phase 2 (Stripe).
 *
 * Replaces the Phase-0 Shopify-Subscriptions flow that lived here.
 * Multiple callers still link to /api/account/upgrade:
 *   - SubscribeModal (post-OAuth redirect target)
 *   - /account auto-redirect on `?upgrade=paid` (from the same modal)
 *   - Direct links scattered across the site
 *
 * Keeping the URL stable saves a multi-file refactor. The behaviour
 * changed: we now create a Stripe Checkout session and 303 to it.
 *
 * Failure modes:
 *   - Not signed in → /login?callbackUrl=/account
 *   - Stripe fails → /account?upgrade=error (existing UI surfaces a banner)
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.redirect(
      new URL('/login?callbackUrl=/account', baseUrl())
    )
  }

  // Find existing stripe_customer_id (resubscribe case).
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
    console.error('[account/upgrade] profile lookup failed:', err)
    return NextResponse.redirect(
      new URL('/account?upgrade=error', baseUrl())
    )
  }

  if (tier === 'paid') {
    // Already paid — no-op redirect to /account.
    return NextResponse.redirect(new URL('/account', baseUrl()))
  }

  try {
    const { url } = await createSubscriptionCheckout({
      userId: session.user.id,
      email: session.user.email,
      stripeCustomerId,
    })
    return NextResponse.redirect(url, { status: 303 })
  } catch (err) {
    console.error('[account/upgrade] Stripe Checkout creation failed:', err)
    return NextResponse.redirect(
      new URL('/account?upgrade=error', baseUrl())
    )
  }
}

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    'http://localhost:3000'
  )
}
