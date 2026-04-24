import { createHmac, timingSafeEqual } from 'node:crypto'

// HMAC-signed tokens proving the caller owns a cart id.
//
// Why not session-tied ownership? Guests shop before signing in — we
// can't force auth on cart creation without breaking the funnel. So
// instead, whoever created the cart gets a token; every subsequent
// write must present both id + token. The server never stores the
// token — it just re-derives the HMAC and compares. No DB change.
//
// Reuses AUTH_SECRET so we don't grow another env surface.

function getSecret(): string {
  const s = process.env.CART_TOKEN_SECRET ?? process.env.AUTH_SECRET
  if (!s) {
    throw new Error(
      'CART_TOKEN_SECRET or AUTH_SECRET must be set for cart tokens'
    )
  }
  return s
}

export function signCartToken(cartId: string): string {
  return createHmac('sha256', getSecret()).update(cartId).digest('hex')
}

export function verifyCartToken(cartId: string, token: string): boolean {
  if (!cartId || !token || typeof token !== 'string') return false
  let expected: string
  try {
    expected = signCartToken(cartId)
  } catch {
    return false
  }
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(token, 'hex')
  // timingSafeEqual requires equal lengths — bail early if not, without
  // revealing timing info beyond "length mismatch".
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
