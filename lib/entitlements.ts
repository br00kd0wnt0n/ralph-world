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

export type AccessTier = 'everyone' | 'premium' | 'members' | 'paid_subscribers'
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
 * - premium:           all users (incl. guests) — same access as everyone, but
 *                      content is badged as subscriber-quality. Lets editors
 *                      signal value without hard-gating at launch.
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
    case 'premium':
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
 * Is this content marked as premium-quality content that is still publicly
 * readable? Used by the UI to render a "PREMIUM" badge without blocking
 * access — the soft-gate pattern for launch.
 */
export function isPremiumContent(accessTier: AccessTier): boolean {
  return accessTier === 'premium'
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
 * Now that profiles.tier is the source of truth (post-Phase 1), prefer
 * that. Fall back to legacy subscriptionStatus for any pre-migration
 * profile rows that slipped through. Phase 2 Stripe values (`'active'`,
 * `'past_due'`, etc.) appear on subscriptionStatus too; we don't try
 * to interpret them here — tier is set authoritatively by the webhook.
 */
export function tierFromSession(
  session:
    | {
        user?: unknown
        profile?: {
          tier?: UserTier | null
          subscriptionStatus?: string | null
        } | null
      }
    | null
    | undefined
): UserTier {
  if (!session?.user) return 'guest'
  const tier = session.profile?.tier ?? null
  if (tier === 'paid' || tier === 'free' || tier === 'guest') return tier
  // Legacy fallback — only 'paid' is paid; everything else is free
  // (signed-in users without a tier default to free).
  return session.profile?.subscriptionStatus === 'paid' ? 'paid' : 'free'
}
