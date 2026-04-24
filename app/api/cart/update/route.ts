import { NextResponse } from 'next/server'
import { updateCartLines } from '@/lib/shopify/client'
import { verifyCartToken } from '@/lib/cart-token'

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { cartId, lineId, quantity, token } = body as Record<string, unknown>
  if (
    typeof cartId !== 'string' ||
    typeof lineId !== 'string' ||
    typeof quantity !== 'number' ||
    typeof token !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (!verifyCartToken(cartId, token)) {
    return NextResponse.json({ error: 'Invalid cart token' }, { status: 403 })
  }
  const cart = await updateCartLines(cartId, lineId, quantity)
  if (!cart) {
    return NextResponse.json({ error: 'Update failed' }, { status: 502 })
  }
  return NextResponse.json(cart)
}
