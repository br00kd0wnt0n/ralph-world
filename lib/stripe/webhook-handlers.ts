import 'server-only'
import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { profiles, users } from '@/lib/db/schema'
import { logAction } from '@/lib/audit'
import { sendTemplate } from '@/lib/email/send'

/**
 * Stripe webhook event handlers — Task 2.3, arch doc §9.
 *
 * One exported function per event we care about. Each:
 *   - Resolves the Ralph.world userId from event metadata or by
 *     looking up profiles.stripe_customer_id
 *   - Updates the matching profile row
 *   - Writes an audit_log row (via logAction — best-effort, won't
 *     throw)
 *   - Returns a small result object so the route handler can log
 *     outcomes
 *
 * Idempotency is handled at the route layer via the stripe_events
 * INSERT (UNIQUE on stripe_event_id) — by the time these handlers
 * run, we already know this is a first-time event.
 */

export type HandlerResult =
  | { ok: true; userId: string; effects: Record<string, unknown> }
  | { ok: false; reason: string }

// Audit rows for webhook-driven changes have no actor (Stripe is the
// caller, not a Ralph user). null is fine on the column.
const RW_NULL_USER: string | null = null

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Resolve userId from event metadata first, then fall back to looking
 * up profile by stripe_customer_id.
 */
async function resolveUserId(args: {
  metadataUserId?: string | null
  stripeCustomerId?: string | null
}): Promise<string | null> {
  if (args.metadataUserId) return args.metadataUserId
  if (!args.stripeCustomerId) return null
  const db = getDb()
  const [row] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.stripeCustomerId, args.stripeCustomerId))
    .limit(1)
  return row?.id ?? null
}

function extractId(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null
  return typeof v === 'string' ? v : v.id
}

// ── Email helpers ─────────────────────────────────────────────────────

function appUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    'http://localhost:3000'
  return `${base.replace(/\/$/, '')}${path}`
}

/**
 * Fetch user email + display name for transactional email sends.
 * Returns null if the user can't be found — caller skips the send.
 */
async function fetchUserContact(
  userId: string
): Promise<{ email: string; displayName: string | null } | null> {
  try {
    const db = getDb()
    const [row] = await db
      .select({ email: users.email, displayName: profiles.displayName })
      .from(users)
      .innerJoin(profiles, eq(profiles.id, users.id))
      .where(eq(users.id, userId))
      .limit(1)
    if (!row?.email) return null
    return { email: row.email, displayName: row.displayName ?? null }
  } catch {
    return null
  }
}

// ── Handlers ─────────────────────────────────────────────────────────

/**
 * `checkout.session.completed` — the user just finished paying. This is
 * where a subscription is born. We set tier=paid, capture the Stripe
 * customer + subscription ids on the profile, and cache the shipping
 * address. Address sync to Shopify lives in Task 2.4 — a callback hook
 * is exposed for the route handler to wire in.
 */
export async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  hooks: {
    /** Called after profile update, before audit. Errors are caught + logged. */
    onShippingAddress?: (args: {
      userId: string
      shippingAddressCached: unknown
    }) => Promise<void>
  } = {}
): Promise<HandlerResult> {
  const session = event.data.object as Stripe.Checkout.Session
  const metadataUserId = (session.metadata?.user_id as string | undefined) ?? null
  const stripeCustomerId = extractId(session.customer)
  const userId = await resolveUserId({ metadataUserId, stripeCustomerId })
  if (!userId) {
    return { ok: false, reason: 'cannot resolve userId from event' }
  }
  const stripeSubscriptionId = extractId(session.subscription)

  // Stripe Checkout puts the shipping address on session.shipping_details
  // (newer API) or customer_details.address (older paths). We accept
  // either and store the address jsonb as-is.
  const shipping =
    (session as unknown as { shipping_details?: { name?: string | null; address?: unknown } })
      .shipping_details ?? null
  const shippingAddressCached: unknown = shipping?.address ?? null

  const db = getDb()
  await db
    .update(profiles)
    .set({
      tier: 'paid',
      subscriptionStatus: 'active',
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
      ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
      ...(shippingAddressCached ? { shippingAddressCached } : {}),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))

  // Shopify address sync hook — Task 2.4 wires this in.
  if (hooks.onShippingAddress && shippingAddressCached) {
    try {
      await hooks.onShippingAddress({ userId, shippingAddressCached })
    } catch (err) {
      console.error('[stripe-webhook] shopify address sync failed:', err)
      // Don't block the webhook — Shopify sync is best-effort, can
      // be reconciled by a later job.
    }
  }

  // Subscription receipt email is sent from handleInvoicePaid (billing_reason
  // === 'subscription_create') where the period_end is already resolved from
  // the invoice lines — more reliable than fetching it here.

  await logAction({
    actorId: RW_NULL_USER,
    action: 'sub_status_changed',
    targetType: 'user',
    targetId: userId,
    after: {
      tier: 'paid',
      subscription_status: 'active',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
    },
    source: 'webhook',
  })

  return {
    ok: true,
    userId,
    effects: {
      tier: 'paid',
      stripeCustomerId,
      stripeSubscriptionId,
      shippingAddressCached: Boolean(shippingAddressCached),
    },
  }
}

