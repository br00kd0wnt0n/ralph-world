import { test, expect } from '@playwright/test'
import postgres from 'postgres'

/**
 * Email/password signup + verify flow — Task 1.3 API-level acceptance.
 *
 * What this covers:
 *   - POST /api/auth/signup happy path → 200, ok: true
 *   - Enumeration-safe response shape for already-verified emails
 *   - Validation errors (invalid email, short password)
 *   - GET /api/auth/verify-email → marks users.email_verified
 *
 * What this does NOT cover (yet):
 *   - The /login UI form for email/password — currently the page only
 *     exposes "Continue with Google". Task 1.3 shipped the Credentials
 *     provider + API routes but didn't update the login UI. Add a
 *     follow-up test once the form exists.
 *
 * Strategy: we read the verification token directly out of the
 * `verification_tokens` table rather than scraping a real inbox.
 * The token we read IS the same one Resend would email — the email
 * channel is incidental to the protocol.
 *
 * Run against:
 *   - npm run test:e2e                       (localhost via dev server)
 *   - PLAYWRIGHT_BASE_URL=https://ralph-world-production.up.railway.app \
 *     DATABASE_URL=<superuser dsn> npm run test:e2e   (Railway)
 *
 * DATABASE_URL must be set so we can read the token row + assert on
 * users.email_verified. In CI this would be a test-only role.
 */

const TEST_PASSWORD = 'correct horse battery staple test'

function uniqueTestEmail(): string {
  return `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.ralph.world`
}

interface DbHelpers {
  getLatestToken(email: string): Promise<string | null>
  getEmailVerified(email: string): Promise<Date | null>
  cleanup(email: string): Promise<void>
  end(): Promise<void>
}

function dbHelpers(): DbHelpers {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL required for E2E (to read verification_tokens)')
  const sql = postgres(url, { max: 1 })
  return {
    async getLatestToken(email: string) {
      const rows = await sql<{ token: string }[]>`
        SELECT token FROM verification_tokens
        WHERE identifier = ${email.toLowerCase()}
        ORDER BY expires DESC
        LIMIT 1
      `
      return rows[0]?.token ?? null
    },
    async getEmailVerified(email: string) {
      const rows = await sql<{ email_verified: Date | null }[]>`
        SELECT email_verified FROM users
        WHERE email = ${email.toLowerCase()}
        LIMIT 1
      `
      return rows[0]?.email_verified ?? null
    },
    async cleanup(email: string) {
      // Best-effort delete in case the test DB persists between runs.
      await sql`DELETE FROM users WHERE email = ${email.toLowerCase()}`
    },
    async end() {
      await sql.end()
    },
  }
}

test.describe('email/password signup + verify (Task 1.3 API)', () => {
  test('signup → verify token → users.email_verified is set', async ({ request }) => {
    const db = dbHelpers()
    const email = uniqueTestEmail()
    try {
      // ── 1. Signup ──────────────────────────────────────────────────
      const signupRes = await request.post('/api/auth/signup', {
        data: { email, password: TEST_PASSWORD, name: 'E2E Test' },
      })
      expect(signupRes.status(), 'signup returns 200').toBe(200)
      const signupBody = await signupRes.json()
      expect(signupBody.ok).toBe(true)

      // Before verification, email_verified must be NULL.
      const beforeVerify = await db.getEmailVerified(email)
      expect(beforeVerify, 'email_verified is null before verify').toBeNull()

      // ── 2. Pull the token from the DB ──────────────────────────────
      const token = await db.getLatestToken(email)
      expect(token, 'verification token exists after signup').toBeTruthy()

      // ── 3. Hit the verify route ────────────────────────────────────
      // followRedirects: false so we can assert the redirect target.
      const verifyRes = await request.get(
        `/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${token}`,
        { maxRedirects: 0 }
      )
      // 302 → /login?verify=ok
      expect([302, 307]).toContain(verifyRes.status())
      const location = verifyRes.headers()['location'] ?? ''
      expect(location).toContain('/login')
      expect(location).toContain('verify=ok')

      // ── 4. email_verified is now set ───────────────────────────────
      const afterVerify = await db.getEmailVerified(email)
      expect(afterVerify, 'email_verified is set after verify').not.toBeNull()
    } finally {
      await db.cleanup(email).catch(() => {})
      await db.end()
    }
  })

  test('verify is one-shot — second call with same token fails', async ({ request }) => {
    const db = dbHelpers()
    const email = uniqueTestEmail()
    try {
      await request.post('/api/auth/signup', {
        data: { email, password: TEST_PASSWORD },
      })
      const token = await db.getLatestToken(email)
      expect(token).toBeTruthy()

      // First verify — succeeds.
      const ok = await request.get(
        `/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${token}`,
        { maxRedirects: 0 }
      )
      expect(ok.headers()['location'] ?? '').toContain('verify=ok')

      // Second verify with the same token — token row was deleted,
      // expect verify=error&reason=not_found.
      const dup = await request.get(
        `/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${token}`,
        { maxRedirects: 0 }
      )
      const loc = dup.headers()['location'] ?? ''
      expect(loc).toContain('verify=error')
      expect(loc).toContain('reason=not_found')
    } finally {
      await db.cleanup(email).catch(() => {})
      await db.end()
    }
  })

  test('signup is enumeration-safe for already-verified emails', async ({ request }) => {
    const db = dbHelpers()
    const email = uniqueTestEmail()
    try {
      // First signup + verify.
      await request.post('/api/auth/signup', {
        data: { email, password: TEST_PASSWORD },
      })
      const token = await db.getLatestToken(email)
      await request.get(
        `/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${token}`,
        { maxRedirects: 0 }
      )

      // Second signup with the same email — should still return the
      // generic "check your inbox" shape, NOT reveal account existence.
      const dup = await request.post('/api/auth/signup', {
        data: { email, password: 'another password long enough' },
      })
      expect(dup.status()).toBe(200)
      const body = await dup.json()
      expect(body.ok).toBe(true)
      expect(body.message).toMatch(/inbox|verify/i)
    } finally {
      await db.cleanup(email).catch(() => {})
      await db.end()
    }
  })

  test('signup rejects invalid email + short password with 400', async ({ request }) => {
    const badEmail = await request.post('/api/auth/signup', {
      data: { email: 'not-an-email', password: TEST_PASSWORD },
    })
    expect(badEmail.status()).toBe(400)
    expect((await badEmail.json()).error).toBe('invalid_email')

    const badPw = await request.post('/api/auth/signup', {
      data: { email: uniqueTestEmail(), password: 'short' },
    })
    expect(badPw.status()).toBe(400)
    expect((await badPw.json()).error).toBe('invalid_password')
  })
})

test.describe.skip('email/password UI flow (Task 1.3 UI — pending)', () => {
  /**
   * Un-skip once /login renders the email/password form. Current state:
   * the login page only exposes "Continue with Google". The Credentials
   * provider exists in lib/auth.ts but no UI surface drives it.
   *
   * When the form lands, this should cover:
   *   - Signup form (probably at /signup or in a tab on /login)
   *   - Error state when signing in before verifying
   *   - Successful signin after verifying → land on /account
   */
  test('full signup → verify → signin → /account UI flow', async () => {
    // TODO
  })
})
