import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * findOrCreateCustomer — Task 1.6.
 *
 * Covers the four paths the SOW asks for:
 *   1. Happy path (already linked)
 *   2. Email-match path (Shopify customer exists, no link yet)
 *   3. Create path (Shopify customer doesn't exist)
 *   4. Retry path (transient 5xx then success)
 *
 * Strategy: mock @/lib/db and @/lib/audit at module boundaries. Inject a
 * stub fetch implementation into findOrCreateCustomer via `fetchImpl`
 * so we don't have to touch global state.
 */

const { dbMock, logActionMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  logActionMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/db', () => ({ getDb: () => dbMock }))
vi.mock('@/lib/audit', () => ({ logAction: logActionMock }))

import { findOrCreateCustomer } from './customer'

interface FetchCall {
  url: string
  method: string
  body?: unknown
}

function fakeFetch(handler: (call: FetchCall) => { status: number; body: unknown }) {
  const calls: FetchCall[] = []
  const fn = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    const call: FetchCall = {
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body) : undefined,
    }
    calls.push(call)
    const { status, body } = handler(call)
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }
  })
  return { fn, calls }
}

/** Stub the (select → from → where → limit) chain to a single result set. */
function stubSelect(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows)
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where }))
  dbMock.select.mockReturnValue({ from })
  return { limit, where, from }
}

function stubInsertOK() {
  const values = vi.fn().mockResolvedValue(undefined)
  dbMock.insert.mockReturnValue({ values })
  return { values }
}

function stubInsertConflict() {
  const values = vi.fn().mockRejectedValue(
    Object.assign(new Error('duplicate'), { code: '23505' })
  )
  dbMock.insert.mockReturnValue({ values })
  return { values }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SHOPIFY_STORE_DOMAIN = 'test-store.myshopify.com'
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = 'shpat_test'
})

describe('findOrCreateCustomer — already linked', () => {
  it('returns the existing link without calling Shopify', async () => {
    stubSelect([
      {
        userId: 'u1',
        shopifyCustomerId: '12345',
        linkMethod: 'auto_signup_create',
      },
    ])
    const { fn } = fakeFetch(() => ({ status: 500, body: {} }))

    const result = await findOrCreateCustomer({
      userId: 'u1',
      email: 'user@example.com',
      fetchImpl: fn,
    })

    expect(result).toEqual({
      shopifyCustomerId: '12345',
      method: 'auto_signup_create',
      alreadyLinked: true,
    })
    expect(fn).not.toHaveBeenCalled()
    expect(dbMock.insert).not.toHaveBeenCalled()
    expect(logActionMock).not.toHaveBeenCalled()
  })
})

describe('findOrCreateCustomer — email-match path', () => {
  it('uses the matched Shopify customer, writes link, logs audit', async () => {
    stubSelect([]) // no existing link
    const { values } = stubInsertOK()
    const { fn, calls } = fakeFetch((call) => {
      if (call.url.includes('/customers/search.json')) {
        return {
          status: 200,
          body: { customers: [{ id: 999, email: 'user@example.com' }] },
        }
      }
      throw new Error('unexpected call: ' + call.url)
    })

    const result = await findOrCreateCustomer({
      userId: 'u-new',
      email: 'User@Example.COM',
      fetchImpl: fn,
    })

    expect(result).toEqual({
      shopifyCustomerId: '999',
      method: 'auto_email_match_at_signup',
      alreadyLinked: false,
    })
    // Search query is normalised to lowercase.
    expect(calls[0].url).toContain('email%3Auser%40example.com')
    expect(values).toHaveBeenCalledWith({
      userId: 'u-new',
      shopifyCustomerId: '999',
      linkMethod: 'auto_email_match_at_signup',
    })
    expect(logActionMock).toHaveBeenCalledTimes(1)
    expect(logActionMock.mock.calls[0][0]).toMatchObject({
      action: 'shopify_link_created',
      targetType: 'user',
      targetId: 'u-new',
      after: { shopifyCustomerId: '999', method: 'auto_email_match_at_signup' },
      source: 'system',
    })
  })

  it('ignores Shopify entries that do not match the email exactly', async () => {
    stubSelect([])
    stubInsertOK()
    const { fn, calls } = fakeFetch((call) => {
      if (call.url.includes('/customers/search.json')) {
        return {
          status: 200,
          // Shopify's email:foo search can match aliases / similar
          // addresses — we double-check on the response.
          body: { customers: [{ id: 1, email: 'someone-else@example.com' }] },
        }
      }
      if (call.url.includes('/customers.json')) {
        return { status: 201, body: { customer: { id: 7, email: 'user@example.com' } } }
      }
      throw new Error('unexpected: ' + call.url)
    })
    const result = await findOrCreateCustomer({
      userId: 'u',
      email: 'user@example.com',
      fetchImpl: fn,
    })
    expect(result.method).toBe('auto_signup_create')
    expect(result.shopifyCustomerId).toBe('7')
    expect(calls.some((c) => c.url.includes('/customers.json'))).toBe(true)
  })
})

