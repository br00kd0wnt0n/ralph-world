import { NextResponse } from 'next/server'
import { createCart } from '@/lib/shopify/client'

export async function POST(request: Request) {
  const { variantId } = await request.json().catch(() => ({}))
  const cart = await createCart(variantId)
  if (!cart) {
    return NextResponse.json({ error: 'Cart creation failed' }, { status: 502 })
  }
  return NextResponse.json(cart)
}
