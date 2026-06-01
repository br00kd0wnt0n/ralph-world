import { describe, it, expect, vi, beforeEach } from 'vitest'

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({ getDb: () => dbMock }))

import {
  generateVerificationToken,
  issueVerificationToken,
  consumeVerificationToken,
  purgeExpiredTokens,
} from './verification-tokens'

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * Helper: stub the chained Drizzle builder. Each call returns an object
 * with the next method, terminating at an awaitable (Promise) value.
 */
function makeChain(terminal: unknown) {
  // db.insert(table).values(...) → awaitable
  const insertValues = vi.fn().mockResolvedValue(undefined)
  dbMock.insert.mockReturnValue({ values: insertValues })

  // db.select({}).from(table).where(...).limit(1) → terminal Promise
  const limit = vi.fn().mockResolvedValue(terminal)
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where }))
  dbMock.select.mockReturnValue({ from })

  // db.update(table).set(...).where(...) → awaitable
  const updateWhere = vi.fn().mockResolvedValue(undefined)
  const set = vi.fn(() => ({ where: updateWhere }))
  dbMock.update.mockReturnValue({ set })

  // db.delete(table).where(...) → awaitable
  const deleteWhere = vi.fn().mockResolvedValue(undefined)
  dbMock.delete.mockReturnValue({ where: deleteWhere })

  return { insertValues, limit, where, from, updateWhere, set, deleteWhere }
}

describe('generateVerificationToken', () => {
  it('produces a 64-char hex string (32 random bytes)', () => {
    const t = generateVerificationToken()
    expect(t).toMatch(/^[0-9a-f]{64}$/)
  })

  it('does not collide across calls (high-entropy)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 50; i++) seen.add(generateVerificationToken())
    expect(seen.size).toBe(50)
  })
})

describe('issueVerificationToken', () => {
  it('inserts (identifier=email-lowercased, token, expires) and returns the token', async () => {
    const chain = makeChain([])
    const fixedNow = 1_700_000_000_000
    const result = await issueVerificationToken({
      email: 'User@Example.COM',
      now: () => fixedNow,
    })

    expect(result.token).toMatch(/^[0-9a-f]{64}$/)
    expect(chain.insertValues).toHaveBeenCalledTimes(1)
    const inserted = chain.insertValues.mock.calls[0][0] as {
      identifier: string
      token: string
      expires: Date
    }
    expect(inserted.identifier).toBe('user@example.com')
    expect(inserted.token).toBe(result.token)
    // 24h TTL
    expect(inserted.expires.getTime()).toBe(fixedNow + 24 * 60 * 60 * 1000)
  })
})

describe('consumeVerificationToken', () => {
  it('returns not_found when no row matches', async () => {
    makeChain([]) // empty token lookup
    const r = await consumeVerificationToken({ email: 'a@b.co', token: 'nope' })
    expect(r).toEqual({ ok: false, reason: 'not_found' })
  })

  it('returns expired (and deletes the row) when the token is stale', async () => {
    const fixedNow = 1_700_000_000_000
    const chain = makeChain([
      { identifier: 'a@b.co', token: 'tok', expires: new Date(fixedNow - 1000) },
    ])
    const r = await consumeVerificationToken({
      email: 'a@b.co',
      token: 'tok',
      now: () => fixedNow,
    })
    expect(r).toEqual({ ok: false, reason: 'expired' })
    expect(chain.deleteWhere).toHaveBeenCalled()
  })

  it('on success: marks email_verified, deletes the token, returns userId', async () => {
    const fixedNow = 1_700_000_000_000
    // First .limit() call (token lookup) → token row.
    // Second .limit() call (user lookup) → user row.
    // We need two terminal calls — script them with mockResolvedValueOnce.
    const limit = vi
      .fn()
      .mockResolvedValueOnce([
        { identifier: 'user@example.com', token: 'tok', expires: new Date(fixedNow + 1000) },
      ])
      .mockResolvedValueOnce([{ id: 'user-id-1', email: 'user@example.com' }])
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    dbMock.select.mockReturnValue({ from })

    const updateWhere = vi.fn().mockResolvedValue(undefined)
    const set = vi.fn(() => ({ where: updateWhere }))
    dbMock.update.mockReturnValue({ set })

    const deleteWhere = vi.fn().mockResolvedValue(undefined)
    dbMock.delete.mockReturnValue({ where: deleteWhere })

    const r = await consumeVerificationToken({
      email: 'user@example.com',
      token: 'tok',
      now: () => fixedNow,
    })

    expect(r).toEqual({ ok: true, userId: 'user-id-1', email: 'user@example.com' })
    expect(set).toHaveBeenCalled()
    const setArg = set.mock.calls[0][0] as { emailVerified: Date }
    expect(setArg.emailVerified.getTime()).toBe(fixedNow)
    expect(deleteWhere).toHaveBeenCalled()
  })

  it('returns no_user when the token is valid but the user has been deleted', async () => {
    const fixedNow = 1_700_000_000_000
    const limit = vi
      .fn()
      .mockResolvedValueOnce([
        { identifier: 'ghost@example.com', token: 'tok', expires: new Date(fixedNow + 1000) },
      ])
      .mockResolvedValueOnce([]) // user lookup empty
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    dbMock.select.mockReturnValue({ from })
    const deleteWhere = vi.fn().mockResolvedValue(undefined)
    dbMock.delete.mockReturnValue({ where: deleteWhere })

    const r = await consumeVerificationToken({
      email: 'ghost@example.com',
      token: 'tok',
      now: () => fixedNow,
    })
    expect(r).toEqual({ ok: false, reason: 'no_user' })
    expect(deleteWhere).toHaveBeenCalled()
  })
})

describe('purgeExpiredTokens', () => {
  it('issues a delete for expired tokens scoped to the email', async () => {
    const chain = makeChain([])
    await purgeExpiredTokens({ email: 'a@b.co', now: () => 1_700_000_000_000 })
    expect(chain.deleteWhere).toHaveBeenCalled()
  })

  it('swallows errors (best-effort)', async () => {
    dbMock.delete.mockImplementation(() => {
      throw new Error('boom')
    })
    await expect(
      purgeExpiredTokens({ email: 'a@b.co' })
    ).resolves.toBeUndefined()
  })
})
