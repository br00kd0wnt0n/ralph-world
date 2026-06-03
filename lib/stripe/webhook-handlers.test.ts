import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Stripe webhook handler tests — Task 2.3.
 *
 * Mocks @/lib/db (Drizzle chain) and @/lib/audit (logAction).
 * Each handler is exercised against a canned event payload that
 * mirrors the relevant Stripe object shape — enough fields to
 * exercise our code, not the full Stripe schema.
 */

const { dbMock, logActionMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
  },
  logActionMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/db', () => ({ getDb: () => dbMock }))
vi.mock('@/lib/audit', () => ({ logAction: logActionMock }))

import {
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaid,
} from './webhook-handlers'

// ── Helpers ──────────────────────────────────────────────────────────

function stubSelectByCustomer(rows: Array<{ id: string }>) {
  const limit = vi.fn().mockResolvedValue(rows)
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where }))
  dbMock.select.mockReturnValue({ from })
  return { from, where, limit }
}

function stubUpdate() {
  const updateWhere = vi.fn().mockResolvedValue(undefined)
  const set = vi.fn(() => ({ where: updateWhere }))
  dbMock.update.mockReturnValue({ set })
  return { set, updateWhere }
}

interface EventLike {
  id?: string
  type: string
  data: { object: unknown }
}

// Helper to cast our fake event to the Stripe.Event type the handlers expect.
// We're not exercising the SDK's type machinery here — just the data shape.
function asEvent(e: EventLike): Parameters<typeof handleCheckoutSessionCompleted>[0] {
  return { id: 'evt_test_1', ...e } as unknown as Parameters<
    typeof handleCheckoutSessionCompleted
  >[0]
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── checkout.session.completed ───────────────────────────────────────

describe('handleCheckoutSessionCompleted', () => {
  it('sets tier=paid + writes stripe_customer_id + subscription_id from metadata.user_id', async () => {
    const upd = stubUpdate()
    const result = await handleCheckoutSessionCompleted(
      asEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { user_id: 'user-1' },
            customer: 'cus_abc',
            subscription: 'sub_xyz',
            shipping_details: {
              name: 'Test User',
              address: { line1: '1 King St', city: 'London', postal_code: 'W1A', country: 'GB' },
            },
          },
        },
      })
    )

    expect(result).toEqual(
      expect.objectContaining({ ok: true, userId: 'user-1' })
    )
    const setArg = upd.set.mock.calls[0][0]
    expect(setArg.tier).toBe('paid')
    expect(setArg.subscriptionStatus).toBe('active')
    expect(setArg.stripeCustomerId).toBe('cus_abc')
    expect(setArg.stripeSubscriptionId).toBe('sub_xyz')
    expect(setArg.shippingAddressCached).toEqual({
      line1: '1 King St',
      city: 'London',
      postal_code: 'W1A',
      country: 'GB',
    })
    expect(logActionMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to customer lookup when metadata.user_id is missing', async () => {
    stubSelectByCustomer([{ id: 'user-from-customer' }])
    const upd = stubUpdate()
    const result = await handleCheckoutSessionCompleted(
      asEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {}, // no user_id
            customer: 'cus_fallback',
            subscription: 'sub_x',
          },
        },
      })
    )
    expect(result).toEqual(
      expect.objectContaining({ ok: true, userId: 'user-from-customer' })
    )
    expect(upd.set).toHaveBeenCalled()
  })

  it('returns { ok: false } when neither metadata nor customer can resolve a user', async () => {
    stubSelectByCustomer([]) // empty lookup
    stubUpdate()
    const result = await handleCheckoutSessionCompleted(
      asEvent({
        type: 'checkout.session.completed',
        data: {
          object: { metadata: {}, customer: 'cus_orphan' },
        },
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/cannot resolve userId/)
  })

  it('calls the onShippingAddress hook with the cached address when set', async () => {
    stubUpdate()
    const onShippingAddress = vi.fn().mockResolvedValue(undefined)
    await handleCheckoutSessionCompleted(
      asEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { user_id: 'u1' },
            customer: 'cus_a',
            subscription: 'sub_a',
            shipping_details: {
              address: { line1: '1 King St', country: 'GB' },
            },
          },
        },
      }),
      { onShippingAddress }
    )
    expect(onShippingAddress).toHaveBeenCalledWith({
      userId: 'u1',
      shippingAddressCached: { line1: '1 King St', country: 'GB' },
    })
  })

  it('does not throw when the Shopify hook errors — best-effort sync', async () => {
    stubUpdate()
    const onShippingAddress = vi.fn().mockRejectedValue(new Error('Shopify down'))
    const result = await handleCheckoutSessionCompleted(
      asEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { user_id: 'u1' },
            customer: 'cus_a',
            subscription: 'sub_a',
            shipping_details: { address: { line1: '1 King St', country: 'GB' } },
          },
        },
      }),
      { onShippingAddress }
    )
    expect(result.ok).toBe(true)
  })
})

