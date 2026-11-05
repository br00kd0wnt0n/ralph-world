import { NextResponse } from 'next/server'
import { getCheckoutUrl } from '@/lib/shopify/client'
import { verifyCartToken } from '@/lib/cart-token'

/**
 * POST /api/cart/checkout  { cartId, token, consent?: boolean }
 *
 * Returns a fresh checkoutUrl for the basket with the visitor's cookie
 * banner choice built in (Shopify's `_cs` parameter), so checkout knows
 * whether analytics/marketing pixels may fire. The basket's own
 * checkoutUrl stays as the fallback if this fails.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { cartId, token, consent } = body as Record<string, unknown>
  if (typeof cartId !== 'string' || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing cartId or token' }, { status: 400 })
  }
  if (!verifyCartToken(cartId, token)) {
    return NextResponse.json({ error: 'Invalid cart token' }, { status: 403 })
  }

  const checkoutUrl = await getCheckoutUrl(
    cartId,
    typeof consent === 'boolean' ? consent : undefined
  )
  if (!checkoutUrl) {
    return NextResponse.json({ error: 'Checkout unavailable' }, { status: 502 })
  }
  return NextResponse.json({ checkoutUrl })
}
