import { NextResponse, type NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { createPortalSession } from '@/lib/stripe/portal'

export const runtime = 'nodejs'

/**
 * Stripe Customer Portal entry point — Task 2.5.
 *
 * POST /api/account/portal (auth required, profile must have
 * stripe_customer_id). Creates a Stripe Billing Portal session and
 * returns the redirect URL. Client navigates the user there.
 *
 * Failure modes:
 *   401 — not signed in
 *   404 — profile has no stripe_customer_id (haven't subscribed yet)
 *   500 — Stripe API failure or missing env var
 */
export async function POST(_request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
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
    return NextResponse.json({ ok: false, error: 'profile_lookup_failed' }, { status: 500 })
  }

  if (!stripeCustomerId) {
    return NextResponse.json(
      { ok: false, error: 'no_stripe_customer' },
      { status: 404 }
    )
  }

  try {
    const { url } = await createPortalSession({ stripeCustomerId })
    return NextResponse.json({ ok: true, url })
  } catch (err) {
    console.error('[account/portal] Stripe portal creation failed:', err)
    return NextResponse.json(
      { ok: false, error: 'portal_creation_failed' },
      { status: 500 }
    )
  }
}
