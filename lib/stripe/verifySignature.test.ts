import { describe, it, expect } from 'vitest'
import { createHmac, randomBytes } from 'node:crypto'
import { verifyStripeSignature } from './verifySignature'

/**
 * Generate a fresh Stripe-signed payload. Mirrors Stripe's actual format
 * so each test starts from a known-valid baseline and mutates ONE thing.
 */
function signFixture(opts?: { timestamp?: number; body?: string; secret?: string }) {
  const timestamp = String(opts?.timestamp ?? Math.floor(Date.now() / 1000))
  const body =
    opts?.body ?? JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' })
  const secret = opts?.secret ?? `whsec_${randomBytes(16).toString('hex')}`
  const sig = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')
  return { timestamp, body, secret, signatureHeader: `t=${timestamp},v1=${sig}` }
}

describe('verifyStripeSignature', () => {
  it('accepts a freshly-signed payload', () => {
    const f = signFixture()
    expect(
      verifyStripeSignature({
        signatureHeader: f.signatureHeader,
        body: f.body,
        secret: f.secret,
      })
    ).toEqual({ ok: true })
  })

  it('accepts when one of multiple v1 signatures matches (rotation)', () => {
    const f = signFixture()
    const badSig = 'a'.repeat(64) // 32 bytes hex = 64 chars
    expect(
      verifyStripeSignature({
        signatureHeader: `t=${f.timestamp},v1=${badSig},v1=${f.signatureHeader.split('v1=')[1]}`,
        body: f.body,
        secret: f.secret,
      })
    ).toEqual({ ok: true })
  })

  it('rejects when the body has been tampered with', () => {
    const f = signFixture()
    const result = verifyStripeSignature({
      signatureHeader: f.signatureHeader,
      body: f.body + ' tampered',
      secret: f.secret,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects when the secret is wrong', () => {
    const f = signFixture()
    const result = verifyStripeSignature({
      signatureHeader: f.signatureHeader,
      body: f.body,
      secret: 'whsec_wrong_secret',
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a missing signature header', () => {
    expect(
      verifyStripeSignature({
        signatureHeader: null,
        body: '{}',
        secret: 'whsec_anything',
      })
    ).toEqual({ ok: false, reason: 'missing Stripe-Signature header' })
  })

  it('rejects a malformed header with no t=', () => {
    expect(
      verifyStripeSignature({
        signatureHeader: 'v1=abc',
        body: '{}',
        secret: 'whsec_anything',
      }).ok
    ).toBe(false)
  })

  it('rejects a header with no v1 signatures', () => {
    expect(
      verifyStripeSignature({
        signatureHeader: 't=1700000000,v0=deadbeef',
        body: '{}',
        secret: 'whsec_anything',
      }).ok
    ).toBe(false)
  })

  it('rejects an unparseable timestamp', () => {
    const f = signFixture()
    const result = verifyStripeSignature({
      signatureHeader: `t=not-a-number,v1=${f.signatureHeader.split('v1=')[1]}`,
      body: f.body,
      secret: f.secret,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a stale timestamp (outside the 5-minute replay window)', () => {
    const stale = Math.floor(Date.now() / 1000) - 60 * 60
    const f = signFixture({ timestamp: stale })
    const result = verifyStripeSignature({
      signatureHeader: f.signatureHeader,
      body: f.body,
      secret: f.secret,
    })
    expect(result.ok).toBe(false)
  })

  it('uses the injected now() so replay window is deterministic', () => {
    const fixedNow = 1_700_000_000_000
    const ts = Math.floor(fixedNow / 1000)
    const f = signFixture({ timestamp: ts })
    const result = verifyStripeSignature({
      signatureHeader: f.signatureHeader,
      body: f.body,
      secret: f.secret,
      now: () => fixedNow,
    })
    expect(result).toEqual({ ok: true })
  })

  it('rejects when v1 signature is not valid hex', () => {
    const f = signFixture()
    const result = verifyStripeSignature({
      signatureHeader: `t=${f.timestamp},v1=ZZZZ-not-hex`,
      body: f.body,
      secret: f.secret,
    })
    expect(result.ok).toBe(false)
  })
})
