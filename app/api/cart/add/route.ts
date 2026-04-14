import { NextResponse } from 'next/server'
import { addCartLines } from '@/lib/shopify/client'

export async function POST(request: Request) {
  const { cartId, variantId, quantity = 1 } = await request.json()
  if (!cartId || !variantId) {
    return NextResponse.json({ error: 'Missing cartId or variantId' }, { status: 400 })
  }
  const cart = await addCartLines(cartId, variantId, quantity)
  if (!cart) {
    return NextResponse.json({ error: 'Add to cart failed' }, { status: 502 })
  }
  return NextResponse.json(cart)
}
