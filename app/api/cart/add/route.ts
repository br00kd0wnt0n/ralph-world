import { NextResponse } from 'next/server'
import { addCartLines } from '@/lib/shopify/client'
import { verifyCartToken } from '@/lib/cart-token'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { cartId, variantId, quantity, token } = body as Record<string, unknown>
  if (
    typeof cartId !== 'string' ||
    typeof variantId !== 'string' ||
    typeof token !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Missing cartId, variantId, or token' },
      { status: 400 }
    )
  }
  if (!verifyCartToken(cartId, token)) {
    return NextResponse.json({ error: 'Invalid cart token' }, { status: 403 })
  }
  const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1
  const cart = await addCartLines(cartId, variantId, qty)
  if (!cart) {
    return NextResponse.json({ error: 'Add to cart failed' }, { status: 502 })
  }
  return NextResponse.json(cart)
}
