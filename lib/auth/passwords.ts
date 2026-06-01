import bcrypt from 'bcryptjs'

/**
 * Password hashing for the Credentials provider — Task 1.3.
 *
 * bcrypt with cost factor 12 (2026 baseline — ~250ms on modern hardware).
 * Wrapped here so callers don't depend on bcryptjs directly and we can
 * swap to argon2id later without touching auth flows.
 */
const BCRYPT_COST = 12

/** Minimum password length. Matches member-portal copy. */
export const MIN_PASSWORD_LENGTH = 10

export interface PasswordValidationResult {
  ok: boolean
  reason?: string
}

/**
 * Cheap server-side password check. UI does the friendly real-time
 * version; this is the last line before we hash.
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (typeof password !== 'string') return { ok: false, reason: 'password must be a string' }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: `password must be at least ${MIN_PASSWORD_LENGTH} characters` }
  }
  if (password.length > 256) {
    // bcrypt truncates at 72 bytes — anything past that is a DoS vector.
    return { ok: false, reason: 'password is too long' }
  }
  return { ok: true }
}

export async function hashPassword(password: string): Promise<string> {
  const v = validatePassword(password)
  if (!v.ok) throw new Error(v.reason ?? 'invalid password')
  return bcrypt.hash(password, BCRYPT_COST)
}

export async function verifyPassword(
  password: string,
  hash: string | null | undefined
): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(password, hash)
}
