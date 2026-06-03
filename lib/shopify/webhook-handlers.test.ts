import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  handleCustomersUpdate,
  handleFulfillmentsCreate,
} from './webhook-handlers'

function stubSelect(rows: unknown[]) {
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

beforeEach(() => {
  vi.clearAllMocks()
})

// ── customers/update ────────────────────────────────────────────────

describe('handleCustomersUpdate', () => {
  it('mirrors default_address onto the linked profile', async () => {
    stubSelect([{ userId: 'user-1' }])
    const upd = stubUpdate()
    const result = await handleCustomersUpdate({
      id: 12345,
      default_address: { address1: '1 King St', city: 'London', zip: 'W1A 1AA' },
    })
    expect(result).toEqual(
      expect.objectContaining({ ok: true, effects: { userId: 'user-1' } })
    )
    const setArg = upd.set.mock.calls[0][0]
    expect(setArg.shippingAddressCached).toEqual({
      address1: '1 King St',
      city: 'London',
      zip: 'W1A 1AA',
    })
    expect(logActionMock).toHaveBeenCalledTimes(1)
  })

  it('returns { ok: false } when customer id is missing', async () => {
    const result = await handleCustomersUpdate({ default_address: {} })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/missing customer id/)
  })

  it('returns ok with no-op effect when payload has no default_address', async () => {
    const result = await handleCustomersUpdate({ id: 12345 })
    expect(result).toEqual({
      ok: true,
      effects: { skipped: 'no_address_in_payload' },
    })
  })

  it('returns { ok: false } when no shopify_links row exists', async () => {
    stubSelect([])
    const result = await handleCustomersUpdate({
      id: 99999,
      default_address: { address1: 'X' },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/no shopify_links/)
  })

  it('normalises numeric ids to strings before DB lookup', async () => {
    const stub = stubSelect([{ userId: 'user-1' }])
    stubUpdate()
    await handleCustomersUpdate({
      id: 42,
      default_address: { address1: 'X' },
    })
    expect(stub.where).toHaveBeenCalled()
  })
})

// ── fulfillments/create ─────────────────────────────────────────────

describe('handleFulfillmentsCreate', () => {
  it('flips the magazine_shipments row to fulfilled', async () => {
    stubSelect([
      { id: 'ship-1', status: 'shopify_order_created', userId: 'user-1' },
    ])
    const upd = stubUpdate()
    const result = await handleFulfillmentsCreate({
      id: 'ful_1',
      order_id: 'order_abc',
      status: 'success',
    })
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        effects: { shipmentId: 'ship-1', status: 'fulfilled', userId: 'user-1' },
      })
    )
    const setArg = upd.set.mock.calls[0][0]
    expect(setArg.status).toBe('fulfilled')
    expect(setArg.shippedAt).toBeInstanceOf(Date)
    expect(logActionMock).toHaveBeenCalledTimes(1)
  })

  it('is idempotent — skips when row is already fulfilled', async () => {
    stubSelect([{ id: 'ship-1', status: 'fulfilled', userId: 'user-1' }])
    const result = await handleFulfillmentsCreate({
      order_id: 'order_abc',
    })
    expect(result).toEqual({
      ok: true,
      effects: { skipped: 'already_fulfilled', shipmentId: 'ship-1' },
    })
    expect(dbMock.update).not.toHaveBeenCalled()
    expect(logActionMock).not.toHaveBeenCalled()
  })

  it('returns ok with no-op when order_id is not a magazine shipment we track', async () => {
    stubSelect([]) // no shipment row
    const result = await handleFulfillmentsCreate({
      order_id: 'order_unrelated',
    })
    expect(result).toEqual({
      ok: true,
      effects: { skipped: 'not_a_magazine_shipment' },
    })
    expect(dbMock.update).not.toHaveBeenCalled()
  })

  it('returns { ok: false } when order_id is missing', async () => {
    const result = await handleFulfillmentsCreate({ id: 'ful_1' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/missing order_id/)
  })
})
