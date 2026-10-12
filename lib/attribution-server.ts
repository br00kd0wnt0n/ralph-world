import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { auditLog, profiles } from '@/lib/db/schema'
import { logAction } from '@/lib/audit'
import type { Attribution } from '@/lib/attribution'

/**
 * Records which landing page + campaign tags a new account came from, as a
 * `signup_attributed` audit_log row (no schema change). One row per user.
 *
 * Report with:
 *   SELECT after->>'utm_source' AS source, count(*)
 *   FROM audit_log WHERE action = 'signup_attributed'
 *     AND after->>'landing' = 'issue9' GROUP BY 1;
 */

const ACTION = 'signup_attributed'
// A sign-in only counts as a sign-up if the account was created this recently.
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000

export async function recordSignupAttribution(args: {
  userId: string
  landing: string
  attribution: Attribution
  /** Skip the freshness check when the caller has just created the account. */
  knownNew?: boolean
  now?: () => number
}): Promise<{ recorded: boolean }> {
  try {
    const db = getDb()
    if (!args.knownNew) {
      const profile = (
        await db
          .select({ createdAt: profiles.createdAt })
          .from(profiles)
          .where(eq(profiles.id, args.userId))
          .limit(1)
      )[0]
      const now = (args.now ?? Date.now)()
      if (!profile?.createdAt || now - profile.createdAt.getTime() > NEW_ACCOUNT_WINDOW_MS) {
        return { recorded: false }
      }
    }
    const existing = await db
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(and(eq(auditLog.action, ACTION), eq(auditLog.targetId, args.userId)))
      .limit(1)
    if (existing.length > 0) return { recorded: false }
  } catch (err) {
    // Attribution is best-effort and must never break signup.
    console.error('[attribution] lookup failed:', err)
    return { recorded: false }
  }

  await logAction({
    actorId: args.userId,
    action: ACTION,
    targetType: 'user',
    targetId: args.userId,
    after: { landing: args.landing, ...args.attribution },
    source: 'system',
  })
  return { recorded: true }
}
