import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for the pure checkout params builder + a thin integration
 * test of createSubscriptionCheckout via a mocked Stripe SDK.
 */

const { stripeCreateMock } = vi.hoisted(() => ({
  stripeCreateMock: vi
    .fn()
    .mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/c/cs_test_123' }),
}))

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: { sessions: { create: stripeCreateMock } },
    })),
  }
})

import {
  buildSubscriptionCheckoutParams,
  createSubscriptionCheckout,
} from './checkout'
import { _resetStripeClient } from './client'

beforeEach(() => {
  vi.clearAllMocks()
  stripeCreateMock.mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/c/cs_test_123',
  })
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_PRICE_ID = 'price_test_dummy'
  process.env.NEXT_PUBLIC_APP_URL = 'https://ralph.world'
  _resetStripeClient()
})

describe('buildSubscriptionCheckoutParams — shape', () => {
  it('sets mode=subscription with the price and quantity 1', () => {
    const params = buildSubscriptionCheckoutParams({
      userId: 'u1',
      email: 'u@example.com',
      stripeCustomerId: null,
      priceId: 'price_abc',
      successUrl: 'https://x/y',
      cancelUrl: 'https://x/z',
    })
    expect(params.mode).toBe('subscription')
    expect(params.line_items).toEqual([{ price: 'price_abc', quantity: 1 }])
  })

  it('restricts shipping address collection to GB only', () => {
    const params = buildSubscriptionCheckoutParams({
      userId: 'u1',
      email: 'u@example.com',
      stripeCustomerId: null,
      priceId: 'price_abc',
      successUrl: 'https://x/y',
      cancelUrl: 'https://x/z',
    })
    expect(params.shipping_address_collection).toEqual({ allowed_countries: ['GB'] })
  })

  it('passes user_id in BOTH session.metadata AND subscription_data.metadata', () => {
    const params = buildSubscriptionCheckoutParams({
      userId: 'user-abc',
      email: 'u@example.com',
      stripeCustomerId: null,
      priceId: 'price_abc',
      successUrl: 'https://x/y',
      cancelUrl: 'https://x/z',
    })
    expect(params.metadata).toEqual({ user_id: 'user-abc' })
    expect(params.subscription_data?.metadata).toEqual({ user_id: 'user-abc' })
  })

  it('explicitly disables promotion codes (v1 policy)', () => {
    const params = buildSubscriptionCheckoutParams({
      userId: 'u1',
      email: 'u@example.com',
      stripeCustomerId: null,
      priceId: 'price_abc',
      successUrl: 'https://x/y',
      cancelUrl: 'https://x/z',
    })
    expect(params.allow_promotion_codes).toBe(false)
  })

  it('sets success_url + cancel_url verbatim', () => {
    const params = buildSubscriptionCheckoutParams({
      userId: 'u1',
      email: 'u@example.com',
      stripeCustomerId: null,
      priceId: 'price_abc',
      successUrl: 'https://ralph.world/account?subscribed=1',
      cancelUrl: 'https://ralph.world/account',
    })
    expect(params.success_url).toBe('https://ralph.world/account?subscribed=1')
    expect(params.cancel_url).toBe('https://ralph.world/account')
  })
})

describe('buildSubscriptionCheckoutParams — customer binding', () => {
  it('uses customer_email when stripeCustomerId is null', () => {
    const params = buildSubscriptionCheckoutParams({
      userId: 'u1',
      email: 'first-time@example.com',
      stripeCustomerId: null,
      priceId: 'price_abc',
      successUrl: 'https://x/y',
      cancelUrl: 'https://x/z',
    })
    expect(params.customer_email).toBe('first-time@example.com')
    expect(params.customer).toBeUndefined()
    expect(params.customer_update).toBeUndefined()
  })

  it('uses customer + customer_update when stripeCustomerId is set', () => {
    const params = buildSubscriptionCheckoutParams({
      userId: 'u1',
      email: 'returning@example.com',
      stripeCustomerId: 'cus_existing_1',
      priceId: 'price_abc',
      successUrl: 'https://x/y',
      cancelUrl: 'https://x/z',
    })
    expect(params.customer).toBe('cus_existing_1')
    expect(params.customer_email).toBeUndefined()
    // customer_update is required when passing both `customer` and
    // `shipping_address_collection` — without it Stripe errors.
    expect(params.customer_update).toEqual({
      shipping: 'auto',
      address: 'auto',
      name: 'auto',
    })
  })
})

describe('createSubscriptionCheckout', () => {
  it('passes the built params to the Stripe SDK and returns { url, sessionId }', async () => {
    const result = await createSubscriptionCheckout({
      userId: 'u1',
      email: 'u@example.com',
      stripeCustomerId: null,
    })

    expect(result.url).toBe('https://checkout.stripe.com/c/cs_test_123')
    expect(result.sessionId).toBe('cs_test_123')
    expect(stripeCreateMock).toHaveBeenCalledTimes(1)
    const params = stripeCreateMock.mock.calls[0][0]
    expect(params.mode).toBe('subscription')
    expect(params.line_items[0].price).toBe('price_test_dummy')
    expect(params.success_url).toBe('https://ralph.world/account?subscribed=1')
    expect(params.cancel_url).toBe('https://ralph.world/account')
    expect(params.metadata.user_id).toBe('u1')
  })

  it('throws when STRIPE_PRICE_ID is not set', async () => {
    delete process.env.STRIPE_PRICE_ID
    await expect(
      createSubscriptionCheckout({
        userId: 'u1',
        email: 'u@example.com',
        stripeCustomerId: null,
      })
    ).rejects.toThrow(/STRIPE_PRICE_ID/)
  })

  it('throws when STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY
    _resetStripeClient()
    await expect(
      createSubscriptionCheckout({
        userId: 'u1',
        email: 'u@example.com',
        stripeCustomerId: null,
      })
    ).rejects.toThrow(/STRIPE_SECRET_KEY/)
  })

  it('throws when Stripe returns a session without a url', async () => {
    stripeCreateMock.mockResolvedValueOnce({ id: 'cs_test_999', url: null })
    await expect(
      createSubscriptionCheckout({
        userId: 'u1',
        email: 'u@example.com',
        stripeCustomerId: null,
      })
    ).rejects.toThrow(/no url/)
  })

  it('falls back to default appUrl when env unset', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.AUTH_URL
    await createSubscriptionCheckout({
      userId: 'u1',
      email: 'u@example.com',
      stripeCustomerId: null,
    })
    const params = stripeCreateMock.mock.calls[0][0]
    expect(params.success_url).toBe('https://ralph.world/account?subscribed=1')
  })

  it('trims trailing slashes from appUrl', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://ralph.world///'
    await createSubscriptionCheckout({
      userId: 'u1',
      email: 'u@example.com',
      stripeCustomerId: null,
    })
    const params = stripeCreateMock.mock.calls[0][0]
    expect(params.success_url).toBe('https://ralph.world/account?subscribed=1')
    expect(params.cancel_url).toBe('https://ralph.world/account')
  })
})
