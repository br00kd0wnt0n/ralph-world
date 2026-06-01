import { NextResponse, type NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { emailEvents } from '@/lib/db/schema'
import { verifyResendSignature } from '@/lib/email/verifyResendSignature'

export const runtime = 'nodejs'

/**
 * Resend webhook intake — architecture doc §10.
 *
 * Verifies the Svix signature on every request and records each event in
 * email_events. Returns 401 on signature failure, 400 on malformed body,
 * 500 on DB failure (so Resend retries), 200 once the row is written.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook/resend] RESEND_WEBHOOK_SECRET not set')
    return new NextResponse('webhook not configured', { status: 500 })
  }

  const rawBody = await request.text()

  const verification = verifyResendSignature({
    headers: {
      svixId: request.headers.get('svix-id'),
      svixTimestamp: request.headers.get('svix-timestamp'),
      svixSignature: request.headers.get('svix-signature'),
    },
    body: rawBody,
    secret,
  })
  if (!verification.ok) {
    console.warn('[webhook/resend] signature rejected:', verification.reason)
    return new NextResponse('signature rejected', { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new NextResponse('invalid json', { status: 400 })
  }

  const p = payload as {
    type?: string
    data?: { email_id?: string; to?: string | string[]; email?: string }
  }
  const eventType = p?.type ?? 'unknown'
  const recipientRaw = p?.data?.to ?? p?.data?.email ?? ''
  const recipient = Array.isArray(recipientRaw) ? recipientRaw[0] : recipientRaw
  const resendEventId = p?.data?.email_id ?? null

  try {
    await getDb().insert(emailEvents).values({
      resendEventId,
      email: recipient || 'unknown',
      eventType,
      payload: payload as object,
    })
  } catch (err) {
    console.error('[webhook/resend] failed to write email_events:', err)
    return new NextResponse('db error', { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
