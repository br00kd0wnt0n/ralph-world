import 'server-only'
import { shopifyAdminFetch, ShopifyAdminError, type FetchLike } from './admin-client'
import type { ShopifyOrderShippingAddress } from './customer'

/**
 * Shopify Admin REST helpers for order creation — Task 3.9.
 *
 * `resolveIssueVariant()` turns whatever ID an editor pasted into the CMS
 * (product ID from the admin URL, or a variant ID) into a verified variant
 * with a non-empty SKU. Newsstand identifies the issue by the EAN in the
 * SKU, so an order without one is unfulfillable — better to refuse the run
 * than to create orders Newsstand can't act on.
 *
 * `createMagazineOrder()` posts an order against a (customer, variant)
 * pair with price = 0 and an explicit shipping address.
 *
 * The caller is responsible for IDEMPOTENCY: this function does not
 * check whether an order already exists. The DB-side
 * `magazine_shipments_user_issue_unique` index is the safety net —
 * insert the queued shipment row BEFORE calling this, and only call
 * this once per fresh queued row.
 *
 * If Shopify rejects the order, the caller should mark the shipment
 * row 'failed' so retries are explicit.
 */

/**
 * Strip a Shopify global ID prefix to leave just the numeric id, since
 * the REST API expects the numeric form in path parameters but editors
 * may paste either form in the CMS. Tolerates both `gid://shopify/X/123`
 * and `123` inputs.
 */
function bareNumericId(id: string): string {
  const m = id.match(/(\d+)\s*$/)
  return m ? m[1] : id
}

// ── Variant resolution ───────────────────────────────────────────────

export interface ResolvedVariant {
  variantId: string
  productId: string
  productTitle: string
  sku: string
  price: string
  /** Which lookup succeeded — surfaced to the CMS so the editor knows. */
  resolvedFrom: 'variant' | 'product'
}

interface ShopifyVariantGetResponse {
  variant?: {
    id: number | string
    product_id: number | string
    sku?: string | null
    price?: string
    title?: string
  }
}

interface ShopifyProductGetResponse {
  product?: {
    id: number | string
    title?: string
    variants?: Array<{
      id: number | string
      sku?: string | null
      price?: string
      title?: string
    }>
  }
}

interface ShopifyProductTitleResponse {
  product?: { title?: string }
}

function isNotFound(err: unknown): boolean {
  return err instanceof ShopifyAdminError && err.status === 404
}

/**
 * Resolve the ID stored on a magazine issue to a concrete, SKU-bearing
 * variant. Accepts either a variant ID or a product ID (the number in
 * the Shopify admin URL, which is what editors naturally copy).
 *
 * Throws with an editor-readable message when:
 *   - neither a variant nor a product exists with that ID
 *   - the product has more than one variant (ambiguous — use the variant ID)
 *   - the resolved variant has an empty SKU (no EAN → Newsstand can't fulfil)
 */
export async function resolveIssueVariant(args: {
  id: string
  fetchImpl?: FetchLike
}): Promise<ResolvedVariant> {
  const id = bareNumericId(args.id)

  // 1. Try as a variant.
  let asVariant: ShopifyVariantGetResponse['variant'] | undefined
  try {
    const res = await shopifyAdminFetch<ShopifyVariantGetResponse>({
      method: 'GET',
      path: `/variants/${encodeURIComponent(id)}.json`,
      fetchImpl: args.fetchImpl,
      maxRetries: 1,
    })
    asVariant = res.variant
  } catch (err) {
    if (!isNotFound(err)) throw err
  }

  if (asVariant) {
    const sku = (asVariant.sku ?? '').trim()
    if (!sku) {
      throw new Error(
        `Shopify variant ${id} has an empty SKU. Newsstand needs the issue EAN in the SKU field — set it in Shopify before fulfilling.`
      )
    }
    let productTitle = ''
    try {
      const p = await shopifyAdminFetch<ShopifyProductTitleResponse>({
        method: 'GET',
        path: `/products/${encodeURIComponent(String(asVariant.product_id))}.json`,
        query: { fields: 'title' },
        fetchImpl: args.fetchImpl,
        maxRetries: 1,
      })
      productTitle = p.product?.title ?? ''
    } catch {
      // Title is cosmetic — don't fail the run over it.
    }
    return {
      variantId: String(asVariant.id),
      productId: String(asVariant.product_id),
      productTitle,
      sku,
      price: asVariant.price ?? '',
      resolvedFrom: 'variant',
    }
  }

  // 2. Fall back to treating it as a product ID.
  let product: ShopifyProductGetResponse['product'] | undefined
  try {
    const res = await shopifyAdminFetch<ShopifyProductGetResponse>({
      method: 'GET',
      path: `/products/${encodeURIComponent(id)}.json`,
      query: { fields: 'id,title,variants' },
      fetchImpl: args.fetchImpl,
      maxRetries: 1,
    })
    product = res.product
  } catch (err) {
    if (!isNotFound(err)) throw err
  }

  if (!product) {
    throw new Error(
      `Shopify has no variant or product with ID ${id}. Check the issue's Shopify ID — copy it from the product's admin URL.`
    )
  }
  const variants = product.variants ?? []
  if (variants.length === 0) {
    throw new Error(`Shopify product ${id} ("${product.title ?? ''}") has no variants.`)
  }
  if (variants.length > 1) {
    throw new Error(
      `Shopify product ${id} ("${product.title ?? ''}") has ${variants.length} variants. Magazine issues must be single-variant products, or store the specific variant ID on the issue.`
    )
  }
  const v = variants[0]
  const sku = (v.sku ?? '').trim()
  if (!sku) {
    throw new Error(
      `Shopify product ${id} ("${product.title ?? ''}") has an empty SKU. Newsstand needs the issue EAN in the SKU field — set it in Shopify before fulfilling.`
    )
  }
  return {
    variantId: String(v.id),
    productId: String(product.id),
    productTitle: product.title ?? '',
    sku,
    price: v.price ?? '',
    resolvedFrom: 'product',
  }
}

