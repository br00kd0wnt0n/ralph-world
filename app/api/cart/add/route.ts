import { NextResponse } from 'next/server'
import { addCartLines } from '@/lib/shopify/client'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { cartId, variantId, quantity } = body as Record<string, unknown>
  if (typeof cartId !== 'string' || typeof variantId !== 'string') {
    return NextResponse.json(
      { error: 'Missing cartId or variantId' },
      { status: 400 }
    )
  }
  const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1
  const cart = await addCartLines(cartId, variantId, qty)
  if (!cart) {
    return NextResponse.json({ error: 'Add to cart failed' }, { status: 502 })
  }
  return NextResponse.json(cart)
}
