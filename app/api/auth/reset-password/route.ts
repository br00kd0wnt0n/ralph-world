import { NextResponse, type NextRequest } from 'next/server'
import { issuePasswordResetToken } from '@/lib/auth/password-reset'
import { sendTemplate } from '@/lib/email/send'
import { getDb } from '@/lib/db'
import { users, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimited, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

function publicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    'http://localhost:3000'
  )
}

/**
 * POST /api/auth/reset-password
 * Body: { email: string }
 *
 * Issues a password-reset token and sends the reset email.
 * Always returns 200 — we never confirm whether the email exists
 * to prevent user enumeration.
 */
export async function POST(request: NextRequest) {
  // Rate limit to stop reset-email bombing (per IP). Returns the same
  // enumeration-safe 200 shape would be ideal, but a 429 here doesn't leak
  // account existence (it's IP-scoped, not email-scoped).
  if (rateLimited(`reset:${clientIp(request.headers)}`, 5, 15 * 60_000)) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }
  let email: string | undefined
  try {
    const body = await request.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }

  // Issue token — returns null if email not found (we still return 200).
  const result = await issuePasswordResetToken({ email })
  if (!result) {
    // Email not found — return 200 so we don't leak user existence.
    return NextResponse.json({ ok: true })
  }

  const resetUrl = `${publicBaseUrl()}/reset-password?email=${encodeURIComponent(email)}&token=${result.token}`

  // Fetch display name for personalised email.
  let displayName: string | null = null
  try {
    const db = getDb()
    const [row] = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.id))
      .where(eq(users.email, email))
      .limit(1)
    displayName = row?.displayName ?? null
  } catch {
    // Non-fatal — send without name
  }

  try {
    await sendTemplate({
      userId: email, // no userId available pre-auth; use email as idempotency key
      to: email,
      templateId: 'password-reset',
      props: { resetUrl, recipientName: displayName },
    })
  } catch (err) {
    console.error('[reset-password] failed to send reset email:', err)
    // Still return 200 — we don't want to reveal whether the send failed
    // (though in production a monitoring alert would fire here).
  }

  return NextResponse.json({ ok: true })
}
