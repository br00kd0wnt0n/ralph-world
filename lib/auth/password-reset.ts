import 'server-only'
import { randomBytes } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { users, verificationTokens } from '@/lib/db/schema'

/**
 * Password-reset token issue + consume — Task 3.7.
 *
 * Reuses the Auth.js `verification_tokens` table with a namespaced
 * identifier (`pw-reset:<email>`) so tokens can't be cross-applied to
 * email verification (different prefix → different rows).
 *
 * TTL is 1 hour — short enough to limit exposure, long enough for a
 * user who receives the email and comes back to their laptop.
 */

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const TOKEN_BYTES = 32
const IDENTIFIER_PREFIX = 'pw-reset:'

function makeIdentifier(email: string): string {
  return `${IDENTIFIER_PREFIX}${email.toLowerCase()}`
}

export function generatePasswordResetToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

/**
 * Issue a password-reset token. Any previously issued (unexpired) tokens
 * for the same email remain valid — we don't invalidate old ones so a
 * user who clicks an earlier email still gets through. Only one token per
 * (identifier, token) pair can exist due to the PK, so a fresh request
 * just adds a new row.
 */
export async function issuePasswordResetToken(args: {
  email: string
  now?: () => number
}): Promise<{ token: string; expiresAt: Date } | null> {
  const now = args.now?.() ?? Date.now()
  const email = args.email.toLowerCase()

  // Confirm the email exists before issuing a token. We don't tell the
  // caller whether the email was found — that would leak user existence.
  const db = getDb()
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (!user) return null // Silent no-op — caller should respond identically

  const token = generatePasswordResetToken()
  const expiresAt = new Date(now + TOKEN_TTL_MS)
  await db.insert(verificationTokens).values({
    identifier: makeIdentifier(email),
    token,
    expires: expiresAt,
  })
  return { token, expiresAt }
}

export type ConsumeResetResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'no_user' }

/**
 * Validate a password-reset token. On success, deletes the row (one-shot)
 * and returns the userId so the caller can update the password hash.
 * Does NOT update the password — that's the caller's responsibility so
 * the route handler can validate the new password first.
 */
export async function consumePasswordResetToken(args: {
  email: string
  token: string
  now?: () => number
}): Promise<ConsumeResetResult> {
  const now = args.now?.() ?? Date.now()
  const email = args.email.toLowerCase()
  const identifier = makeIdentifier(email)
  const db = getDb()

  const rows = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, args.token)
      )
    )
    .limit(1)

  const row = rows[0]
  if (!row) return { ok: false, reason: 'not_found' }

  if (row.expires.getTime() < now) {
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, args.token)
        )
      )
    return { ok: false, reason: 'expired' }
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, args.token)
        )
      )
    return { ok: false, reason: 'no_user' }
  }

  // Consume — delete this specific token row.
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, args.token)
      )
    )

  return { ok: true, userId: user.id, email: user.email ?? email }
}
