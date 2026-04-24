import { NextResponse } from 'next/server'
import { removeCartLines } from '@/lib/shopify/client'
import { verifyCartToken } from '@/lib/cart-token'

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { cartId, lineIds, token } = body as Record<string, unknown>
  if (
    typeof cartId !== 'string' ||
    !Array.isArray(lineIds) ||
    typeof token !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (!verifyCartToken(cartId, token)) {
    return NextResponse.json({ error: 'Invalid cart token' }, { status: 403 })
  }
  const cart = await removeCartLines(cartId, lineIds as string[])
  if (!cart) {
    return NextResponse.json({ error: 'Remove failed' }, { status: 502 })
  }
  return NextResponse.json(cart)
}
