import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify a Shopify webhook HMAC.
 *
 * Shopify signs every webhook with HMAC-SHA256 of the raw request body
 * keyed by the app's shared secret. The signature lands in the
 * `X-Shopify-Hmac-Sha256` header as base64.
 *
 * Reference: https://shopify.dev/docs/apps/webhooks/configuration/https
 *
 * Same shape as `lib/email/verifyResendSignature.ts` and
 * `lib/stripe/verifySignature.ts` — pure, testable, no SDK dependency.
 */
export function verifyShopifyHmac(args: {
  hmacHeader: string | null | undefined
  body: string
  secret: string
}): { ok: true } | { ok: false; reason: string } {
  const { hmacHeader, body, secret } = args
  if (!hmacHeader) {
    return { ok: false, reason: 'missing X-Shopify-Hmac-Sha256 header' }
  }
  const computed = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  const expected = Buffer.from(computed, 'utf8')
  const provided = Buffer.from(hmacHeader, 'utf8')
  if (expected.length !== provided.length) {
    return { ok: false, reason: 'signature length mismatch' }
  }
  if (timingSafeEqual(expected, provided)) {
    return { ok: true }
  }
  return { ok: false, reason: 'signature did not verify' }
}
