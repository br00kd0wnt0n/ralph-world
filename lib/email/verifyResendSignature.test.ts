import { describe, it, expect } from 'vitest'
import { createHmac, randomBytes } from 'node:crypto'
import { verifyResendSignature } from './verifyResendSignature'

/**
 * Generate a valid (id, timestamp, body, signature) tuple against a
 * known secret so each test starts from a working baseline and mutates
 * one thing.
 */
function signFixture(opts?: { id?: string; timestamp?: number; body?: string }) {
  const id = opts?.id ?? `msg_${randomBytes(8).toString('hex')}`
  const timestamp = String(opts?.timestamp ?? Math.floor(Date.now() / 1000))
  const body = opts?.body ?? JSON.stringify({ type: 'email.delivered', data: { email_id: 'eid' } })
  const secretRaw = randomBytes(32)
  const secret = `whsec_${secretRaw.toString('base64')}`
  const toSign = `${id}.${timestamp}.${body}`
  const sig = createHmac('sha256', secretRaw).update(toSign).digest('base64')
  return { id, timestamp, body, secret, signatureHeader: `v1,${sig}` }
}

describe('verifyResendSignature', () => {
  it('accepts a freshly-signed payload', () => {
    const f = signFixture()
    const result = verifyResendSignature({
      headers: {
        svixId: f.id,
        svixTimestamp: f.timestamp,
        svixSignature: f.signatureHeader,
      },
      body: f.body,
      secret: f.secret,
    })
    expect(result).toEqual({ ok: true })
  })

  it('accepts a signature secret without the whsec_ prefix', () => {
    const f = signFixture()
    const stripped = f.secret.replace(/^whsec_/, '')
    const result = verifyResendSignature({
      headers: { svixId: f.id, svixTimestamp: f.timestamp, svixSignature: f.signatureHeader },
      body: f.body,
      secret: stripped,
    })
    expect(result).toEqual({ ok: true })
  })

  it('accepts when one of multiple signatures matches', () => {
    const f = signFixture()
    const result = verifyResendSignature({
      headers: {
        svixId: f.id,
        svixTimestamp: f.timestamp,
        svixSignature: `v1,${'A'.repeat(44)} ${f.signatureHeader}`,
      },
      body: f.body,
      secret: f.secret,
    })
    expect(result).toEqual({ ok: true })
  })

  it('rejects when the body has been tampered with', () => {
    const f = signFixture()
    const result = verifyResendSignature({
      headers: { svixId: f.id, svixTimestamp: f.timestamp, svixSignature: f.signatureHeader },
      body: f.body + ' tampered',
      secret: f.secret,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects when the secret is wrong', () => {
    const f = signFixture()
    const wrongSecret = `whsec_${randomBytes(32).toString('base64')}`
    const result = verifyResendSignature({
      headers: { svixId: f.id, svixTimestamp: f.timestamp, svixSignature: f.signatureHeader },
      body: f.body,
      secret: wrongSecret,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects missing headers', () => {
    expect(
      verifyResendSignature({
        headers: { svixId: null, svixTimestamp: '1700000000', svixSignature: 'v1,xxx' },
        body: '{}',
        secret: 'whsec_AA==',
      })
    ).toEqual({ ok: false, reason: 'missing svix headers' })
  })

  it('rejects an unparseable timestamp', () => {
    const f = signFixture()
    const result = verifyResendSignature({
      headers: { svixId: f.id, svixTimestamp: 'not-a-number', svixSignature: f.signatureHeader },
      body: f.body,
      secret: f.secret,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a stale timestamp (outside the 5-minute replay window)', () => {
    const stale = Math.floor(Date.now() / 1000) - 60 * 60 // 1h old
    const f = signFixture({ timestamp: stale })
    const result = verifyResendSignature({
      headers: { svixId: f.id, svixTimestamp: f.timestamp, svixSignature: f.signatureHeader },
      body: f.body,
      secret: f.secret,
    })
    expect(result.ok).toBe(false)
  })

  it('uses the injected now() so replay window is deterministic', () => {
    const fixedNow = 1_700_000_000_000
    const ts = Math.floor(fixedNow / 1000)
    const f = signFixture({ timestamp: ts })
    const result = verifyResendSignature({
      headers: { svixId: f.id, svixTimestamp: f.timestamp, svixSignature: f.signatureHeader },
      body: f.body,
      secret: f.secret,
      now: () => fixedNow,
    })
    expect(result).toEqual({ ok: true })
  })

  it('rejects when the signature header has no v1 entries', () => {
    const f = signFixture()
    const result = verifyResendSignature({
      headers: { svixId: f.id, svixTimestamp: f.timestamp, svixSignature: 'v2,abc' },
      body: f.body,
      secret: f.secret,
    })
    expect(result.ok).toBe(false)
  })
})
