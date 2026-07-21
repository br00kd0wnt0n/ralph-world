import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { consentLog, homepageConfig } from '@/lib/db/schema'

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
 * Compile-time fallback policy version. Used only when the DB-stored
 * `legal_policy_version` can't be read (e.g. DB unreachable at consent
 * time). Bump this alongside the DB value when landing a manual DB
 * change so the fallback stays honest.
 */
export const POLICY_VERSION = '2026-06-v1'

/**
 * DB key that carries the live policy version. Bumped by the CMS
 * legal-page save action every time an editor saves any of the three
 * legal pages (privacy / terms / cookies). The cookie banner reads it
 * on mount and re-prompts the user if their stored consent was
 * against an older version.
 */
export const POLICY_VERSION_KEY = 'legal_policy_version'

/**
 * Read the current policy version from homepage_config. Falls back to
 * the compile-time POLICY_VERSION on any error so consent logging
 * survives a DB outage.
 */
export async function getCurrentPolicyVersion(): Promise<string> {
  try {
    const db = getDb()
    const [row] = await db
      .select()
      .from(homepageConfig)
      .where(eq(homepageConfig.key, POLICY_VERSION_KEY))
      .limit(1)
    if (row && typeof row.value === 'string' && row.value.length > 0) {
      return row.value
    }
  } catch (err) {
    console.error('[consent] failed to read live policy version:', err)
  }
  return POLICY_VERSION
}

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
    // Resolve version lazily so the caller doesn't have to fetch it
    // themselves. If the caller passed one (migrations do), respect it.
    const policyVersion =
      input.policyVersion ?? (await getCurrentPolicyVersion())
    await db.insert(consentLog).values({
      userId: input.userId,
      consentType: input.consentType,
      granted: input.granted,
      source: input.source,
      policyVersion,
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
