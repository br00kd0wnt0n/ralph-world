import { describe, it, expect } from 'vitest'
import { createHmac, randomBytes } from 'node:crypto'
import { verifyShopifyHmac } from './verifyHmac'

function signFixture(opts?: { body?: string; secret?: string }) {
  const body = opts?.body ?? JSON.stringify({ id: 1234, type: 'customers/update' })
  const secret = opts?.secret ?? `shopify_${randomBytes(16).toString('hex')}`
  const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  return { body, secret, hmacHeader: hmac }
}

describe('verifyShopifyHmac', () => {
  it('accepts a freshly-signed body', () => {
    const f = signFixture()
    expect(
      verifyShopifyHmac({ hmacHeader: f.hmacHeader, body: f.body, secret: f.secret })
    ).toEqual({ ok: true })
  })

  it('rejects when the body has been tampered with', () => {
    const f = signFixture()
    expect(
      verifyShopifyHmac({
        hmacHeader: f.hmacHeader,
        body: f.body + ' tampered',
        secret: f.secret,
      }).ok
    ).toBe(false)
  })

  it('rejects when the secret is wrong', () => {
    const f = signFixture()
    expect(
      verifyShopifyHmac({
        hmacHeader: f.hmacHeader,
        body: f.body,
        secret: 'wrong-secret',
      }).ok
    ).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(
      verifyShopifyHmac({
        hmacHeader: null,
        body: '{}',
        secret: 'anything',
      })
    ).toEqual({ ok: false, reason: 'missing X-Shopify-Hmac-Sha256 header' })
  })

  it('rejects a length-mismatched header (timing-safe-compare guard)', () => {
    expect(
      verifyShopifyHmac({
        hmacHeader: 'too-short',
        body: '{}',
        secret: 'anything',
      }).ok
    ).toBe(false)
  })
})
