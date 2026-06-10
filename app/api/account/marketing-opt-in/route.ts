import { NextResponse, type NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { profiles, users } from '@/lib/db/schema'
import { logConsent } from '@/lib/consent'
import { subscribeToAudience } from '@/lib/mailchimp'

export const runtime = 'nodejs'

/**
 * Marketing opt-in toggle — Task 3.10.
 *
 * POST /api/account/marketing-opt-in  { granted: boolean }
 *
 * Updates `profiles.marketing_opt_in` AND writes a consent_log row so
 * the legal trail records every change (grant + withdrawal).
 *
 * On grant: also writes a marketingOptInAt timestamp + source='portal'.
 * On withdrawal: clears the timestamp + source. The consent_log row
 * (granted=false) preserves the withdrawal date for our records.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const userId = session.user.id

  let body: { granted?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const granted = body.granted === true
  const db = getDb()

  await db
    .update(profiles)
    .set({
      marketingOptIn: granted,
      marketingOptInAt: granted ? new Date() : null,
      marketingOptInSource: granted ? 'portal' : null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))

  await logConsent({
    userId,
    consentType: 'marketing',
    granted,
    source: 'portal',
  })

  // Sync to Mailchimp — same direction as the consent row. Fire-and-forget;
  // an outage shouldn't fail the user's preference change (the DB row is
  // the binding record). Subscribed → 'subscribed'; revoked → 'unsubscribed'.
  void (async () => {
    try {
      const [userRow] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      if (!userRow?.email) return

      const result = await subscribeToAudience({
        email: userRow.email,
        name: userRow.name ?? null,
        status: granted ? 'subscribed' : 'unsubscribed',
        tags: granted ? ['portal_opt_in'] : ['portal_opt_out'],
      })
      if (!result.ok && !('skipped' in result)) {
        console.warn('[marketing-opt-in] mailchimp sync failed:', result.error)
      }
    } catch (err) {
      console.error('[marketing-opt-in] mailchimp sync threw:', err)
    }
  })()

  return NextResponse.json({ ok: true, granted })
}
