import { NextResponse } from 'next/server'
import { getCart } from '@/lib/shopify/client'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cartId: string }> }
) {
  const { cartId } = await params
  const cart = await getCart(cartId)
  if (!cart) {
    return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
  }
  return NextResponse.json(cart)
}
