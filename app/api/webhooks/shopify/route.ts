import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { users, profiles, webhookLog } from '@/lib/db/schema'
import { verifyShopifyHmac } from '@/lib/shopify/verifyHmac'
import {
  handleCustomersUpdate,
  handleFulfillmentsCreate,
} from '@/lib/shopify/webhook-handlers'

export const runtime = 'nodejs'

/**
 * Shopify webhook intake.
 *
 * Two layers:
 *   - Legacy topics (`orders/paid`, `subscriptions/create`,
 *     `subscriptions/cancelled`) drive the OLD Shopify-Subscriptions
 *     paid-tier flow. Kept until Phase 4 cuts over to Stripe-only and
 *     legacy subscribers expire.
 *   - New topics (Task 2.6, arch doc §11): `customers/update` mirrors
 *     a Shopify-side address edit back onto the profile;
 *     `fulfillments/create` flips the magazine_shipments row to
 *     'fulfilled' (Phase 3 fills the table).
 *
 * Signature verification + body parsing happen once at the top. Every
 * receipt is logged to webhook_log regardless of topic — diagnostics.
 */

async function updateSubscriptionByEmail(
  email: string,
  status: 'free' | 'paid'
) {
  const db = getDb()
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (!user) return
  await db
    .update(profiles)
    .set({ subscriptionStatus: status, updatedAt: new Date() })
    .where(eq(profiles.id, user.id))
}

export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook/shopify] SHOPIFY_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
  const topic = request.headers.get('x-shopify-topic') ?? 'unknown'

  const verification = verifyShopifyHmac({ hmacHeader, body: rawBody, secret })
  if (!verification.ok) {
    console.warn('[webhook/shopify] signature rejected:', verification.reason)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    // Diagnostics row, regardless of topic.
    const db = getDb()
    await db.insert(webhookLog).values({
      source: 'shopify',
      eventType: topic,
      payload,
    })

    // ── New Phase 2.6 topics ────────────────────────────────────────
    if (topic === 'customers/update') {
      const result = await handleCustomersUpdate(payload)
      return NextResponse.json({ ok: true, result })
    }
    if (topic === 'fulfillments/create') {
      const result = await handleFulfillmentsCreate(payload)
      return NextResponse.json({ ok: true, result })
    }

    // ── Legacy Shopify Subscriptions topics (pre-Phase-2) ───────────
    // These keep working until Phase 4 cuts over to Stripe-only.
    const email =
      (payload.customer as { email?: string })?.email ??
      (payload.email as string | undefined)
    if (!email) {
      return NextResponse.json({ ok: true, note: 'No email in payload' })
    }
    if (topic === 'orders/paid' || topic === 'subscriptions/create') {
      await updateSubscriptionByEmail(email, 'paid')
    } else if (topic === 'subscriptions/cancelled') {
      await updateSubscriptionByEmail(email, 'free')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[webhook/shopify] processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
