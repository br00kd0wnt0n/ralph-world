import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getDb } from '@/lib/db'
import { users, profiles, webhookLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

function verifyHmac(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (!secret || !hmacHeader) return false

  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(hmacHeader)
    )
  } catch {
    return false
  }
}

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
  const rawBody = await request.text()
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
  const topic = request.headers.get('x-shopify-topic') ?? 'unknown'

  if (!verifyHmac(rawBody, hmacHeader)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    // Log event regardless of outcome
    const db = getDb()
    await db.insert(webhookLog).values({
      source: 'shopify',
      eventType: topic,
      payload,
    })

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
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
