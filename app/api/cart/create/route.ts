import { NextResponse } from 'next/server'
import { createCart } from '@/lib/shopify/client'
import { isShopifyConfigured } from '@/lib/shopify/mock'
import { signCartToken } from '@/lib/cart-token'

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
  const body = await request.json().catch(() => ({}))
  const variantId =
    typeof (body as { variantId?: unknown }).variantId === 'string'
      ? (body as { variantId: string }).variantId
      : undefined
  const cart = await createCart(variantId)
  if (!cart) {
    return NextResponse.json({ error: 'Cart creation failed' }, { status: 502 })
  }
  // Attach an HMAC token so subsequent writes can prove ownership of
  // this cart id. Client stores both in localStorage.
  return NextResponse.json({ ...cart, token: signCartToken(cart.id) })
}
