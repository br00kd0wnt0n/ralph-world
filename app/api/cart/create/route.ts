import { NextResponse } from 'next/server'
import { createCart } from '@/lib/shopify/client'
import { isShopifyConfigured } from '@/lib/shopify/mock'

export async function POST(request: Request) {
  if (!isShopifyConfigured()) {
    return NextResponse.json(
      {
        error: 'demo_mode',
        message:
          'Shop is in demo mode. Connect Shopify to enable checkout.',
      },
      { status: 503 }
    )
  }
  const { variantId } = await request.json().catch(() => ({}))
  const cart = await createCart(variantId)
  if (!cart) {
    return NextResponse.json({ error: 'Cart creation failed' }, { status: 502 })
  }
  return NextResponse.json(cart)
}
