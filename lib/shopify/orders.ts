import 'server-only'
import { shopifyAdminFetch, type FetchLike } from './admin-client'

/**
 * Shopify Admin REST helpers for order creation — Task 3.9.
 *
 * `createMagazineOrder()` posts an order against a (customer, variant)
 * pair with price = 0 and shipping pulled from the Shopify customer's
 * default address. Used by the magazine fulfilment batch job.
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

export interface CreateMagazineOrderInput {
  /** Shopify customer ID (just the numeric part, no gid:// prefix) */
  shopifyCustomerId: string
  /** Shopify variant ID for this magazine issue */
  shopifyVariantId: string
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
          price: '0.00',
          title: lineItemTitle,
          name: lineItemTitle,
        },
      ],
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
      // Use the customer's default shipping address. Shopify pulls
      // this when we don't supply `shipping_address` on the order.
      // (Default address synced in Task 2.4.)
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
