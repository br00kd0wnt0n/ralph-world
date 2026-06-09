import { describe, it, expect } from 'vitest'
import {
  canAccess,
  isPremiumContent,
  tvPreviewSeconds,
  tierFromSession,
  DEFAULT_TV_PREVIEW_SECONDS,
  type AccessTier,
  type UserTier,
} from './entitlements'

// Full access matrix per §8 — 3 user tiers × 4 content tiers = 12 cases.
// Rows = content access_tier, columns = user tier.
const MATRIX: Record<AccessTier, Record<UserTier, boolean>> = {
  everyone:         { guest: true,  free: true,  paid: true  },
  premium:          { guest: true,  free: true,  paid: true  },
  members:          { guest: false, free: true,  paid: true  },
  paid_subscribers: { guest: false, free: false, paid: true  },
}

describe('canAccess — full 9-way matrix', () => {
  for (const accessTier of Object.keys(MATRIX) as AccessTier[]) {
    for (const tier of Object.keys(MATRIX[accessTier]) as UserTier[]) {
      const expected = MATRIX[accessTier][tier]
      it(`${tier} user ${expected ? 'CAN' : 'cannot'} access ${accessTier} content`, () => {
        const user = tier === 'guest' ? null : { tier }
        expect(canAccess(user, { accessTier })).toBe(expected)
      })
    }
  }
})

describe('canAccess — guest representation', () => {
  it('treats null user as guest', () => {
    expect(canAccess(null, { accessTier: 'members' })).toBe(false)
    expect(canAccess(null, { accessTier: 'everyone' })).toBe(true)
  })

  it('treats undefined user as guest', () => {
    expect(canAccess(undefined, { accessTier: 'paid_subscribers' })).toBe(false)
  })

  it('treats explicit guest tier same as null', () => {
    expect(canAccess({ tier: 'guest' }, { accessTier: 'members' })).toBe(false)
  })
})

describe('canAccess — unknown access tier denies', () => {
  it('returns false for an unrecognised access tier', () => {
    // Simulates a future/typo tier slipping through at runtime.
    expect(
      canAccess({ tier: 'paid' }, { accessTier: 'vip' as AccessTier })
    ).toBe(false)
  })
})

describe('isPremiumContent', () => {
  it('returns true only for premium tier', () => {
    expect(isPremiumContent('premium')).toBe(true)
    expect(isPremiumContent('everyone')).toBe(false)
    expect(isPremiumContent('members')).toBe(false)
    expect(isPremiumContent('paid_subscribers')).toBe(false)
  })
})

describe('tvPreviewSeconds', () => {
  it('guests get the default countdown window', () => {
    expect(tvPreviewSeconds(null)).toBe(DEFAULT_TV_PREVIEW_SECONDS)
    expect(tvPreviewSeconds(undefined)).toBe(600)
  })

  it('free users get unlimited (null)', () => {
    expect(tvPreviewSeconds({ tier: 'free' })).toBeNull()
  })

  it('paid users get unlimited (null)', () => {
    expect(tvPreviewSeconds({ tier: 'paid' })).toBeNull()
  })

  it('respects a configured preview window for guests', () => {
    expect(tvPreviewSeconds(null, 300)).toBe(300)
  })

  it('configured window does not affect signed-in users', () => {
    expect(tvPreviewSeconds({ tier: 'free' }, 300)).toBeNull()
  })
})

describe('tierFromSession', () => {
  it('no session → guest', () => {
    expect(tierFromSession(null)).toBe('guest')
    expect(tierFromSession(undefined)).toBe('guest')
  })

  it('session without user → guest', () => {
    expect(tierFromSession({ profile: { subscriptionStatus: 'paid' } })).toBe('guest')
  })

  it('signed-in with paid subscription → paid', () => {
    expect(
      tierFromSession({ user: { id: 'u1' }, profile: { subscriptionStatus: 'paid' } })
    ).toBe('paid')
  })

  it('signed-in with free subscription → free', () => {
    expect(
      tierFromSession({ user: { id: 'u1' }, profile: { subscriptionStatus: 'free' } })
    ).toBe('free')
  })

  it('signed-in with null/absent subscription → free', () => {
    expect(tierFromSession({ user: { id: 'u1' }, profile: { subscriptionStatus: null } })).toBe('free')
    expect(tierFromSession({ user: { id: 'u1' } })).toBe('free')
    expect(tierFromSession({ user: { id: 'u1' }, profile: null })).toBe('free')
  })
})

describe('tierFromSession → canAccess integration', () => {
  it('paid session can read paid_subscribers content', () => {
    const tier = tierFromSession({ user: { id: 'u1' }, profile: { subscriptionStatus: 'paid' } })
    expect(canAccess({ tier }, { accessTier: 'paid_subscribers' })).toBe(true)
  })

  it('free session cannot read paid_subscribers content', () => {
    const tier = tierFromSession({ user: { id: 'u1' }, profile: { subscriptionStatus: 'free' } })
    expect(canAccess({ tier }, { accessTier: 'paid_subscribers' })).toBe(false)
  })

  it('guest session can read everyone content', () => {
    const tier = tierFromSession(null)
    expect(canAccess({ tier }, { accessTier: 'everyone' })).toBe(true)
  })
})