// ── customer.subscription.updated ────────────────────────────────────

describe('handleSubscriptionUpdated', () => {
  it('maps status=active to tier=paid + writes current_period_end', async () => {
    const upd = stubUpdate()
    const periodEnd = 1_700_000_000
    const result = await handleSubscriptionUpdated(
      asEvent({
        type: 'customer.subscription.updated',
        data: {
          object: {
            metadata: { user_id: 'u1' },
            customer: 'cus_a',
            status: 'active',
            current_period_end: periodEnd,
          },
        },
      })
    )
    expect(result).toEqual(expect.objectContaining({ ok: true, userId: 'u1' }))
    const setArg = upd.set.mock.calls[0][0]
    expect(setArg.tier).toBe('paid')
    expect(setArg.subscriptionStatus).toBe('active')
    expect(setArg.subscriptionCurrentPeriodEnd).toEqual(new Date(periodEnd * 1000))
  })

  it('maps status=past_due to tier=free', async () => {
    const upd = stubUpdate()
    await handleSubscriptionUpdated(
      asEvent({
        type: 'customer.subscription.updated',
        data: {
          object: {
            metadata: { user_id: 'u1' },
            customer: 'cus_a',
            status: 'past_due',
            current_period_end: 1_700_000_000,
          },
        },
      })
    )
    const setArg = upd.set.mock.calls[0][0]
    expect(setArg.tier).toBe('free')
    expect(setArg.subscriptionStatus).toBe('past_due')
  })
})

// ── customer.subscription.deleted ────────────────────────────────────

describe('handleSubscriptionDeleted', () => {
  it('sets tier=free + clears subscription_id', async () => {
    const upd = stubUpdate()
    const result = await handleSubscriptionDeleted(
      asEvent({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            metadata: { user_id: 'u1' },
            customer: 'cus_a',
            status: 'canceled',
          },
        },
      })
    )
    expect(result).toEqual(expect.objectContaining({ ok: true, userId: 'u1' }))
    const setArg = upd.set.mock.calls[0][0]
    expect(setArg.tier).toBe('free')
    expect(setArg.subscriptionStatus).toBe('canceled')
    expect(setArg.stripeSubscriptionId).toBeNull()
  })
})

// ── invoice.payment_failed ───────────────────────────────────────────

describe('handleInvoicePaymentFailed', () => {
  it('flips subscription_status to past_due via customer lookup', async () => {
    stubSelectByCustomer([{ id: 'user-found-via-cus' }])
    const upd = stubUpdate()
    const result = await handleInvoicePaymentFailed(
      asEvent({
        type: 'invoice.payment_failed',
        data: {
          object: { customer: 'cus_owes_us', subscription: 'sub_a' },
        },
      })
    )
    expect(result).toEqual(
      expect.objectContaining({ ok: true, userId: 'user-found-via-cus' })
    )
    const setArg = upd.set.mock.calls[0][0]
    expect(setArg.subscriptionStatus).toBe('past_due')
  })

  it('returns { ok: false } when customer lookup yields no user', async () => {
    stubSelectByCustomer([])
    const result = await handleInvoicePaymentFailed(
      asEvent({
        type: 'invoice.payment_failed',
        data: { object: { customer: 'cus_orphan' } },
      })
    )
    expect(result.ok).toBe(false)
  })
})

// ── invoice.paid ─────────────────────────────────────────────────────

describe('handleInvoicePaid', () => {
  it('refreshes period_end + sets tier=paid + status=active', async () => {
    stubSelectByCustomer([{ id: 'user-x' }])
    const upd = stubUpdate()
    const periodEnd = 1_700_000_000
    const result = await handleInvoicePaid(
      asEvent({
        type: 'invoice.paid',
        data: {
          object: {
            customer: 'cus_a',
            subscription: 'sub_a',
            lines: {
              data: [
                { period: { end: periodEnd } },
                { period: { end: periodEnd - 100 } }, // older line — handler picks max
              ],
            },
          },
        },
      })
    )
    expect(result).toEqual(expect.objectContaining({ ok: true, userId: 'user-x' }))
    const setArg = upd.set.mock.calls[0][0]
    expect(setArg.tier).toBe('paid')
    expect(setArg.subscriptionStatus).toBe('active')
    expect(setArg.subscriptionCurrentPeriodEnd).toEqual(new Date(periodEnd * 1000))
  })

  it('works even when invoice has no lines (no period_end update)', async () => {
    stubSelectByCustomer([{ id: 'user-x' }])
    const upd = stubUpdate()
    await handleInvoicePaid(
      asEvent({
        type: 'invoice.paid',
        data: { object: { customer: 'cus_a' } },
      })
    )
    const setArg = upd.set.mock.calls[0][0]
    expect(setArg.tier).toBe('paid')
    expect(setArg.subscriptionStatus).toBe('active')
    expect(setArg.subscriptionCurrentPeriodEnd).toBeUndefined()
  })
})
