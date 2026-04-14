import { NextResponse } from 'next/server'
import { updateCartLines } from '@/lib/shopify/client'

export async function PATCH(request: Request) {
  const { cartId, lineId, quantity } = await request.json()
  if (!cartId || !lineId || typeof quantity !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const cart = await updateCartLines(cartId, lineId, quantity)
  if (!cart) {
    return NextResponse.json({ error: 'Update failed' }, { status: 502 })
  }
  return NextResponse.json(cart)
}
