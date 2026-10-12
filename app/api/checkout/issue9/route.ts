import { NextResponse } from 'next/server'
import { createCheckoutUrl } from '@/lib/shopify/client'
import { isShopifyConfigured } from '@/lib/shopify/mock'
import { getIssue9Product } from '@/lib/data/issue9'
import { getIssue9Mode } from '@/lib/issue9'
import { pickAttribution } from '@/lib/attribution'

/**
 * POST /api/checkout/issue9  { attribution?: { utm_source, … } }
 *
 * Buy button on /issue9. Builds a fresh one-line Shopify cart for Issue 9
 * (the shopper's main cart is left alone) and returns its checkoutUrl.
 *
 * The product, variant and pre-order flag are all decided here, never taken
 * from the client. Cart attributes land on the Shopify order as "Additional
 * details": `landing`, `preorder` (before launch) and any utm_* tags.
 */
export async function POST(request: Request) {
  if (!isShopifyConfigured()) {
    return NextResponse.json(
      {
        error: 'demo_mode',
        message: 'Shop is in demo mode. Connect Shopify to enable checkout.',
      },
      { status: 503 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as { attribution?: unknown }
  const attribution = pickAttribution(
    body.attribution && typeof body.attribution === 'object'
      ? (body.attribution as Record<string, unknown>)
      : null
  )

  const product = await getIssue9Product()
  const variant = product?.variants.edges[0]?.node
  if (!product || !variant) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (!product.availableForSale || !variant.availableForSale) {
    return NextResponse.json({ error: 'unavailable' }, { status: 409 })
  }

  const attributes: Record<string, string> = { landing: 'issue9', ...attribution }
  if (getIssue9Mode() === 'preorder') attributes.preorder = 'true'

  const checkoutUrl = await createCheckoutUrl(variant.id, attributes)
  if (!checkoutUrl) {
    return NextResponse.json({ error: 'Checkout creation failed' }, { status: 502 })
  }
  return NextResponse.json({ checkoutUrl })
}
