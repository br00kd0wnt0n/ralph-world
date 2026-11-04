import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { profiles, users } from '@/lib/db/schema'
import { sendTemplate } from './send'

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'https://ralph.world'
  return `${base.replace(/\/$/, '')}${path}`
}

/**
 * Send the free-member welcome email once. Called when an email/password
 * account verifies (/api/auth/verify-email) and when a Google account is
 * created (Auth.js createUser). Skips paid members (they get the
 * subscription receipt). sendTemplate's idempotency key makes repeat calls
 * no-ops. Never throws: a welcome email must not break sign-up.
 */
export async function sendFreeWelcome(userId: string): Promise<void> {
  try {
    const [row] = await getDb()
      .select({ email: users.email, name: users.name, displayName: profiles.displayName, tier: profiles.tier })
      .from(users)
      .leftJoin(profiles, eq(profiles.id, users.id))
      .where(eq(users.id, userId))
      .limit(1)
    if (!row?.email || row.tier === 'paid') return
    const rawName = row.displayName ?? row.name
    const recipientName = rawName && rawName !== row.email ? rawName : null
    await sendTemplate({
      userId,
      to: row.email,
      templateId: 'welcome-free',
      props: {
        recipientName,
        magazineUrl: appUrl('/magazine'),
        tvUrl: appUrl('/tv'),
        subscribeUrl: appUrl('/subscribe'),
      },
    })
  } catch (err) {
    console.error('[welcome] free welcome email failed:', err)
  }
}
