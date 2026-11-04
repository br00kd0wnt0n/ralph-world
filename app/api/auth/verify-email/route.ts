import { NextResponse, type NextRequest } from 'next/server'
import { consumeVerificationToken } from '@/lib/auth/verification-tokens'
import { PAID_CHECKOUT_PATH, parseJoinIntent } from '@/lib/join-intent'
import { sendFreeWelcome } from '@/lib/email/welcome'

export const runtime = 'nodejs'

/**
 * Email verification consume endpoint — Task 1.3.
 *
 * Receives the link from the verification email at
 * `/api/auth/verify-email?email=&token=`. On success, marks
 * `users.email_verified = now()` and redirects to /login with a flag so
 * the page can show "email verified — please sign in" copy. On failure,
 * redirects to /login with `?verify=error&reason=...`.
 *
 * Redirect base URL is read from NEXT_PUBLIC_APP_URL / AUTH_URL — never
 * from `request.nextUrl.origin`. Behind Railway's reverse proxy, the
 * incoming request's URL reflects the internal container address
 * (`http://localhost:3000`) rather than the public hostname, so a
 * redirect built from it would send the user to localhost.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  const token = request.nextUrl.searchParams.get('token')

  const loginUrl = new URL('/login', publicBaseUrl())

  if (!email || !token) {
    loginUrl.searchParams.set('verify', 'error')
    loginUrl.searchParams.set('reason', 'missing_params')
    return NextResponse.redirect(loginUrl)
  }

  const result = await consumeVerificationToken({ email, token })
  if (!result.ok) {
    loginUrl.searchParams.set('verify', 'error')
    loginUrl.searchParams.set('reason', result.reason)
    return NextResponse.redirect(loginUrl)
  }

  // First verification → welcome email (idempotent; never throws).
  await sendFreeWelcome(result.userId)

  loginUrl.searchParams.set('verify', 'ok')
  // Chose the paid tier at sign-up → after signing in, go to checkout.
  if (parseJoinIntent(request.nextUrl.searchParams.get('intent'))) {
    loginUrl.searchParams.set('callbackUrl', PAID_CHECKOUT_PATH)
  }
  return NextResponse.redirect(loginUrl)
}

function publicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    'http://localhost:3000'
  )
}
