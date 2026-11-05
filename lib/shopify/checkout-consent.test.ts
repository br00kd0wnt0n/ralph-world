import { describe, it, expect, vi, afterEach } from 'vitest'
import { cartCheckoutUrlQuery, createCartWithAttributesMutation } from './queries'
import { getCheckoutUrl, createCheckoutUrl, withApiVersion } from './client'

describe('visitor consent in checkout queries', () => {
  it('adds an all-true directive for "Accept all"', () => {
    const q = cartCheckoutUrlQuery(true)
    expect(q).toContain(
      '@inContext(visitorConsent: { analytics: true, marketing: true, preferences: true, saleOfData: true })'
    )
  })

  it('adds an all-false directive for "Necessary only"', () => {
    expect(createCartWithAttributesMutation(false)).toContain('marketing: false')
  })

  it('adds no directive when the visitor has not chosen', () => {
    expect(cartCheckoutUrlQuery(undefined)).not.toContain('@inContext')
  })
})

describe('withApiVersion', () => {
  it('swaps the version segment of a Storefront URL', () => {
    expect(withApiVersion('https://shop.example.com/api/2024-01/graphql.json', '2025-10')).toBe(
      'https://shop.example.com/api/2025-10/graphql.json'
    )
  })
})

describe('checkout URL calls', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  function stub(response: unknown) {
    vi.stubEnv('SHOPIFY_STOREFRONT_URL', 'https://shop.example.com/api/2024-01/graphql.json')
    vi.stubEnv('SHOPIFY_STOREFRONT_TOKEN', 'x'.repeat(32))
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('getCheckoutUrl uses API 2025-10 and sends the consent directive', async () => {
    const fetchMock = stub({ data: { cart: { checkoutUrl: 'https://shop/cart/c/1?_cs=3AMPS.' } } })
    await expect(getCheckoutUrl('gid://shopify/Cart/1?key=a', true)).resolves.toBe(
      'https://shop/cart/c/1?_cs=3AMPS.'
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://shop.example.com/api/2025-10/graphql.json')
    expect(JSON.parse(init.body).query).toContain('visitorConsent')
  })

  it('createCheckoutUrl passes consent through', async () => {
    const fetchMock = stub({ data: { cartCreate: { cart: { id: 'c', checkoutUrl: 'u' }, userErrors: [] } } })
    await createCheckoutUrl('gid://shopify/ProductVariant/1', { landing: 'issue9' }, false)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).query).toContain('analytics: false')
  })
})
