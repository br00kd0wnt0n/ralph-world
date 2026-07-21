import { NextResponse, type NextRequest } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { auth, signOut } from '@/lib/auth'
import { getDb } from '@/lib/db'
import {
  users,
  profiles,
  accounts,
  sessions,
  consentLog,
  shopifyLinks,
  eventRsvps,
} from '@/lib/db/schema'
import { logAction } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Account erasure — UK GDPR Art. 17 right to be forgotten (Task 3.10).
 *
 * POST /api/account/delete
 *
 * What we delete:
 *   - users row (cascades into accounts, sessions, profiles, shopify_links,
 *     event_rsvps via ON DELETE CASCADE)
 * What we null out (retain the row, set user_id = null):
 *   - consent_log — legal record of consent / withdrawal must survive the
 *     user. ON DELETE SET NULL on the FK.
 *   - audit_log — same reasoning. ON DELETE SET NULL on actor_id.
 * What we keep as-is (legal/financial retention):
 *   - magazine_shipments (under contract / billing retention, 6 years)
 *   - stripe_events / shopify orders held by processors
 *   - email_events keyed on email (not user_id), kept for deliverability
 *     forensics. Will rotate out under our 90-day retention.
 *
 * The audit_log row IS written BEFORE the user delete so actorId is
 * still valid; after the delete the row's actorId nulls itself via FK.
 *
 * Idempotent: re-calling for an already-deleted user returns 200 with
 * a no-op message (the session would be gone in any case).
 */
export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const userId = session.user.id
  const email = session.user.email ?? null

  const db = getDb()

  try {
    // Write audit BEFORE delete (actorId FK still valid + targetId stable).
    await logAction({
      actorId: userId,
      action: 'account_deleted',
      targetType: 'user',
      targetId: userId,
      before: { email },
      source: 'portal',
    })

    // Explicit pre-pass on consent_log so we can prove the linkage was
    // severed even on databases where ON DELETE SET NULL isn't strict
    // (shouldn't happen on Postgres + Drizzle, but defence in depth).
    await db.update(consentLog).set({ userId: null }).where(eq(consentLog.userId, userId))

    // Best-effort orphan cleanup for tables where we have an explicit
    // user FK but might prefer hard delete (RSVPs are user-bound and
    // not financial). magazine_shipments stays — financial.
    await Promise.all([
      db.delete(eventRsvps).where(eq(eventRsvps.userId, userId)),
      db.delete(shopifyLinks).where(eq(shopifyLinks.userId, userId)),
    ])

    // Sessions + accounts cascade from users via Auth.js adapter schema,
    // but force-clear sessions here so the response cookie won't replay.
    await db.delete(sessions).where(eq(sessions.userId, userId))
    await db.delete(accounts).where(eq(accounts.userId, userId))

    // Profile row, then user.
    await db.delete(profiles).where(eq(profiles.id, userId))
    await db.delete(users).where(eq(users.id, userId))
  } catch (err) {
    // Any DB step throwing here previously bubbled up as a bare 500 and the
    // client saw "Deletion failed. Email hello@ralph.world for help."
    // Capture the underlying reason so Railway logs give us something to
    // diagnose next time it happens (FK on a table not covered by cascade
    // is the usual suspect after schema additions).
    console.error('[account/delete] delete pipeline failed', {
      userId,
      email,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    return NextResponse.json(
      {
        ok: false,
        error: 'delete_failed',
        message: 'We couldn’t delete your account automatically. Please email hello@ralph.world and we’ll finish removing your data.',
      },
      { status: 500 }
    )
  }

  // Force log out (clears the JWT cookie). Failures here don't undo the
  // successful row delete — swallow so the user sees success.
  try {
    await signOut({ redirect: false })
  } catch (err) {
    console.error('[account/delete] signOut failed after row delete', err)
  }

  // Post-delete tick to force the pool to notice the transaction is done
  // before the response goes out.
  await db.execute(sql`SELECT 1`)

  return NextResponse.json({
    ok: true,
    message: 'Account deleted. Sign-in is no longer possible.',
  })
}
