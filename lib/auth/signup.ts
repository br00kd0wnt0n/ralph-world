import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { users, profiles } from '@/lib/db/schema'
import { hashPassword, validatePassword } from './passwords'
import { issueVerificationToken, purgeExpiredTokens } from './verification-tokens'
import { sendTemplate } from '@/lib/email/send'
import { logSignupConsents } from '@/lib/consent'

/**
 * Email/password signup — Task 1.3, arch doc §4.
 *
 * Creates `users` + `profiles` rows, hashes the password, issues a fresh
 * verification token, and sends the verification email via Resend. Signin
 * is blocked by the Credentials provider until `users.email_verified` is set.
 *
 * Returns a result describing what to show the user — the route handler
 * decides whether to redirect to "check your email" or surface "already
 * registered" copy.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SignupResult =
  | { ok: true; userId: string; email: string }
  | {
      ok: false
      reason:
        | 'invalid_email'
        | 'invalid_password'
        | 'already_registered_verified'
        | 'already_registered_unverified'
      message: string
    }

export async function signupWithPassword(args: {
  email: string
  password: string
  name?: string | null
  appUrl: string
  now?: () => number
}): Promise<SignupResult> {
  const email = args.email.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return { ok: false, reason: 'invalid_email', message: 'Enter a valid email address.' }
  }
  const pwCheck = validatePassword(args.password)
  if (!pwCheck.ok) {
    return {
      ok: false,
      reason: 'invalid_password',
      message: pwCheck.reason ?? 'Password is too short.',
    }
  }

  const db = getDb()

  // Look up existing user — UX branches on whether they've verified.
  const existing = (
    await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
  )[0]

  if (existing) {
    if (existing.emailVerified) {
      // Don't reveal account-existence to attackers in the public response;
      // route handler will translate this to a generic "check your inbox"
      // message but logs / metrics see the real reason.
      return {
        ok: false,
        reason: 'already_registered_verified',
        message: 'An account with that email already exists.',
      }
    }
    // Existing user who never verified — refresh the password + resend verification.
    const passwordHash = await hashPassword(args.password)
    await db
      .update(users)
      .set({ passwordHash, name: args.name ?? existing.email })
      .where(eq(users.id, existing.id))
    await sendVerificationEmail({ userId: existing.id, email, name: args.name ?? null, appUrl: args.appUrl, now: args.now })
    return { ok: true, userId: existing.id, email }
  }

  // Fresh signup — create user, profile, fire consent + verification email.
  const passwordHash = await hashPassword(args.password)
  const inserted = await db
    .insert(users)
    .values({ email, name: args.name ?? null, passwordHash })
    .returning({ id: users.id })
  const userId = inserted[0]?.id
  if (!userId) {
    throw new Error('signup: user insert returned no id')
  }

  // Profile row mirrors what the Auth.js createUser event does for OAuth.
  // We're not going through createUser here (Credentials provider doesn't
  // fire it on initial signup) so we replicate the side effects.
  try {
    await db.insert(profiles).values({
      id: userId,
      displayName: args.name ?? null,
      tier: 'free',
      subscriptionStatus: 'free',
    })
  } catch {
    // Race / already-exists — non-fatal.
  }
  await logSignupConsents(userId)

  await sendVerificationEmail({ userId, email, name: args.name ?? null, appUrl: args.appUrl, now: args.now })

  // Shopify customer auto-create (Task 1.6). Fire-and-forget — must not
  // block the signup response. Dynamic import keeps the Shopify module
  // out of the cold-start path for non-signup requests.
  void (async () => {
    try {
      const { findOrCreateCustomer } = await import('@/lib/shopify/customer')
      await findOrCreateCustomer({ userId, email, name: args.name ?? null })
    } catch (err) {
      console.error('[signup] shopify customer auto-link failed:', err)
    }
  })()

  return { ok: true, userId, email }
}

/**
 * Issue a fresh verification token and email the link. Exported so the
 * "resend verification email" flow in the member portal can reuse it.
 */
export async function sendVerificationEmail(args: {
  userId: string
  email: string
  name?: string | null
  appUrl: string
  now?: () => number
}): Promise<{ sent: boolean; skipped?: boolean }> {
  // Cleanup expired tokens for this email first (best-effort).
  await purgeExpiredTokens({ email: args.email, now: args.now })

  const { token } = await issueVerificationToken({ email: args.email, now: args.now })
  const verificationUrl = buildVerificationUrl(args.appUrl, args.email, token)

  const result = await sendTemplate({
    userId: args.userId,
    to: args.email,
    templateId: 'email-verification',
    props: { verificationUrl, recipientName: args.name ?? null },
  })
  return result.sent
    ? { sent: true }
    : { sent: false, skipped: true }
}

export function buildVerificationUrl(appUrl: string, email: string, token: string): string {
  const base = appUrl.replace(/\/+$/, '')
  const qs = new URLSearchParams({ email, token })
  return `${base}/api/auth/verify-email?${qs.toString()}`
}
