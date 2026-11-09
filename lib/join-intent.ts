/**
 * Carries a "I want the paid tier" choice through email verification.
 *
 * An email/password sign-up can't go to Stripe straight away: checkout
 * needs a signed-in user, and the account can't sign in until the email is
 * verified. So the choice rides along as `intent=paid` on the verification
 * link; /api/auth/verify-email turns it into a /login callbackUrl of
 * PAID_CHECKOUT_PATH, and /account?upgrade=paid sends the now signed-in
 * member to Stripe.
 *
 * Pure + isomorphic. Only the one whitelisted value is accepted, so the
 * param can never become an open redirect.
 */

export type JoinIntent = 'paid'

/** Where a signed-in member goes to start the paid checkout. */
export const PAID_CHECKOUT_PATH = '/account?upgrade=paid'

export function parseJoinIntent(value: unknown): JoinIntent | null {
  return value === 'paid' ? 'paid' : null
}

/**
 * Where to send someone after they join or sign in, as `?next=`. Set by
 * an article's sign-up gate so the reader lands back on that article.
 * Only magazine article paths are accepted, so it can't become an open
 * redirect.
 */
const RETURN_PATH_RE = /^\/magazine\/[a-z0-9][a-z0-9-]{0,199}$/i

export function parseReturnPath(value: unknown): string | null {
  return typeof value === 'string' && RETURN_PATH_RE.test(value) ? value : null
}
