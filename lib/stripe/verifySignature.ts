import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify a Stripe webhook signature.
 *
 * Stripe's signature header format (from `Stripe-Signature`):
 *   t=<unix_timestamp>,v1=<hex_sig>[,v1=<hex_sig2>,...]
 *
 * Each `v1` is HMAC-SHA256 of `${timestamp}.${body}` using the endpoint's
 * signing secret. We accept if ANY v1 matches (Stripe sometimes sends
 * multiple during rolling secret rotation).
 *
 * Reference: https://docs.stripe.com/webhooks#verify-manually
 *
 * Why a hand-rolled verifier instead of `stripe.webhooks.constructEvent`:
 *   - Pure module, no SDK dependency for security-critical code
 *   - Easier to test edge cases (stale timestamp, wrong secret, etc.)
 *   - Mirrors `lib/email/verifyResendSignature.ts` so the pattern is
 *     consistent across all our webhook intakes
 */

const REPLAY_WINDOW_SECONDS = 5 * 60 // 5 min — Stripe's default tolerance

export function verifyStripeSignature(args: {
  signatureHeader: string | null | undefined
  body: string
  secret: string
  now?: () => number
}): { ok: true } | { ok: false; reason: string } {
  const { signatureHeader, body, secret, now = () => Date.now() } = args

  if (!signatureHeader) {
    return { ok: false, reason: 'missing Stripe-Signature header' }
  }

  // Parse the header: t=...,v1=...,v1=...
  let timestamp: string | null = null
  const signatures: string[] = []
  for (const part of signatureHeader.split(',')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (key === 't') timestamp = value
    else if (key === 'v1') signatures.push(value)
  }

  if (!timestamp) return { ok: false, reason: 'missing t= in signature header' }
  if (signatures.length === 0) {
    return { ok: false, reason: 'no v1 signatures in header' }
  }

  // Replay-window check.
  const tsSeconds = Number(timestamp)
  if (!Number.isFinite(tsSeconds)) {
    return { ok: false, reason: 'invalid timestamp in signature header' }
  }
  const nowSeconds = Math.floor(now() / 1000)
  const drift = Math.abs(nowSeconds - tsSeconds)
  if (drift > REPLAY_WINDOW_SECONDS) {
    return { ok: false, reason: `timestamp drift ${drift}s exceeds window` }
  }

  // Compute expected signature.
  const signedPayload = `${timestamp}.${body}`
  const expectedHex = createHmac('sha256', secret).update(signedPayload).digest('hex')
  const expectedBuf = Buffer.from(expectedHex, 'hex')

  for (const sig of signatures) {
    let providedBuf: Buffer
    try {
      providedBuf = Buffer.from(sig, 'hex')
    } catch {
      continue
    }
    if (
      providedBuf.length === expectedBuf.length &&
      timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return { ok: true }
    }
  }
  return { ok: false, reason: 'no matching v1 signature' }
}
