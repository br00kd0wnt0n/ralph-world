import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/auth'
import { LoginForm, type BannerState } from './LoginForm'

export const metadata: Metadata = {
  title: 'Log in',
  robots: { index: false, follow: false },
}

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string
    error?: string
    /** ?verify=ok | ?verify=error — set by /api/auth/verify-email */
    verify?: string
    reason?: string
    /** ?mode=signup | ?mode=signin — initial form tab */
    mode?: string
    /** ?reset=ok — set by /reset-password after successful password update */
    reset?: string
  }>
}

/**
 * Only accept same-origin relative paths as a callback.
 * Blocks absolute URLs (open-redirect), protocol-relative, and anything suspicious.
 */
function safeCallback(raw: string | undefined): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  if (raw.includes('://') || raw.includes('\\')) return '/'
  return raw
}

/**
 * Map ?verify / ?error URL params to the banner shown above the form.
 * Kept here (server-side) so the strings are part of the SSR markup —
 * no client-side flicker on first paint.
 */
function bannerFor(params: {
  verify?: string
  reason?: string
  error?: string
  reset?: string
}): BannerState | null {
  if (params.reset === 'ok') {
    return {
      tone: 'success',
      text: 'Password updated — sign in with your new password.',
    }
  }
  if (params.verify === 'ok') {
    return {
      tone: 'success',
      text: 'Email verified — sign in to continue.',
    }
  }
  if (params.verify === 'error') {
    const reason = params.reason ?? 'unknown'
    const text =
      reason === 'expired'
        ? 'That verification link has expired. Try signing up again to get a fresh one.'
        : reason === 'not_found'
        ? 'That verification link is no longer valid.'
        : reason === 'missing_params'
        ? 'The verification link was incomplete.'
        : 'We couldn’t verify your email. Try again or sign up.'
    return { tone: 'error', text }
  }
  if (params.error) {
    // Auth.js v5 generic error param.
    return {
      tone: 'error',
      text: 'Something went wrong signing in. Please try again.',
    }
  }
  return null
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth()
  const {
    callbackUrl: rawCallback,
    error,
    verify,
    reason,
    mode: rawMode,
    reset,
  } = await searchParams
  const callbackUrl = safeCallback(rawCallback)

  // If already signed in, bounce to destination (now guaranteed same-origin)
  if (session?.user) {
    redirect(callbackUrl)
  }

  const initialMode: 'signin' | 'signup' =
    rawMode === 'signup' ? 'signup' : 'signin'
  const banner = bannerFor({ verify, reason, error, reset })

  // Google sign-in must stay a server action so it can call signIn()
  // directly (it's not allowed from client code). Defined here and
  // passed down to the form.
  async function googleAction() {
    'use server'
    await signIn('google', { redirectTo: callbackUrl })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative z-10">
      <div className="max-w-sm w-full">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/ralph-logo.png"
            alt="Ralph.World"
            width={88}
            height={88}
            className="rounded-full mb-6"
            priority
          />
          <h1 className="text-3xl font-bold text-primary mb-2 text-center">
            {initialMode === 'signup' ? 'Join Ralph' : 'Sign in to Ralph'}
          </h1>
          <p className="text-secondary text-sm text-center">
            Pop culture for the fun of it.
          </p>
        </div>

        <LoginForm
          callbackUrl={callbackUrl}
          initialMode={initialMode}
          banner={banner}
          googleAction={googleAction}
        />

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-secondary hover:text-primary transition-colors"
          >
            &larr; Back to Ralph.World
          </Link>
        </div>
      </div>
    </div>
  )
}
