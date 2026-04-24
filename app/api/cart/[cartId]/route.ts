import { NextResponse } from 'next/server'
import { getCart } from '@/lib/shopify/client'
import { verifyCartToken } from '@/lib/cart-token'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cartId: string }> }
) {
  const { cartId } = await params
  const token = new URL(request.url).searchParams.get('token')
  if (!token || !verifyCartToken(cartId, token)) {
    return NextResponse.json({ error: 'Invalid cart token' }, { status: 403 })
  }
  const cart = await getCart(cartId)
  if (!cart) {
    return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
  }
  return NextResponse.json(cart)
}
