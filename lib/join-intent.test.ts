import { describe, it, expect } from 'vitest'
import { parseJoinIntent, PAID_CHECKOUT_PATH } from './join-intent'

describe('parseJoinIntent', () => {
  it('accepts only "paid"', () => {
    expect(parseJoinIntent('paid')).toBe('paid')
    expect(parseJoinIntent('free')).toBeNull()
    expect(parseJoinIntent('/evil')).toBeNull()
    expect(parseJoinIntent(null)).toBeNull()
    expect(parseJoinIntent(undefined)).toBeNull()
  })

  it('points at the /account upgrade hand-off', () => {
    expect(PAID_CHECKOUT_PATH).toBe('/account?upgrade=paid')
  })
})
