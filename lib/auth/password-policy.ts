/**
 * Password policy constants — shared by server and client.
 *
 * Deliberately its own module (no bcryptjs import) so client components
 * like the reset-password form can enforce the same floor the server does
 * without pulling bcrypt into the browser bundle. The reset form used to
 * hardcode 8 while the server required 10, so any 8- or 9-character
 * password passed the client check and came back as a 400 from
 * /api/auth/set-password.
 */

/** Minimum password length. Matches member-portal copy. */
export const MIN_PASSWORD_LENGTH = 10
