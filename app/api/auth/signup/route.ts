import { NextResponse, type NextRequest } from 'next/server'
import { signupWithPassword } from '@/lib/auth/signup'
import { rateLimited, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * Email/password signup — Task 1.3.
 *
 * Accepts { email, password, name? }. Creates the user (unverified),
 * stores a bcrypt hash, and emails a verification link. Always returns
 * 200 with `{ ok: true }` on the success path AND on the
 * `already_registered_verified` path — Auth-style enumeration-resistant
 * response so we don't leak which addresses are signed up. Real reasons
 * land in logs.
 */
export async function POST(request: NextRequest) {
  if (rateLimited(`signup:${clientIp(request.headers)}`, 5, 15 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many attempts. Please try again in a few minutes.' },
      { status: 429 }
    )
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const b = body as {
    email?: unknown
    password?: unknown
    name?: unknown
    marketingOptIn?: unknown
  }
  const email = typeof b.email === 'string' ? b.email : ''
  const password = typeof b.password === 'string' ? b.password : ''
  const name = typeof b.name === 'string' ? b.name : null
  const marketingOptIn = b.marketingOptIn === true

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`

  const result = await signupWithPassword({ email, password, name, marketingOptIn, appUrl })

  if (result.ok) {
    return NextResponse.json({ ok: true, message: 'Check your inbox to verify your email.' })
  }

  // Reveal validation errors to the user but mask account-existence.
  if (result.reason === 'invalid_email' || result.reason === 'invalid_password') {
    return NextResponse.json(
      { ok: false, error: result.reason, message: result.message },
      { status: 400 }
    )
  }
  // For both already-registered branches, return the same enumeration-safe
  // response shape the client would see on a real signup.
  return NextResponse.json({
    ok: true,
    message: 'Check your inbox to verify your email.',
  })
}
