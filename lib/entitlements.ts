/**
 * Entitlement model — architecture doc §8.
 *
 * Two intentionally-separate vocabularies:
 *  - `UserTier`  (guest | free | paid)              — the user's membership state
 *  - `AccessTier`(everyone | members | paid_subscribers) — the audience a piece of content is for
 *
 * This module is PURE: no imports from auth/db. It operates on a minimal
 * `{ tier }` shape so it's trivially unit-testable. Server-side bridges
 * that read the real session live in `lib/entitlements-server.ts`.
 */

export type AccessTier = 'everyone' | 'members' | 'paid_subscribers'
export type UserTier = 'guest' | 'free' | 'paid'

/** Minimal user shape the entitlement logic needs. */
export interface EntitlementUser {
  tier: UserTier
}

/** Default TV guest-preview window, seconds. Tunable via homepage_config.tv_preview_seconds (§8). */
export const DEFAULT_TV_PREVIEW_SECONDS = 600

/**
 * Can this user read this content?
 * - everyone:          all users (incl. guests)
 * - members:           signed-in users (free or paid)
 * - paid_subscribers:  paid only
 */
export function canAccess(
  user: EntitlementUser | null | undefined,
  content: { accessTier: AccessTier }
): boolean {
  const userTier: UserTier = user?.tier ?? 'guest'
  switch (content.accessTier) {
    case 'everyone':
      return true
    case 'members':
      return userTier === 'free' || userTier === 'paid'
    case 'paid_subscribers':
      return userTier === 'paid'
    default:
      // Exhaustiveness guard — unknown tier denies by default.
      return false
  }
}

/**
 * How many seconds of TV a user may watch before the static + modal kicks in.
 * Only guests (unauthenticated) are time-limited. Free and paid get unlimited
 * playback. Returns null = unlimited.
 *
 * @param previewSeconds override the default window (from homepage_config)
 */
export function tvPreviewSeconds(
  user: EntitlementUser | null | undefined,
  previewSeconds: number = DEFAULT_TV_PREVIEW_SECONDS
): number | null {
  return user ? null : previewSeconds
}

/**
 * Derive a UserTier from a session-like object. Structurally typed so this
 * module stays decoupled from the concrete SessionWithProfile type.
 *
 * Forward-compatible: once `profiles.tier` lands (Task 1.1), this can read
 * the column directly instead of deriving from subscriptionStatus.
 */
export function tierFromSession(
  session:
    | {
        user?: unknown
        profile?: { subscriptionStatus?: 'free' | 'paid' | null } | null
      }
    | null
    | undefined
): UserTier {
  if (!session?.user) return 'guest'
  return session.profile?.subscriptionStatus === 'paid' ? 'paid' : 'free'
}
