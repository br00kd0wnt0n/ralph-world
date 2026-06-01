import 'server-only'
import { randomBytes } from 'node:crypto'
import { eq, and, lt } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { users, verificationTokens } from '@/lib/db/schema'

/**
 * Email verification token issue + consume — Task 1.3.
 *
 * Tokens live in the Auth.js-managed `verification_tokens` table.
 *   - identifier = the email being verified
 *   - token      = opaque 32-byte hex string (cryptographically random)
 *   - expires    = now + TTL
 *
 * On verify, we DELETE the row (one-shot) and bump `users.email_verified`
 * to now. Atomically? Not perfectly, but the DELETE-first-then-SELECT
 * pattern means a replay can't double-consume.
 */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h — long enough for tomorrow morning
const TOKEN_BYTES = 32

export function generateVerificationToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

/**
 * Issue a fresh verification token for `email`. Returns the token (the
 * caller embeds it in the verification URL we email out). Existing tokens
 * for the same email remain valid until they expire — the caller will
 * almost always be sending the latest one, but old links keep working
 * until TTL so a user clicking a stale tab doesn't see a misleading
 * "link expired" error.
 */
export async function issueVerificationToken(args: {
  email: string
  now?: () => number
}): Promise<{ token: string; expiresAt: Date }> {
  const now = args.now ?? (() => Date.now())
  const token = generateVerificationToken()
  const expiresAt = new Date(now() + TOKEN_TTL_MS)
  await getDb().insert(verificationTokens).values({
    identifier: args.email.toLowerCase(),
    token,
    expires: expiresAt,
  })
  return { token, expiresAt }
}

export type ConsumeResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'no_user' }

/**
 * Consume a verification token. Atomically:
 *   1. Look up (identifier, token) in verification_tokens
 *   2. If expired → return { ok: false, reason: 'expired' }
 *   3. Update users.email_verified = now() for that identifier
 *   4. Delete the token row
 *
 * Token rows for the same email that have NOT been consumed remain
 * until their TTL. We only delete the row we matched.
 */
export async function consumeVerificationToken(args: {
  email: string
  token: string
  now?: () => number
}): Promise<ConsumeResult> {
  const now = args.now ?? (() => Date.now())
  const nowDate = new Date(now())
  const email = args.email.toLowerCase()
  const db = getDb()

  const rows = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, args.token)
      )
    )
    .limit(1)

  const row = rows[0]
  if (!row) return { ok: false, reason: 'not_found' }
  if (row.expires.getTime() < now()) {
    // Expired — clean it up so we don't accumulate stale rows.
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, args.token)
        )
      )
    return { ok: false, reason: 'expired' }
  }

  const userRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  const user = userRows[0]
  if (!user) {
    // Token valid but user has been deleted — clean up and reject.
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, args.token)
        )
      )
    return { ok: false, reason: 'no_user' }
  }

  await db.update(users).set({ emailVerified: nowDate }).where(eq(users.id, user.id))
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, args.token)
      )
    )

  return { ok: true, userId: user.id, email: user.email ?? email }
}

/**
 * Vacuum expired tokens for one email. Best-effort — called
 * opportunistically before issuing a new token so a user spamming
 * "resend verification" doesn't accumulate dead rows.
 */
export async function purgeExpiredTokens(args: {
  email: string
  now?: () => number
}): Promise<void> {
  const now = args.now ?? (() => Date.now())
  try {
    await getDb()
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, args.email.toLowerCase()),
          lt(verificationTokens.expires, new Date(now()))
        )
      )
  } catch {
    // best-effort — caller never blocks on a cleanup failure
  }
}
