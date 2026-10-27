import { describe, it, expect } from 'vitest'
import { descriptionToText } from './format'

describe('descriptionToText', () => {
  it('keeps <br><br> paragraph breaks that Shopify’s plain description drops', () => {
    const html =
      '<p><meta charset="utf-8">Featuring Peter Lord and Morph.<br><br>We also speak with Sara Pascoe.</p>'
    expect(descriptionToText(html)).toBe(
      'Featuring Peter Lord and Morph.\n\nWe also speak with Sara Pascoe.'
    )
  })

  it('splits <p> blocks and decodes entities', () => {
    expect(descriptionToText('<p>Fish &amp; chips</p><p>&pound;10&nbsp;&#8212; A4</p>')).toBe(
      'Fish & chips\n\n£10 — A4'
    )
  })

  it('returns an empty string for missing html', () => {
    expect(descriptionToText(null)).toBe('')
    expect(descriptionToText('')).toBe('')
  })
})