describe('findOrCreateCustomer — create path', () => {
  it('POSTs customers.json with split name + email, writes link', async () => {
    stubSelect([])
    const { values } = stubInsertOK()
    const { fn, calls } = fakeFetch((call) => {
      if (call.url.includes('/customers/search.json')) {
        return { status: 200, body: { customers: [] } }
      }
      if (call.url.includes('/customers.json')) {
        return { status: 201, body: { customer: { id: 42, email: 'jane@example.com' } } }
      }
      throw new Error('unexpected: ' + call.url)
    })

    const result = await findOrCreateCustomer({
      userId: 'u2',
      email: 'jane@example.com',
      name: 'Jane Q Doe',
      fetchImpl: fn,
    })

    expect(result).toEqual({
      shopifyCustomerId: '42',
      method: 'auto_signup_create',
      alreadyLinked: false,
    })
    const createCall = calls.find((c) => c.url.includes('/customers.json'))!
    expect(createCall.method).toBe('POST')
    expect(createCall.body).toEqual({
      customer: { email: 'jane@example.com', first_name: 'Jane', last_name: 'Q Doe' },
    })
    expect(values).toHaveBeenCalledWith({
      userId: 'u2',
      shopifyCustomerId: '42',
      linkMethod: 'auto_signup_create',
    })
  })

  it('handles a name with no space (first_name only)', async () => {
    stubSelect([])
    stubInsertOK()
    const { fn, calls } = fakeFetch((call) => {
      if (call.url.includes('search')) return { status: 200, body: { customers: [] } }
      return { status: 201, body: { customer: { id: 8 } } }
    })
    await findOrCreateCustomer({
      userId: 'u',
      email: 'a@b.co',
      name: 'Cher',
      fetchImpl: fn,
    })
    const createCall = calls.find((c) => c.url.includes('/customers.json'))!
    expect(createCall.body).toEqual({
      customer: { email: 'a@b.co', first_name: 'Cher' },
    })
  })

  it('throws when Shopify returns no customer.id on create', async () => {
    stubSelect([])
    const { fn } = fakeFetch((call) => {
      if (call.url.includes('search')) return { status: 200, body: { customers: [] } }
      return { status: 201, body: { customer: {} } }
    })
    await expect(
      findOrCreateCustomer({ userId: 'u', email: 'a@b.co', fetchImpl: fn })
    ).rejects.toThrow(/no customer id/)
  })
})

describe('findOrCreateCustomer — race / duplicate-link handling', () => {
  it('swallows 23505 on shopify_links insert (concurrent write won)', async () => {
    stubSelect([])
    stubInsertConflict()
    const { fn } = fakeFetch((call) => {
      if (call.url.includes('search')) return { status: 200, body: { customers: [] } }
      return { status: 201, body: { customer: { id: 1 } } }
    })
    const result = await findOrCreateCustomer({
      userId: 'u',
      email: 'a@b.co',
      fetchImpl: fn,
    })
    // Still returns the customer id, audit still runs.
    expect(result.shopifyCustomerId).toBe('1')
    expect(logActionMock).toHaveBeenCalled()
  })
})

describe('findOrCreateCustomer — retry path', () => {
  it('retries transient 5xx then succeeds on the search call', async () => {
    stubSelect([])
    stubInsertOK()
    let searchAttempts = 0
    const { fn } = fakeFetch((call) => {
      if (call.url.includes('search')) {
        searchAttempts += 1
        if (searchAttempts < 3) return { status: 503, body: { error: 'try again' } }
        return { status: 200, body: { customers: [{ id: 5, email: 'a@b.co' }] } }
      }
      throw new Error('should not reach create')
    })

    // Patch sleep to noop so the test doesn't wait. shopifyAdminFetch's
    // sleep is internal — but we use a tiny fetch backoff for the test
    // by importing the module's default behaviour. Speed-up by reducing
    // backoff via env-less options would require leaking the param;
    // instead we just accept ~0.75s of sleep in this single test.
    const result = await findOrCreateCustomer({
      userId: 'u',
      email: 'a@b.co',
      fetchImpl: fn,
    })
    expect(result.shopifyCustomerId).toBe('5')
    expect(result.method).toBe('auto_email_match_at_signup')
    expect(searchAttempts).toBe(3)
  }, 10_000)

  it('does NOT retry 4xx errors (auth / bad request)', async () => {
    stubSelect([])
    let searchAttempts = 0
    const { fn } = fakeFetch(() => {
      searchAttempts += 1
      return { status: 401, body: { errors: 'unauthorized' } }
    })
    await expect(
      findOrCreateCustomer({ userId: 'u', email: 'a@b.co', fetchImpl: fn })
    ).rejects.toThrow(/401/)
    expect(searchAttempts).toBe(1)
  })
})
