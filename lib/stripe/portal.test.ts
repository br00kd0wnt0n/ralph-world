import { describe, it, expect, vi, beforeEach } from 'vitest'

const { portalCreateMock } = vi.hoisted(() => ({
  portalCreateMock: vi
    .fn()
    .mockResolvedValue({ url: 'https://billing.stripe.com/p/session/test_123' }),
}))

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      billingPortal: { sessions: { create: portalCreateMock } },
    })),
  }
})

import { createPortalSession } from './portal'
import { _resetStripeClient } from './client'

beforeEach(() => {
  vi.clearAllMocks()
  portalCreateMock.mockResolvedValue({
    url: 'https://billing.stripe.com/p/session/test_123',
  })
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.NEXT_PUBLIC_APP_URL = 'https://ralph.world'
  _resetStripeClient()
})

describe('createPortalSession', () => {
  it('creates a billing portal session and returns the url', async () => {
    const result = await createPortalSession({ stripeCustomerId: 'cus_abc' })
    expect(result.url).toBe('https://billing.stripe.com/p/session/test_123')
    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_abc',
      return_url: 'https://ralph.world/account',
    })
  })

  it('accepts a custom return_url', async () => {
    await createPortalSession({
      stripeCustomerId: 'cus_abc',
      returnUrl: 'https://ralph.world/account?from=portal',
    })
    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_abc',
      return_url: 'https://ralph.world/account?from=portal',
    })
  })

  it('trims trailing slashes from appUrl', async () => {
    await createPortalSession({
      stripeCustomerId: 'cus_abc',
      appUrl: 'https://ralph.world///',
    })
    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_abc',
      return_url: 'https://ralph.world/account',
    })
  })

  it('throws when STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY
    _resetStripeClient()
    await expect(
      createPortalSession({ stripeCustomerId: 'cus_abc' })
    ).rejects.toThrow(/STRIPE_SECRET_KEY/)
  })

  it('throws when Stripe returns a session without a url', async () => {
    portalCreateMock.mockResolvedValueOnce({ url: null })
    await expect(
      createPortalSession({ stripeCustomerId: 'cus_abc' })
    ).rejects.toThrow(/no url/)
  })
})