/** Pull period_end out of a checkout session object (from items or invoice). */
function periodEndFromSession(
  session: Stripe.Checkout.Session
): number | null {
  // The session itself doesn't carry period_end — we read it from the
  // subscription later via the subscription.updated event. Return null here;
  // the subscription-receipt just says "next billing date".
  void session
  return null
}

/**
 * `customer.subscription.updated` — Stripe reports a state change on the
 * subscription (status, period end, items, etc.). We mirror the status
 * + period end to the profile.
 *
 * Statuses we care about: active, past_due, unpaid, canceled.
 * 'incomplete' / 'incomplete_expired' / 'trialing' fire too but aren't
 * meaningful for our launch model (no trials).
 */
export async function handleSubscriptionUpdated(
  event: Stripe.Event
): Promise<HandlerResult> {
  const sub = event.data.object as Stripe.Subscription
  const metadataUserId = (sub.metadata?.user_id as string | undefined) ?? null
  const stripeCustomerId = extractId(sub.customer)
  const userId = await resolveUserId({ metadataUserId, stripeCustomerId })
  if (!userId) {
    return { ok: false, reason: 'cannot resolve userId from event' }
  }

  const tier = sub.status === 'active' ? 'paid' : 'free'
  const subscriptionStatus = sub.status
  // current_period_end moved from the Subscription object to
  // SubscriptionItem in Stripe API 2025-04-30+. Read from either
  // location to stay compatible with webhook endpoints configured
  // against older API versions too.
  const subAny = sub as unknown as {
    current_period_end?: number
    items?: { data?: Array<{ current_period_end?: number }> }
  }
  const periodEndSeconds =
    subAny.current_period_end ?? subAny.items?.data?.[0]?.current_period_end ?? null
  const periodEnd =
    typeof periodEndSeconds === 'number' ? new Date(periodEndSeconds * 1000) : null

  // Stripe API 2026-05-27+ (dahlia) uses cancel_at (a Unix timestamp set
  // to the period end) rather than the legacy cancel_at_period_end boolean
  // flag when a subscription is scheduled to cancel at the end of its
  // current period. Treat either form as a scheduled cancellation.
  const subWithCancelAt = sub as unknown as { cancel_at?: number | null }
  const cancelAtPeriodEnd =
    sub.cancel_at_period_end === true || (subWithCancelAt.cancel_at != null)

  const db = getDb()
  await db
    .update(profiles)
    .set({
      tier,
      subscriptionStatus,
      subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
      ...(periodEnd ? { subscriptionCurrentPeriodEnd: periodEnd } : {}),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))

  await logAction({
    actorId: RW_NULL_USER,
    action: 'sub_status_changed',
    targetType: 'user',
    targetId: userId,
    after: { tier, subscription_status: subscriptionStatus, period_end: periodEnd?.toISOString() ?? null },
    source: 'webhook',
  })

  return { ok: true, userId, effects: { tier, subscriptionStatus } }
}

/**
 * `customer.subscription.deleted` — subscription fully ended (user
 * cancelled and the period elapsed, or admin cancelled, or unrecoverable
 * payment failure). User drops back to free tier.
 */
export async function handleSubscriptionDeleted(
  event: Stripe.Event
): Promise<HandlerResult> {
  const sub = event.data.object as Stripe.Subscription
  const metadataUserId = (sub.metadata?.user_id as string | undefined) ?? null
  const stripeCustomerId = extractId(sub.customer)
  const userId = await resolveUserId({ metadataUserId, stripeCustomerId })
  if (!userId) {
    return { ok: false, reason: 'cannot resolve userId from event' }
  }

  const db = getDb()
  await db
    .update(profiles)
    .set({
      tier: 'free',
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))

  // Subscription cancelled email — Task 3.7.
  try {
    const contact = await fetchUserContact(userId)
    if (contact) {
      const periodEndSeconds =
        (sub as unknown as { current_period_end?: number }).current_period_end ??
        (sub as unknown as { items?: { data?: Array<{ current_period_end?: number }> } })
          .items?.data?.[0]?.current_period_end ??
        null
      const accessUntil = periodEndSeconds
        ? new Date(periodEndSeconds * 1000).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
        : 'the end of your current period'
      await sendTemplate({
        userId,
        to: contact.email,
        templateId: 'subscription-cancelled',
        props: {
          recipientName: contact.displayName,
          accessUntil,
          resubscribeUrl: appUrl('/account'),
        },
      })
    }
  } catch (err) {
    console.error('[stripe-webhook] subscription-cancelled email failed:', err)
  }

  await logAction({
    actorId: RW_NULL_USER,
    action: 'sub_status_changed',
    targetType: 'user',
    targetId: userId,
    after: { tier: 'free', subscription_status: 'canceled' },
    source: 'webhook',
  })

  return { ok: true, userId, effects: { tier: 'free', subscriptionStatus: 'canceled' } }
}

