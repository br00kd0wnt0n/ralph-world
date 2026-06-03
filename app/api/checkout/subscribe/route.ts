import { NextResponse, type NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { createSubscriptionCheckout } from '@/lib/stripe/checkout'

export const runtime = 'nodejs'

/**
 * Stripe Checkout session creation — Task 2.2, arch doc §9.
 *
 * POST /api/checkout/subscribe
 *   - Auth required.
 *   - Reads the caller's profile to find an existing stripe_customer_id
 *     (if they've subscribed before and then cancelled, we want to bind
 *     this new subscription to the same Stripe customer record).
 *   - Refuses if the caller is already on tier='paid' — saves them
 *     from being double-charged.
 *   - Returns { url } on success. Client redirects.
 *
 * Failure modes:
 *   401 — not signed in
 *   409 — already subscribed (tier=paid)
 *   500 — Stripe API failure or missing env var
 *
 * Response shape:
 *   { ok: true, url: string }
 *   { ok: false, error: string }
 */
export async function POST(_request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
  }

  // Look up profile for tier check + existing Stripe customer id.
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
    console.error('[checkout/subscribe] profile lookup failed:', err)
    return NextResponse.json({ ok: false, error: 'profile_lookup_failed' }, { status: 500 })
  }

  if (tier === 'paid') {
    return NextResponse.json(
      { ok: false, error: 'already_subscribed' },
      { status: 409 }
    )
  }

  try {
    const { url } = await createSubscriptionCheckout({
      userId: session.user.id,
      email: session.user.email,
      stripeCustomerId,
    })
    return NextResponse.json({ ok: true, url })
  } catch (err) {
    console.error('[checkout/subscribe] Stripe Checkout creation failed:', err)
    return NextResponse.json(
      { ok: false, error: 'checkout_creation_failed' },
      { status: 500 }
    )
  }
}
