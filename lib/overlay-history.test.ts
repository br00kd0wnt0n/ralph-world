import { describe, expect, it } from 'vitest'
import { overlayOwner, shouldRecoverPop } from './overlay-history'

const NEXT_STATE = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: [] }

describe('overlayOwner', () => {
  it('groups a listing with its overlay URLs', () => {
    expect(overlayOwner('/magazine')).toBe('magazine')
    expect(overlayOwner('/magazine/some-slug')).toBe('magazine')
    expect(overlayOwner('/magazine/some-slug/')).toBe('magazine')
    expect(overlayOwner('/shop/tee')).toBe('shop')
    expect(overlayOwner('/events/launch')).toBe('events')
  })

  it('ignores other pages and deeper paths', () => {
    expect(overlayOwner('/')).toBeNull()
    expect(overlayOwner('/tv')).toBeNull()
    expect(overlayOwner('/magazine/a/b')).toBeNull()
    expect(overlayOwner('/magazines')).toBeNull()
  })
})

describe('shouldRecoverPop', () => {
  it('recovers a null-state overlay entry reached from another page', () => {
    // The reported bug: /magazine/<slug> → Esc → Shop link → Back.
    expect(shouldRecoverPop(null, '/magazine', '/shop')).toBe(true)
    expect(shouldRecoverPop(null, '/magazine/slug', '/shop')).toBe(true)
    expect(shouldRecoverPop(null, '/events/launch', '/lab')).toBe(true)
    expect(shouldRecoverPop(null, '/shop', '/')).toBe(true)
  })

  it('leaves entries Next handles to Next', () => {
    expect(shouldRecoverPop(NEXT_STATE, '/magazine', '/shop')).toBe(false)
  })

  it('leaves overlay Back/Forward within the same page to the overlay', () => {
    expect(shouldRecoverPop(null, '/magazine', '/magazine')).toBe(false)
    expect(shouldRecoverPop(null, '/magazine/slug', '/magazine')).toBe(false)
    // Direct load of /magazine/<slug>: Next still reports the slug path.
    expect(shouldRecoverPop(null, '/magazine', '/magazine/slug')).toBe(false)
    expect(shouldRecoverPop(null, '/shop', '/shop/tee')).toBe(false)
    expect(shouldRecoverPop(null, '/events/a', '/events')).toBe(false)
  })

  it('ignores #hash entries on the same page', () => {
    expect(shouldRecoverPop(null, '/tv', '/tv')).toBe(false)
    expect(shouldRecoverPop(null, '/tv/', '/tv')).toBe(false)
  })
})
