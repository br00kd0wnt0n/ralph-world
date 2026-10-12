import { describe, expect, it } from 'vitest'
import { pickAttribution, withAttribution } from './attribution'

describe('pickAttribution', () => {
  it('keeps only known utm keys', () => {
    const sp = new URLSearchParams('utm_source=instagram&utm_medium=social&foo=bar&joined=1')
    expect(pickAttribution(sp)).toEqual({ utm_source: 'instagram', utm_medium: 'social' })
  })

  it('reads plain objects and drops non-strings / blanks', () => {
    expect(
      pickAttribution({ utm_source: ' linkedin ', utm_campaign: '', utm_term: 42 })
    ).toEqual({ utm_source: 'linkedin' })
  })

  it('caps length and strips control characters', () => {
    const out = pickAttribution({ utm_source: `a\nb${'x'.repeat(200)}` })
    expect(out.utm_source).toHaveLength(100)
    expect(out.utm_source?.startsWith('ab')).toBe(true)
  })

  it('handles null input', () => {
    expect(pickAttribution(null)).toEqual({})
  })
})

describe('withAttribution', () => {
  it('appends to an existing query', () => {
    expect(withAttribution('/issue9?joined=1', { utm_source: 'instagram' })).toBe(
      '/issue9?joined=1&utm_source=instagram'
    )
  })

  it('leaves the path alone when there is nothing to add', () => {
    expect(withAttribution('/issue9', {})).toBe('/issue9')
  })
})
