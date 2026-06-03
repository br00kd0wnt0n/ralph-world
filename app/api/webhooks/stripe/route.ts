import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { stripeEvents } from '@/lib/db/schema'
import { verifyStripeSignature } from '@/lib/stripe/verifySignature'
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaid,
} from '@/lib/stripe/webhook-handlers'

export const runtime = 'nodejs'

/**
 * Stripe webhook intake — Task 2.3, arch doc §9.
 *
 * Verifies the Stripe-Signature header, dedupes via stripe_events
 * (UNIQUE on stripe_event_id catches replays), then dispatches to the
 * matching handler in lib/stripe/webhook-handlers.ts.
 *
 * Return codes:
 *   200 — event processed (or already processed — idempotent no-op)
 *   400 — bad JSON body
 *   401 — signature verification failed
 *   500 — DB write failed (Stripe will retry)
 *
 * Important: we INSERT the event row BEFORE dispatching to the handler.
 * If the handler crashes, the event row stays in stripe_events with
 * processing_status='received' — a follow-up job can replay manually.
 * If the handler succeeds, we update processing_status='processed'.
 */

const HANDLERS: Record<string, (e: Stripe.Event) => Promise<unknown>> = {
  'checkout.session.completed': (e) =>
    handleCheckoutSessionCompleted(e, {
      // Task 2.4 will inject the Shopify address-sync hook here.
      // For 2.3 we ship without it; the profile still gets
      // shippingAddressCached.
    }),
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'invoice.paid': handleInvoicePaid,
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook/stripe] STRIPE_WEBHOOK_SECRET not set')
    return new NextResponse('webhook not configured', { status: 500 })
  }

  const rawBody = await request.text()
  const signatureHeader = request.headers.get('stripe-signature')

  const verification = verifyStripeSignature({
    signatureHeader,
    body: rawBody,
    secret,
  })
  if (!verification.ok) {
    console.warn('[webhook/stripe] signature rejected:', verification.reason)
    return new NextResponse('signature rejected', { status: 401 })
  }

  // Parse the body. We trust it because the signature checked out.
  let event: Stripe.Event
  try {
    event = JSON.parse(rawBody) as Stripe.Event
  } catch {
    return new NextResponse('invalid json', { status: 400 })
  }
  if (!event.id || !event.type) {
    return new NextResponse('malformed event', { status: 400 })
  }

  // Reserve the event id — UNIQUE on stripe_event_id makes this our
  // idempotency lever. Same pattern as email_events.idempotency_key
  // in Task 1.4.
  const db = getDb()
  try {
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event as unknown as object,
      processingStatus: 'received',
    })
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (code === '23505') {
      // Replay — already processed (or in flight). Return 200 so
      // Stripe stops retrying.
      return NextResponse.json({ ok: true, deduped: true })
    }
    console.error('[webhook/stripe] failed to insert event row:', err)
    return new NextResponse('db error', { status: 500 })
  }

  // Dispatch.
  const handler = HANDLERS[event.type]
  if (!handler) {
    // Unknown event type — still 200 so Stripe doesn't retry forever.
    // The row is in stripe_events with processing_status='received' for
    // diagnostics.
    return NextResponse.json({ ok: true, ignored: event.type })
  }

  try {
    await handler(event)
    // Update the existing event row to processed.
    await db
      .update(stripeEvents)
      .set({ processingStatus: 'processed', processedAt: new Date() })
      .where(eq(stripeEvents.stripeEventId, event.id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook/stripe] handler failed for', event.type, err)
    // Mark the row as failed so the alert/replay pipeline can find it.
    // Errors here are best-effort — don't let bookkeeping mask the real
    // handler error.
    try {
      await db
        .update(stripeEvents)
        .set({ processingStatus: 'failed', processedAt: new Date() })
        .where(eq(stripeEvents.stripeEventId, event.id))
    } catch (markErr) {
      console.error('[webhook/stripe] failed to mark event failed:', markErr)
    }
    // 500 → Stripe retries with exponential backoff. The replay will
    // hit the 23505 dedupe on the next try — to actually re-process,
    // an operator needs to delete the stripe_events row by hand. For
    // Phase 2 we accept this as the manual recovery story; auto-retry
    // is a Phase 3+ enhancement.
    return new NextResponse('handler error', { status: 500 })
  }
}
