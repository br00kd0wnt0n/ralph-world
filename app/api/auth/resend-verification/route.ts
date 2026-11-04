import { NextResponse, type NextRequest } from 'next/server'
import { resendVerificationEmail } from '@/lib/auth/signup'
import { parseJoinIntent } from '@/lib/join-intent'
import { rateLimited, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * POST /api/auth/resend-verification  { email, intent?: 'paid' }
 *
 * Sends a fresh verification link to an unverified account. Used by the
 * /join-ralph verify slide ("Send a new verify link") and by its tier slide
 * when a just-signed-up visitor picks the paid tier (the new link carries
 * intent=paid so they land on checkout after signing in).
 *
 * Never changes the password (the old resend re-ran sign-up with a
 * placeholder password, which overwrote the real one). Always answers ok,
 * so it doesn't reveal which addresses have accounts.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
    intent?: unknown
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }
  if (
    rateLimited(`resend-verify:${clientIp(request.headers)}`, 5, 15 * 60_000) ||
    rateLimited(`resend-verify:${email}`, 3, 15 * 60_000)
  ) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many attempts. Please try again in a few minutes.' },
      { status: 429 }
    )
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`

  try {
    await resendVerificationEmail({ email, appUrl, intent: parseJoinIntent(body.intent) })
  } catch (err) {
    console.error('[resend-verification] failed:', err)
    return NextResponse.json({ ok: false, error: 'unknown' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
