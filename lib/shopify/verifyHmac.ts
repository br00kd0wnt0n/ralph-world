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
  // Decode both sides to the raw 32-byte SHA-256 digest and timingSafeEqual
  // those (mirrors the Stripe/Resend verifiers). Comparing base64 *text* as
  // UTF-8 bytes — as the old code did — both leaks length via the early
  // return and mishandles malformed headers. HMAC-SHA256 is always 32 bytes,
  // so a length mismatch just means the signature is wrong; report it the
  // same way as a content mismatch so nothing is leaked.
  const computed = createHmac('sha256', secret).update(body, 'utf8').digest() // 32-byte Buffer
  const provided = Buffer.from(hmacHeader, 'base64')
  if (provided.length !== computed.length) {
    return { ok: false, reason: 'signature did not verify' }
  }
  if (timingSafeEqual(computed, provided)) {
    return { ok: true }
  }
  return { ok: false, reason: 'signature did not verify' }
}
