import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify a Resend webhook signature.
 *
 * Resend uses Svix for webhook delivery. The signature header format is
 * `v1,base64sig v1,base64sig ...` — one or more signatures separated by
 * spaces. Each is HMAC-SHA256 of `${id}.${timestamp}.${body}` using the
 * shared secret. We accept if any one signature verifies.
 *
 * Required headers (Svix format):
 *   - svix-id
 *   - svix-timestamp
 *   - svix-signature
 *
 * Reference: https://docs.svix.com/receiving/verifying-payloads/how-manual
 */
export interface ResendWebhookHeaders {
  svixId?: string | null
  svixTimestamp?: string | null
  svixSignature?: string | null
}

const REPLAY_WINDOW_SECONDS = 5 * 60 // 5 min — Svix's recommended default

export function verifyResendSignature(args: {
  headers: ResendWebhookHeaders
  body: string
  secret: string
  now?: () => number
}): { ok: true } | { ok: false; reason: string } {
  const { headers, body, secret, now = () => Date.now() } = args
  const { svixId, svixTimestamp, svixSignature } = headers

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, reason: 'missing svix headers' }
  }

  // Replay-window check: reject obviously-old timestamps.
  const tsSeconds = Number(svixTimestamp)
  if (!Number.isFinite(tsSeconds)) {
    return { ok: false, reason: 'invalid svix-timestamp' }
  }
  const nowSeconds = Math.floor(now() / 1000)
  const drift = Math.abs(nowSeconds - tsSeconds)
  if (drift > REPLAY_WINDOW_SECONDS) {
    return { ok: false, reason: `timestamp drift ${drift}s exceeds window` }
  }

  // Svix secrets are stored as `whsec_<base64>`. Strip the prefix.
  const secretBytes = Buffer.from(
    secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret,
    'base64'
  )

  const toSign = `${svixId}.${svixTimestamp}.${body}`
  const expectedSig = createHmac('sha256', secretBytes).update(toSign).digest('base64')

  // The header may contain multiple "v1,sig" pairs — match any.
  const pairs = svixSignature.split(' ')
  for (const pair of pairs) {
    const [version, sig] = pair.split(',')
    if (version !== 'v1' || !sig) continue
    const provided = Buffer.from(sig, 'base64')
    const expected = Buffer.from(expectedSig, 'base64')
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return { ok: true }
    }
  }
  return { ok: false, reason: 'no matching signature' }
}
