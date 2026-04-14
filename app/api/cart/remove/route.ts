import { NextResponse } from 'next/server'
import { removeCartLines } from '@/lib/shopify/client'

export async function DELETE(request: Request) {
  const { cartId, lineIds } = await request.json()
  if (!cartId || !Array.isArray(lineIds)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const cart = await removeCartLines(cartId, lineIds)
  if (!cart) {
    return NextResponse.json({ error: 'Remove failed' }, { status: 502 })
  }
  return NextResponse.json(cart)
}
