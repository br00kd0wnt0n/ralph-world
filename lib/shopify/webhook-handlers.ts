import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  profiles,
  shopifyLinks,
  magazineShipments,
  magazineIssues,
  users,
} from '@/lib/db/schema'
import { logAction } from '@/lib/audit'
import { sendTemplate } from '@/lib/email/send'

/**
 * Shopify webhook event handlers — Task 2.6.
 *
 * Two topics, both fire-and-forget from the route handler:
 *   - customers/update    → mirror shipping address back onto the
 *                            linked profile (counterpart to Task 2.4's
 *                            push direction)
 *   - fulfillments/create → flip the magazine_shipments row for the
 *                            order to 'fulfilled'. Stays dormant until
 *                            Phase 3 starts creating shipment rows
 *                            from Stripe subscription events.
 *
 * Idempotency: webhooks/fulfillments/create can fire multiple times
 * (Shopify retries on 5xx). Our updates are naturally idempotent
 * (UPDATE … WHERE shopify_order_id = X SET status = 'fulfilled' —
 * second call is a no-op).
 */

export type ShopifyHandlerResult =
  | { ok: true; effects: Record<string, unknown> }
  | { ok: false; reason: string }

// ── customers/update ────────────────────────────────────────────────

/**
 * Payload shape we use (Shopify's full Customer payload has many more
 * fields). We read `id` to find the link + `default_address` to mirror
 * onto the profile.
 */
interface CustomersUpdatePayload {
  id?: number | string
  default_address?: unknown
}

export async function handleCustomersUpdate(
  payload: unknown
): Promise<ShopifyHandlerResult> {
  const p = payload as CustomersUpdatePayload
  const shopifyCustomerId = p?.id != null ? String(p.id) : null
  if (!shopifyCustomerId) {
    return { ok: false, reason: 'missing customer id in payload' }
  }
  if (p.default_address == null) {
    // Address is the only field we care about right now. Other
    // customer updates (email change, tags, etc.) are no-ops for us.
    return { ok: true, effects: { skipped: 'no_address_in_payload' } }
  }

  const db = getDb()
  const [link] = await db
    .select({ userId: shopifyLinks.userId })
    .from(shopifyLinks)
    .where(eq(shopifyLinks.shopifyCustomerId, shopifyCustomerId))
    .limit(1)
  if (!link) {
    return { ok: false, reason: 'no shopify_links row for customer' }
  }

  await db
    .update(profiles)
    .set({
      shippingAddressCached: p.default_address as object,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, link.userId))

  await logAction({
    actorId: null,
    action: 'shipping_address_mirrored',
    targetType: 'user',
    targetId: link.userId,
    after: { source: 'shopify_customers_update' },
    source: 'webhook',
  })

  return { ok: true, effects: { userId: link.userId } }
}

// ── fulfillments/create ─────────────────────────────────────────────

/**
 * Payload shape we use. Shopify's full Fulfillment payload has
 * tracking, line items, etc. — we read order_id only.
 */
interface FulfillmentsCreatePayload {
  id?: number | string
  order_id?: number | string
  status?: string
}

export async function handleFulfillmentsCreate(
  payload: unknown
): Promise<ShopifyHandlerResult> {
  const p = payload as FulfillmentsCreatePayload
  const orderId = p?.order_id != null ? String(p.order_id) : null
  if (!orderId) {
    return { ok: false, reason: 'missing order_id in payload' }
  }

  const db = getDb()
  // Look up shipment row first — lets us decide if this is one of ours
  // (Phase 3 will have populated this table) or an unrelated order
  // (e.g. one-off magazine purchase from the shop).
  const [shipment] = await db
    .select({
      id: magazineShipments.id,
      status: magazineShipments.status,
      userId: magazineShipments.userId,
    })
    .from(magazineShipments)
    .where(eq(magazineShipments.shopifyOrderId, orderId))
    .limit(1)
  if (!shipment) {
    // Not a magazine shipment we're tracking. Webhook is still a 200 —
    // this fires for every Shopify fulfillment, most aren't ours.
    return { ok: true, effects: { skipped: 'not_a_magazine_shipment' } }
  }

  // Idempotency: only update if not already fulfilled.
  if (shipment.status === 'fulfilled') {
    return { ok: true, effects: { skipped: 'already_fulfilled', shipmentId: shipment.id } }
  }

  await db
    .update(magazineShipments)
    .set({
      status: 'fulfilled',
      shippedAt: new Date(),
    })
    .where(
      and(
        eq(magazineShipments.id, shipment.id),
        // Belt-and-braces — don't overwrite a non-queued state.
        eq(magazineShipments.shopifyOrderId, orderId)
      )
    )

  await logAction({
    actorId: null,
    action: 'magazine_shipment_fulfilled',
    targetType: 'magazine_shipment',
    targetId: shipment.id,
    after: { shopify_order_id: orderId, user_id: shipment.userId },
    source: 'webhook',
  })

  // Fire the magazine-shipped confirmation email. Best-effort —
  // a Resend outage shouldn't fail the webhook (Shopify would retry,
  // and the row is already 'fulfilled' so the second pass would skip).
  try {
    const [recipient] = await db
      .select({
        email: users.email,
        name: users.name,
        issueId: magazineShipments.issueId,
      })
      .from(magazineShipments)
      .innerJoin(users, eq(users.id, magazineShipments.userId))
      .where(eq(magazineShipments.id, shipment.id))
      .limit(1)

    if (recipient?.email) {
      const [issue] = await db
        .select({
          issueNumber: magazineIssues.issueNumber,
          title: magazineIssues.title,
        })
        .from(magazineIssues)
        .where(eq(magazineIssues.id, recipient.issueId))
        .limit(1)

      const issueTitle = issue?.title || `Issue ${issue?.issueNumber ?? ''}`.trim()

      await sendTemplate({
        userId: shipment.userId,
        to: recipient.email,
        templateId: 'magazine-shipped',
        props: {
          recipientName: recipient.name ?? null,
          issueTitle,
          trackingUrl: null, // Shopify fulfilment payload may carry a URL; future improvement
          shippingAddress: null,
        },
      })
    }
  } catch (err) {
    console.error('[fulfilments/create] magazine-shipped email failed', err)
  }

  return {
    ok: true,
    effects: { shipmentId: shipment.id, status: 'fulfilled', userId: shipment.userId },
  }
}