// ── Order creation ───────────────────────────────────────────────────

export interface CreateMagazineOrderInput {
  /** Shopify customer ID (just the numeric part, no gid:// prefix) */
  shopifyCustomerId: string
  /** VERIFIED Shopify variant ID — from resolveIssueVariant(), not the raw CMS value */
  shopifyVariantId: string
  /**
   * Shipping address, explicit. Shopify does not copy the customer's
   * default address onto API-created orders, so omitting this produces
   * an order Newsstand cannot ship.
   */
  shippingAddress: ShopifyOrderShippingAddress
  /** Issue number — used in the order note */
  issueNumber: number
  /** Internal shipment id — written to order note for cross-reference */
  shipmentId: string
  /** Inject fetch for tests */
  fetchImpl?: FetchLike
}

export interface CreateMagazineOrderResult {
  shopifyOrderId: string
}

interface ShopifyOrderCreateResponse {
  order?: {
    id?: number | string
    name?: string
  }
  errors?: unknown
}

export async function createMagazineOrder(
  input: CreateMagazineOrderInput
): Promise<CreateMagazineOrderResult> {
  const customerId = bareNumericId(input.shopifyCustomerId)
  const variantId = bareNumericId(input.shopifyVariantId)

  // Title sent explicitly so the order POST works even when our access
  // token only has write_orders (no read_products). Without title/name
  // here, Shopify tries to auto-fill them from the variant lookup; if
  // the lookup is refused for scope reasons it bounces with
  // "Line items is invalid: Name can't be blank, Title can't be blank".
  // variant_id is still sent so inventory + SKU stay linked for the
  // fulfilment partner.
  const lineItemTitle = `Ralph Magazine — Issue ${input.issueNumber}`

  const body = {
    order: {
      customer: { id: Number(customerId) },
      line_items: [
        {
          variant_id: Number(variantId),
          quantity: 1,
          // Price 0 — the subscriber has already paid via Stripe; this
          // order exists purely to drive Shopify's fulfilment pipeline.
          // Newsstand substitutes the cover price for customs on £0 lines.
          price: '0.00',
          title: lineItemTitle,
          name: lineItemTitle,
        },
      ],
      shipping_address: input.shippingAddress,
      // Mark as paid so Shopify doesn't try to charge the customer.
      financial_status: 'paid',
      // Respect inventory policy (oversell = false). If Newsstand
      // marks the variant as out of stock, this throws — the batch
      // job will record 'failed' and an admin can adjust stock and
      // retry.
      inventory_behaviour: 'decrement_obeying_policy',
      // No email — subscribers get the magazine-shipped Resend
      // template when the fulfillment webhook fires, not when the
      // order is created.
      send_receipt: false,
      send_fulfillment_receipt: false,
      // Tag so the Shopify admin UI can filter to subscriber orders.
      tags: 'subscription, magazine-fulfilment',
      note: `Ralph subscription fulfilment — issue ${input.issueNumber} — shipment ${input.shipmentId}`,
    },
  }

  const res = await shopifyAdminFetch<ShopifyOrderCreateResponse>({
    method: 'POST',
    path: '/orders.json',
    body,
    fetchImpl: input.fetchImpl,
    // Order creation is not safe to blindly retry — a 5xx might still
    // have created the order. Cap retries at 1; on failure, surface
    // to the batch job so it records 'failed' explicitly.
    maxRetries: 1,
  })

  if (!res.order?.id) {
    throw new Error('Shopify POST /orders.json returned no order id')
  }
  return { shopifyOrderId: String(res.order.id) }
}
