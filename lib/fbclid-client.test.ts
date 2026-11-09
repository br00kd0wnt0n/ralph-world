// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  captureLandingClickId,
  persistClickIdAfterConsent,
  _resetLandingClickId,
} from './fbclid-client'

function clearCookies() {
  for (const c of document.cookie.split('; ')) {
    const name = c.split('=')[0]
    if (name) document.cookie = `${name}=; max-age=0; path=/`
  }
}

describe('fbclid after consent', () => {
  beforeEach(() => {
    _resetLandingClickId()
    clearCookies()
  })

  it('writes _fbc in Meta format once the visitor accepts', () => {
    captureLandingClickId('?utm_source=facebook&fbclid=AbC_123-x')
    persistClickIdAfterConsent()
    expect(document.cookie).toMatch(/_fbc=fb\.1\.\d{13}\.AbC_123-x/)
  })

  it('keeps the first landing click, ignoring later pages', () => {
    captureLandingClickId('?fbclid=first')
    captureLandingClickId('?fbclid=second')
    persistClickIdAfterConsent()
    expect(document.cookie).toContain('.first')
  })

  it('does nothing without an fbclid', () => {
    captureLandingClickId('?utm_source=facebook')
    persistClickIdAfterConsent()
    expect(document.cookie).not.toContain('_fbc')
  })

  it('ignores malformed ids', () => {
    captureLandingClickId('?fbclid=bad%20id%3Cscript%3E')
    persistClickIdAfterConsent()
    expect(document.cookie).not.toContain('_fbc')
  })

  it('leaves an existing _fbc for the same click alone', () => {
    document.cookie = '_fbc=fb.1.1700000000000.same; path=/'
    captureLandingClickId('?fbclid=same')
    persistClickIdAfterConsent()
    expect(document.cookie).toContain('_fbc=fb.1.1700000000000.same')
  })
})
