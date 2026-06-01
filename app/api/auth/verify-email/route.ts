import { NextResponse, type NextRequest } from 'next/server'
import { consumeVerificationToken } from '@/lib/auth/verification-tokens'

export const runtime = 'nodejs'

/**
 * Email verification consume endpoint — Task 1.3.
 *
 * Receives the link from the verification email at
 * `/api/auth/verify-email?email=&token=`. On success, marks
 * `users.email_verified = now()` and redirects to /login with a flag so
 * the page can show "email verified — please sign in" copy. On failure,
 * redirects to /login with `?verify=error&reason=...`.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  const token = request.nextUrl.searchParams.get('token')

  const loginUrl = new URL('/login', request.nextUrl.origin)

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

  loginUrl.searchParams.set('verify', 'ok')
  return NextResponse.redirect(loginUrl)
}
