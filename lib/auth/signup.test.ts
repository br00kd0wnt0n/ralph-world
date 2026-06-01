import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Unit tests for signupWithPassword + sendVerificationEmail.
 *
 * DB is mocked at the @/lib/db boundary. We script the chained Drizzle
 * builders (select().from().where().limit() and insert().values().returning())
 * so each call returns a deterministic result. sendTemplate and the
 * verification-token issuer are also mocked at module boundaries.
 */

const { dbMock, sendTemplateMock, issueTokenMock, purgeMock, logConsentMock } =
  vi.hoisted(() => {
    return {
      dbMock: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
      },
      sendTemplateMock: vi.fn(),
      issueTokenMock: vi.fn(),
      purgeMock: vi.fn().mockResolvedValue(undefined),
      logConsentMock: vi.fn().mockResolvedValue(undefined),
    }
  })

vi.mock('@/lib/db', () => ({ getDb: () => dbMock }))
vi.mock('@/lib/email/send', () => ({ sendTemplate: sendTemplateMock }))
vi.mock('./verification-tokens', () => ({
  issueVerificationToken: issueTokenMock,
  purgeExpiredTokens: purgeMock,
}))
vi.mock('@/lib/consent', () => ({ logSignupConsents: logConsentMock }))

import { signupWithPassword, buildVerificationUrl } from './signup'

/** Helper: stub a fresh DB chain that resolves to `users` lookup → empty. */
function setupDb({
  existingUser,
  insertedUserId,
}: {
  existingUser?: { id: string; email: string; emailVerified: Date | null; passwordHash: string | null } | null
  insertedUserId?: string | null
} = {}) {
  // select().from(users).where(eq).limit(1) chain
  const limit = vi.fn().mockResolvedValue(existingUser ? [existingUser] : [])
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where }))
  dbMock.select.mockReturnValue({ from })

  // insert(users|profiles).values(...).returning(...)  AND
  // insert(profiles).values(...)  (no returning)
  const returning = vi.fn().mockResolvedValue(insertedUserId ? [{ id: insertedUserId }] : [])
  const insertValues = vi.fn(() => ({ returning }))
  // The profiles insert doesn't call .returning, so .values() must also be awaitable.
  // Make `values` itself a thenable so `await db.insert(profiles).values(...)` works.
  insertValues.mockImplementation(() => {
    const chain = Promise.resolve(undefined) as Promise<undefined> & {
      returning: typeof returning
    }
    chain.returning = returning
    return chain
  })
  dbMock.insert.mockReturnValue({ values: insertValues })

  // update(users).set(...).where(...) chain
  const updateWhere = vi.fn().mockResolvedValue(undefined)
  const set = vi.fn(() => ({ where: updateWhere }))
  dbMock.update.mockReturnValue({ set })

  return { limit, where, from, insertValues, returning, set, updateWhere }
}

beforeEach(() => {
  vi.clearAllMocks()
  sendTemplateMock.mockResolvedValue({ sent: true, resendId: 'r1', idempotencyKey: 'k' })
  issueTokenMock.mockResolvedValue({ token: 'tok-deadbeef', expiresAt: new Date() })
  purgeMock.mockResolvedValue(undefined)
  logConsentMock.mockResolvedValue(undefined)
})

describe('buildVerificationUrl', () => {
  it('builds a clean URL with email + token query params', () => {
    const url = buildVerificationUrl('https://ralph.world', 'user@example.com', 'tok-123')
    expect(url).toBe(
      'https://ralph.world/api/auth/verify-email?email=user%40example.com&token=tok-123'
    )
  })

  it('strips a trailing slash on the base URL', () => {
    const url = buildVerificationUrl('https://ralph.world///', 'a@b.co', 't')
    expect(url.startsWith('https://ralph.world/api/auth/verify-email')).toBe(true)
  })
})

describe('signupWithPassword — validation', () => {
  it('rejects an invalid email', async () => {
    setupDb()
    const result = await signupWithPassword({
      email: 'not-an-email',
      password: 'correct horse battery staple',
      appUrl: 'https://ralph.world',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_email')
    expect(sendTemplateMock).not.toHaveBeenCalled()
  })

  it('rejects a too-short password', async () => {
    setupDb()
    const result = await signupWithPassword({
      email: 'user@example.com',
      password: 'short',
      appUrl: 'https://ralph.world',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_password')
    expect(sendTemplateMock).not.toHaveBeenCalled()
  })
})

describe('signupWithPassword — fresh signup', () => {
  it('creates user, profile, logs consents, sends verification email', async () => {
    setupDb({ existingUser: null, insertedUserId: 'new-user-id' })

    const result = await signupWithPassword({
      email: 'fresh@example.com',
      password: 'correct horse battery staple',
      name: 'Fresh User',
      appUrl: 'https://ralph.world',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.userId).toBe('new-user-id')
      expect(result.email).toBe('fresh@example.com')
    }
    expect(logConsentMock).toHaveBeenCalledWith('new-user-id')
    expect(sendTemplateMock).toHaveBeenCalledTimes(1)
    const call = sendTemplateMock.mock.calls[0][0]
    expect(call.templateId).toBe('email-verification')
    expect(call.to).toBe('fresh@example.com')
    expect(call.props.verificationUrl).toContain('token=tok-deadbeef')
    expect(call.props.verificationUrl).toContain('email=fresh%40example.com')
  })

  it('normalises the email to lowercase + trims whitespace', async () => {
    setupDb({ existingUser: null, insertedUserId: 'u' })
    const result = await signupWithPassword({
      email: '  User@Example.COM  ',
      password: 'correct horse battery staple',
      appUrl: 'https://ralph.world',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.email).toBe('user@example.com')
  })
})

describe('signupWithPassword — already registered', () => {
  it('returns already_registered_verified for a verified existing user (no email sent)', async () => {
    setupDb({
      existingUser: {
        id: 'u1',
        email: 'taken@example.com',
        emailVerified: new Date(),
        passwordHash: 'someoldhash',
      },
    })
    const result = await signupWithPassword({
      email: 'taken@example.com',
      password: 'correct horse battery staple',
      appUrl: 'https://ralph.world',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('already_registered_verified')
    expect(sendTemplateMock).not.toHaveBeenCalled()
    expect(logConsentMock).not.toHaveBeenCalled()
  })

  it('refreshes password + resends verification for an unverified existing user', async () => {
    setupDb({
      existingUser: {
        id: 'u2',
        email: 'unverified@example.com',
        emailVerified: null,
        passwordHash: 'someoldhash',
      },
    })
    const result = await signupWithPassword({
      email: 'unverified@example.com',
      password: 'new strong password!',
      appUrl: 'https://ralph.world',
    })
    expect(result.ok).toBe(true)
    expect(dbMock.update).toHaveBeenCalled()
    expect(sendTemplateMock).toHaveBeenCalledTimes(1)
    // Should NOT re-log consents — they were logged on the original signup.
    expect(logConsentMock).not.toHaveBeenCalled()
  })
})
