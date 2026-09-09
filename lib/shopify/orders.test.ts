import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * resolveIssueVariant + createMagazineOrder.
 *
 * Both bugs these guard against were found in production data on
 * 2026-09-09: the CMS issue held a PRODUCT id (silently produced an
 * order with sku: null), and orders were created with no shipping
 * address (Shopify doesn't copy the customer default onto API orders).
 */

import { resolveIssueVariant, createMagazineOrder } from './orders'

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

const ADDRESS = {
  first_name: 'Test',
  last_name: 'Person',
  address1: '1 Example Street',
  address2: '',
  city: 'London',
  province: '',
  zip: 'N1 1AA',
  country_code: 'GB',
  phone: '',
  company: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SHOPIFY_STORE_DOMAIN = 'test-store.myshopify.com'
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = 'shpat_test'
})

describe('resolveIssueVariant — given a variant id', () => {
  it('returns the variant with its SKU and product title', async () => {
    const { fn, calls } = fakeFetch(({ url }) => {
      if (url.includes('/variants/53688078336343.json')) {
        return {
          status: 200,
          body: {
            variant: { id: 53688078336343, product_id: 10905032294743, sku: '368130000008', price: '10.00' },
          },
        }
      }
      if (url.includes('/products/10905032294743.json')) {
        return { status: 200, body: { product: { title: 'Ralph Mag #8' } } }
      }
      return { status: 404, body: { errors: 'Not Found' } }
    })

    const r = await resolveIssueVariant({ id: '53688078336343', fetchImpl: fn })

    expect(r).toEqual({
      variantId: '53688078336343',
      productId: '10905032294743',
      productTitle: 'Ralph Mag #8',
      sku: '368130000008',
      price: '10.00',
      resolvedFrom: 'variant',
    })
    expect(calls[0].url).toContain('/variants/53688078336343.json')
  })

  it('refuses a variant with an empty SKU (no EAN for Newsstand)', async () => {
    const { fn } = fakeFetch(({ url }) =>
      url.includes('/variants/')
        ? { status: 200, body: { variant: { id: 1, product_id: 2, sku: '  ', price: '10.00' } } }
        : { status: 404, body: {} }
    )
    await expect(resolveIssueVariant({ id: '1', fetchImpl: fn })).rejects.toThrow(/empty SKU/)
  })

  it('tolerates a gid:// prefix', async () => {
    const { fn, calls } = fakeFetch(({ url }) =>
      url.includes('/variants/99.json')
        ? { status: 200, body: { variant: { id: 99, product_id: 5, sku: 'EAN99', price: '1.00' } } }
        : { status: 200, body: { product: { title: 'T' } } }
    )
    const r = await resolveIssueVariant({ id: 'gid://shopify/ProductVariant/99', fetchImpl: fn })
    expect(r.variantId).toBe('99')
    expect(calls[0].url).toContain('/variants/99.json')
  })
})

describe('resolveIssueVariant — given a product id (what editors paste from the admin URL)', () => {
  it('falls back to the product and uses its single variant', async () => {
    const { fn, calls } = fakeFetch(({ url }) => {
      if (url.includes('/variants/10905032294743.json')) {
        return { status: 404, body: { errors: 'Not Found' } }
      }
      if (url.includes('/products/10905032294743.json')) {
        return {
          status: 200,
          body: {
            product: {
              id: 10905032294743,
              title: 'Ralph Mag #8',
              variants: [{ id: 53688078336343, sku: '368130000008', price: '10.00' }],
            },
          },
        }
      }
      return { status: 500, body: {} }
    })

    const r = await resolveIssueVariant({ id: '10905032294743', fetchImpl: fn })

    expect(r).toEqual({
      variantId: '53688078336343',
      productId: '10905032294743',
      productTitle: 'Ralph Mag #8',
      sku: '368130000008',
      price: '10.00',
      resolvedFrom: 'product',
    })
    // variant lookup first, then product — no retry storm on the 404
    expect(calls.map((c) => c.url.split('/admin/api/2024-01')[1].split('?')[0])).toEqual([
      '/variants/10905032294743.json',
      '/products/10905032294743.json',
    ])
  })

  it('refuses a multi-variant product (ambiguous which issue)', async () => {
    const { fn } = fakeFetch(({ url }) =>
      url.includes('/variants/')
        ? { status: 404, body: {} }
        : {
            status: 200,
            body: {
              product: {
                id: 7,
                title: 'Mag Subscription',
                variants: [
                  { id: 1, sku: 'A', price: '36.00' },
                  { id: 2, sku: 'B', price: '70.00' },
                ],
              },
            },
          }
    )
    await expect(resolveIssueVariant({ id: '7', fetchImpl: fn })).rejects.toThrow(/2 variants/)
  })

  it('refuses a product whose only variant has no SKU', async () => {
    const { fn } = fakeFetch(({ url }) =>
      url.includes('/variants/')
        ? { status: 404, body: {} }
        : {
            status: 200,
            body: { product: { id: 7, title: 'Ralph Mag #9', variants: [{ id: 1, sku: null, price: '10.00' }] } },
          }
    )
    await expect(resolveIssueVariant({ id: '7', fetchImpl: fn })).rejects.toThrow(/empty SKU/)
  })

  it('throws a clear message when neither a variant nor a product exists', async () => {
    const { fn } = fakeFetch(() => ({ status: 404, body: { errors: 'Not Found' } }))
    await expect(resolveIssueVariant({ id: '424242', fetchImpl: fn })).rejects.toThrow(
      /no variant or product with ID 424242/
    )
  })

  it('propagates non-404 errors instead of masking them as "not found"', async () => {
    const { fn } = fakeFetch(() => ({ status: 401, body: { errors: 'Unauthorized' } }))
    await expect(resolveIssueVariant({ id: '1', fetchImpl: fn })).rejects.toThrow(/401/)
  })
})

describe('createMagazineOrder', () => {
  it('sends the shipping address, the verified variant, a £0 line and no customer emails', async () => {
    const { fn, calls } = fakeFetch(() => ({
      status: 201,
      body: { order: { id: 7908972822871, name: '#1565' } },
    }))

    const r = await createMagazineOrder({
      shopifyCustomerId: '258791866369',
      shopifyVariantId: '53688078336343',
      shippingAddress: ADDRESS,
      issueNumber: 9,
      shipmentId: 'ship-1',
      fetchImpl: fn,
    })

    expect(r).toEqual({ shopifyOrderId: '7908972822871' })
    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('POST')
    expect(calls[0].url).toContain('/orders.json')

    const order = (calls[0].body as { order: Record<string, unknown> }).order
    expect(order.shipping_address).toEqual(ADDRESS)
    expect(order.customer).toEqual({ id: 258791866369 })
    expect(order.line_items).toEqual([
      {
        variant_id: 53688078336343,
        quantity: 1,
        price: '0.00',
        title: 'Ralph Magazine — Issue 9',
        name: 'Ralph Magazine — Issue 9',
      },
    ])
    expect(order.financial_status).toBe('paid')
    expect(order.send_receipt).toBe(false)
    expect(order.send_fulfillment_receipt).toBe(false)
    expect(order.note).toContain('shipment ship-1')
  })

  it('throws when Shopify returns no order id', async () => {
    const { fn } = fakeFetch(() => ({ status: 201, body: { order: {} } }))
    await expect(
      createMagazineOrder({
        shopifyCustomerId: '1',
        shopifyVariantId: '2',
        shippingAddress: ADDRESS,
        issueNumber: 9,
        shipmentId: 's',
        fetchImpl: fn,
      })
    ).rejects.toThrow(/no order id/)
  })
})
