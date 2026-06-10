'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { signupWithPassword } from '@/lib/auth/signup'

/**
 * Server actions for the /login page email/password forms.
 *
 * - `signinWithCredentials` wraps Auth.js v5's `signIn('credentials')`.
 *   We surface a small, stable set of error codes so the form can show
 *   useful copy:
 *     'EmailNotVerified' — credentials matched but email_verified is null
 *     'CredentialsSignin' — bad email/password
 *     'Unknown'           — anything else (network, config, etc.)
 *
 * - `signupAction` wraps `signupWithPassword` directly so the form
 *   doesn't have to fetch /api/auth/signup. Same shape of response —
 *   ok / error — but kept private to the page.
 */

const EMAIL_NOT_VERIFIED = 'EmailNotVerified'

export interface SigninResult {
  ok: boolean
  error?:
    | 'EmailNotVerified'
    | 'CredentialsSignin'
    | 'Unknown'
  message?: string
}

export async function signinWithCredentials(
  _prev: SigninResult | null,
  formData: FormData
): Promise<SigninResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const callbackUrl = safeCallback(String(formData.get('callbackUrl') ?? '/account'))

  if (!email || !password) {
    return { ok: false, error: 'CredentialsSignin', message: 'Enter your email and password.' }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: callbackUrl,
    })
    // signIn throws a NEXT_REDIRECT on success — we never reach here.
    return { ok: true }
  } catch (err) {
    // Re-throw Next.js redirect signals so the framework can handle them.
    // (next-auth wraps signIn in a way that throws to redirect on success.)
    if (isRedirectError(err)) throw err

    if (err instanceof AuthError) {
      // Auth.js v5 surfaces our thrown errors via the `cause` chain.
      const causeMsg =
        (err.cause as { err?: { message?: string } } | undefined)?.err?.message ?? ''
      if (causeMsg.includes(EMAIL_NOT_VERIFIED)) {
        return {
          ok: false,
          error: 'EmailNotVerified',
          message: 'Your email isn’t verified yet. Check your inbox for the verification link.',
        }
      }
      return {
        ok: false,
        error: 'CredentialsSignin',
        message: 'That email and password didn’t match. Try again.',
      }
    }
    return { ok: false, error: 'Unknown', message: 'Something went wrong. Try again.' }
  }
}

export interface SignupResult {
  ok: boolean
  error?: 'invalid_email' | 'invalid_password' | 'Unknown'
  message?: string
}

export async function signupAction(
  _prev: SignupResult | null,
  formData: FormData
): Promise<SignupResult> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const name = String(formData.get('name') ?? '').trim() || null
  // HTML checkboxes only submit if checked, so absence === false.
  // Tolerate any truthy string ('on', 'true', '1') for forward compat.
  const marketingRaw = formData.get('marketing_opt_in')
  const marketingOptIn = marketingRaw === 'on' || marketingRaw === 'true' || marketingRaw === '1'

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    'https://ralph.world'

  try {
    const result = await signupWithPassword({ email, password, name, marketingOptIn, appUrl })
    if (result.ok) {
      return { ok: true, message: 'Check your inbox — we’ve sent you a verification link.' }
    }
    // Validation errors surface to the user. Account-existence cases
    // are enumeration-safe — we return ok so the UI shows the same
    // "check your inbox" message regardless.
    if (
      result.reason === 'invalid_email' ||
      result.reason === 'invalid_password'
    ) {
      return { ok: false, error: result.reason, message: result.message }
    }
    return {
      ok: true,
      message: 'Check your inbox — we’ve sent you a verification link.',
    }
  } catch (err) {
    console.error('[signup] action failed:', err)
    return {
      ok: false,
      error: 'Unknown',
      message: 'We couldn’t create your account. Try again in a minute.',
    }
  }
}

// ── helpers ──────────────────────────────────────────────────────────

function safeCallback(raw: string): string {
  // Mirror the open-redirect guard from page.tsx.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/account'
  if (raw.includes('://') || raw.includes('\\')) return '/account'
  return raw
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}
