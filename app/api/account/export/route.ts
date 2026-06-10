import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import {
  users,
  profiles,
  consentLog,
  shopifyLinks,
  emailEvents,
  magazineShipments,
  eventRsvps,
} from '@/lib/db/schema'
import { logAction } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * DSAR — Subject Access Request endpoint (Task 3.10, UK GDPR Art. 15).
 *
 * GET /api/account/export
 *
 * Returns a JSON dump of all personal data we hold about the authenticated
 * user. Triggers an audit log row ('account_data_exported') for our records.
 *
 * Deliberately omits:
 *   - the bcrypt password hash (sensitive credential, not personal data)
 *   - audit_log rows (kept under legitimate interest / legal obligation;
 *     editor mentioned in arch doc §13)
 *
 * For full reach (e.g. Stripe billing history, Shopify orders), the
 * privacy policy directs users to email hello@ralph.world for an
 * extended export — those processors hold their own copies.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !session.user?.email) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const userId = session.user.id

  const db = getDb()

  // Fetch every table that has personal data on this user.
  const [
    userRow,
    profileRow,
    consents,
    shopifyLink,
    emailHistory,
    shipments,
    rsvps,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
    db.select().from(consentLog).where(eq(consentLog.userId, userId)),
    db.select().from(shopifyLinks).where(eq(shopifyLinks.userId, userId)),
    db.select().from(emailEvents).where(eq(emailEvents.email, session.user.email)),
    db.select().from(magazineShipments).where(eq(magazineShipments.userId, userId)),
    db.select().from(eventRsvps).where(eq(eventRsvps.userId, userId)),
  ])

  await logAction({
    actorId: userId,
    action: 'account_data_exported',
    targetType: 'user',
    targetId: userId,
    source: 'portal',
  })

  const payload = {
    generatedAt: new Date().toISOString(),
    notice:
      'This export covers the data Ralph holds directly. For data held by processors (Stripe billing, Shopify orders, Resend email logs >90 days, Sentry error reports), email hello@ralph.world.',
    user: userRow[0] ?? null,
    profile: profileRow[0] ?? null,
    consents,
    shopifyLink: shopifyLink[0] ?? null,
    emailEvents: emailHistory,
    magazineShipments: shipments,
    eventRsvps: rsvps,
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ralph-world-data-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    },
  })
}