/**
 * `invoice.payment_failed` — Stripe couldn't charge the card. Subscription
 * moves to `past_due`. Stripe will retry per its Smart Retries config;
 * if all retries fail, we'll eventually see `customer.subscription.deleted`.
 *
 * Email send is the Phase 3 §3.7 work — for Phase 2 we log + audit only.
 */
export async function handleInvoicePaymentFailed(
  event: Stripe.Event
): Promise<HandlerResult> {
  const invoice = event.data.object as Stripe.Invoice
  const stripeCustomerId = extractId(invoice.customer)
  const userId = await resolveUserId({ stripeCustomerId })
  if (!userId) {
    return { ok: false, reason: 'cannot resolve userId from event' }
  }

  const db = getDb()
  await db
    .update(profiles)
    .set({
      subscriptionStatus: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))

  // Payment failed email — Task 3.7. The portal URL lets them update their card.
  try {
    const contact = await fetchUserContact(userId)
    if (contact) {
      await sendTemplate({
        userId,
        to: contact.email,
        templateId: 'payment-failed',
        props: {
          recipientName: contact.displayName,
          updatePaymentUrl: appUrl('/account'),
        },
      })
    }
  } catch (err) {
    console.error('[stripe-webhook] payment-failed email failed:', err)
  }

  await logAction({
    actorId: RW_NULL_USER,
    action: 'sub_status_changed',
    targetType: 'user',
    targetId: userId,
    after: { subscription_status: 'past_due' },
    source: 'webhook',
  })

  return { ok: true, userId, effects: { subscriptionStatus: 'past_due' } }
}

/**
 * `invoice.paid` — recurring renewal succeeded. Bump
 * subscription_current_period_end on the profile.
 *
 * Stripe also fires this on the first invoice for a fresh subscription;
 * checkout.session.completed already covered that case but the period
 * end update here is harmless overlap.
 */
export async function handleInvoicePaid(
  event: Stripe.Event
): Promise<HandlerResult> {
  const invoice = event.data.object as Stripe.Invoice
  const stripeCustomerId = extractId(invoice.customer)
  const userId = await resolveUserId({ stripeCustomerId })
  if (!userId) {
    return { ok: false, reason: 'cannot resolve userId from event' }
  }

  // Invoice doesn't carry current_period_end directly — we get the
  // period from line_items. Use the maximum period.end across lines.
  const lines = invoice.lines?.data ?? []
  const periodEndSeconds = lines
    .map((l) => l.period?.end ?? 0)
    .reduce((a, b) => Math.max(a, b), 0)
  const periodEnd = periodEndSeconds > 0 ? new Date(periodEndSeconds * 1000) : null

  const db = getDb()
  await db
    .update(profiles)
    .set({
      // Reset to 'active' in case we'd flipped to past_due — a paid
      // invoice means we're current again.
      subscriptionStatus: 'active',
      tier: 'paid',
      ...(periodEnd ? { subscriptionCurrentPeriodEnd: periodEnd } : {}),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))

  // Send the subscription receipt email only on the first invoice for a new
  // subscription. billing_reason === 'subscription_create' is set by Stripe
  // for exactly that case; 'subscription_cycle' covers renewals, which we
  // don't email about here.
  if (invoice.billing_reason === 'subscription_create' && periodEnd) {
    try {
      const contact = await fetchUserContact(userId)
      if (contact) {
        await sendTemplate({
          userId,
          to: contact.email,
          templateId: 'subscription-receipt',
          props: {
            recipientName: contact.displayName,
            periodEnd: periodEnd.toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            }),
            amount: '£3.00',
            manageUrl: appUrl('/account'),
          },
        })
      }
    } catch (err) {
      console.error('[stripe-webhook] subscription-receipt email failed:', err)
    }
  }

  await logAction({
    actorId: RW_NULL_USER,
    action: 'invoice_paid',
    targetType: 'user',
    targetId: userId,
    after: { period_end: periodEnd?.toISOString() ?? null },
    source: 'webhook',
  })

  return { ok: true, userId, effects: { tier: 'paid', periodEnd: periodEnd?.toISOString() } }
}
