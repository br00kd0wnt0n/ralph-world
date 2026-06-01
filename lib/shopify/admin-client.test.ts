import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shopifyAdminFetch, ShopifyAdminError } from './admin-client'

function makeFetch(responses: Array<{ status: number; body?: unknown } | Error>) {
  let i = 0
  return vi.fn(async () => {
    const next = responses[i++]
    if (next instanceof Error) throw next
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body ?? {},
      text: async () => JSON.stringify(next.body ?? {}),
    }
  })
}

beforeEach(() => {
  process.env.SHOPIFY_STORE_DOMAIN = 'test.myshopify.com'
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = 'shpat_test'
})

describe('shopifyAdminFetch', () => {
  it('throws when SHOPIFY_STORE_DOMAIN is missing', async () => {
    delete process.env.SHOPIFY_STORE_DOMAIN
    await expect(
      shopifyAdminFetch({ path: '/x.json', fetchImpl: makeFetch([{ status: 200 }]) })
    ).rejects.toThrow(/SHOPIFY_STORE_DOMAIN/)
  })

  it('throws when SHOPIFY_ADMIN_ACCESS_TOKEN is missing', async () => {
    delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
    await expect(
      shopifyAdminFetch({ path: '/x.json', fetchImpl: makeFetch([{ status: 200 }]) })
    ).rejects.toThrow(/SHOPIFY_ADMIN_ACCESS_TOKEN/)
  })

  it('returns JSON on 2xx', async () => {
    const result = await shopifyAdminFetch<{ ping: string }>({
      path: '/ping.json',
      fetchImpl: makeFetch([{ status: 200, body: { ping: 'pong' } }]),
    })
    expect(result).toEqual({ ping: 'pong' })
  })

  it('builds the URL with version + query', async () => {
    const fn = makeFetch([{ status: 200, body: {} }])
    await shopifyAdminFetch({
      path: '/customers/search.json',
      query: { query: 'email:foo@bar.co' },
      fetchImpl: fn,
    })
    const call = fn.mock.calls[0][0] as string
    expect(call).toContain('https://test.myshopify.com/admin/api/')
    expect(call).toContain('/customers/search.json?')
    expect(call).toContain('email%3Afoo%40bar.co')
  })

  it('retries on 5xx then succeeds', async () => {
    const fn = makeFetch([
      { status: 500 },
      { status: 502 },
      { status: 200, body: { ok: 1 } },
    ])
    const result = await shopifyAdminFetch<{ ok: number }>({
      path: '/x.json',
      fetchImpl: fn,
      sleep: () => Promise.resolve(),
    })
    expect(result).toEqual({ ok: 1 })
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('retries on 429 (rate limit)', async () => {
    const fn = makeFetch([
      { status: 429 },
      { status: 200, body: { ok: 1 } },
    ])
    await shopifyAdminFetch({
      path: '/x.json',
      fetchImpl: fn,
      sleep: () => Promise.resolve(),
    })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries on network error', async () => {
    const fn = makeFetch([new Error('ECONNRESET'), { status: 200, body: {} }])
    await shopifyAdminFetch({
      path: '/x.json',
      fetchImpl: fn,
      sleep: () => Promise.resolve(),
    })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws ShopifyAdminError on 4xx (no retry)', async () => {
    const fn = makeFetch([{ status: 422, body: { errors: 'bad' } }])
    await expect(
      shopifyAdminFetch({
        path: '/x.json',
        fetchImpl: fn,
        sleep: () => Promise.resolve(),
      })
    ).rejects.toBeInstanceOf(ShopifyAdminError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('exhausts retries and throws the last error', async () => {
    const fn = makeFetch([
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
    ])
    await expect(
      shopifyAdminFetch({
        path: '/x.json',
        fetchImpl: fn,
        maxRetries: 3,
        sleep: () => Promise.resolve(),
      })
    ).rejects.toThrow(/500/)
    expect(fn).toHaveBeenCalledTimes(4) // initial + 3 retries
  })

  it('sends X-Shopify-Access-Token header + JSON body', async () => {
    const fn = makeFetch([{ status: 201, body: { customer: { id: 1 } } }])
    await shopifyAdminFetch({
      method: 'POST',
      path: '/customers.json',
      body: { customer: { email: 'a@b.co' } },
      fetchImpl: fn,
    })
    const init = fn.mock.calls[0][1] as { headers: Record<string, string>; body: string; method: string }
    expect(init.method).toBe('POST')
    expect(init.headers['X-Shopify-Access-Token']).toBe('shpat_test')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ customer: { email: 'a@b.co' } })
  })
})
