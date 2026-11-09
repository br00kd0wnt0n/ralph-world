import { describe, it, expect } from 'vitest'
import { parseJoinIntent, parseReturnPath, PAID_CHECKOUT_PATH } from './join-intent'

describe('parseReturnPath', () => {
  it('accepts magazine article paths', () => {
    expect(parseReturnPath('/magazine/dressing-and-impressing')).toBe('/magazine/dressing-and-impressing')
  })

  it('rejects anything else', () => {
    for (const bad of [
      'https://evil.com/magazine/x',
      '//evil.com',
      '/magazine',
      '/magazine/',
      '/magazine/x/y',
      '/magazine/x?y=1',
      '/magazine/-x',
      '/account',
      '/magazine/x\\evil',
      null,
      undefined,
      42,
    ]) {
      expect(parseReturnPath(bad)).toBeNull()
    }
  })
})

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
