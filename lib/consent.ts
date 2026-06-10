import 'server-only'
import { getDb } from '@/lib/db'
import { consentLog } from '@/lib/db/schema'

/**
 * GDPR consent log (architecture doc §14).
 *
 * Append-only. The `ralph_world` DB role has INSERT but no UPDATE / DELETE
 * permission on consent_log (enforced in Task 1.2). On account erasure
 * (DSAR), the row survives with user_id set to null — the legal record
 * outlives the user.
 *
 * Three lawful-basis-relevant consent types:
 *   - 'marketing' — explicit opt-in for newsletter / promo sends
 *   - 'terms'     — acceptance of terms of service
 *   - 'privacy'   — acceptance of privacy policy
 */

export type ConsentType =
  | 'marketing' // explicit opt-in for newsletter / promo sends
  | 'terms' // acceptance of terms of service
  | 'privacy' // acceptance of privacy policy
  | 'cookies_all' // cookie banner — accept all (analytics + functional + necessary)
  | 'cookies_necessary' // cookie banner — necessary only (no analytics)
export type ConsentSource =
  | 'signup_form'
  | 'portal'
  | 'api'
  | 'cookie_banner'
  | 'substack_migration'

/**
 * Current policy version stamp. Bump when terms / privacy / marketing
 * copy changes substantively so we can prove what users consented to.
 */
export const POLICY_VERSION = '2026-06-v1'

export interface LogConsentInput {
  /** User giving / withdrawing consent. null only after account erasure (retention). */
  userId: string | null
  consentType: ConsentType
  granted: boolean
  source: ConsentSource
  /** Defaults to {@link POLICY_VERSION} for current consents. Override for migrations. */
  policyVersion?: string
}

export async function logConsent(input: LogConsentInput): Promise<void> {
  try {
    const db = getDb()
    await db.insert(consentLog).values({
      userId: input.userId,
      consentType: input.consentType,
      granted: input.granted,
      source: input.source,
      policyVersion: input.policyVersion ?? POLICY_VERSION,
    })
  } catch (err) {
    console.error('[consent] failed to write consent_log row:', err)
  }
}

/**
 * Convenience: signup creates two consent_log rows (terms + privacy, both
 * granted=true) because acceptance is implicit in completing the signup
 * form. Used by the Auth.js createUser event.
 */
export async function logSignupConsents(userId: string): Promise<void> {
  await Promise.all([
    logConsent({
      userId,
      consentType: 'terms',
      granted: true,
      source: 'signup_form',
    }),
    logConsent({
      userId,
      consentType: 'privacy',
      granted: true,
      source: 'signup_form',
    }),
  ])
}
