import 'server-only'
import { auth } from '@/lib/auth'
import type { SessionWithProfile } from '@/lib/auth'
import {
  canAccess,
  tvPreviewSeconds,
  tierFromSession,
  type AccessTier,
  type UserTier,
} from '@/lib/entitlements'

/**
 * Server-side entitlement bridges. These read the real Auth.js session and
 * feed it into the pure helpers in `lib/entitlements.ts`. Keep auth/db
 * coupling here so the pure module stays unit-testable.
 *
 * `import 'server-only'` guards against accidental client-bundle inclusion.
 */

/** Current user's tier, derived from the session. Guest if not signed in. */
export async function currentTier(): Promise<UserTier> {
  const session = (await auth()) as SessionWithProfile | null
  return tierFromSession(session)
}

/** Can the current user access this content? */
export async function canCurrentUserAccess(content: {
  accessTier: AccessTier
}): Promise<boolean> {
  const tier = await currentTier()
  return canAccess({ tier }, content)
}

/**
 * TV preview window for the current user. null = unlimited (signed in),
 * a number = guest countdown seconds.
 *
 * @param previewSeconds override (caller passes the homepage_config value)
 */
export async function currentTvPreviewSeconds(
  previewSeconds?: number
): Promise<number | null> {
  const session = (await auth()) as SessionWithProfile | null
  const user = session?.user ? { tier: tierFromSession(session) } : null
  return tvPreviewSeconds(user, previewSeconds)
}
