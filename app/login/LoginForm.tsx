'use client'

import { useActionState, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { signinWithCredentials, signupAction } from './actions'
import type { SigninResult, SignupResult } from './actions'

/**
 * Full-width shadow button matching the brand `Button` component: an offset
 * black shadow behind a bordered button that presses toward it (`.btn-press`).
 * `variant`: white (Google) or pink (primary CTA). Gooper type throughout.
 */
function ShadowButton({
  children,
  variant = 'pink',
  type = 'submit',
  disabled = false,
}: {
  children: ReactNode
  variant?: 'white' | 'pink'
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const isPink = variant === 'pink'
  return (
    <div className="relative w-full">
      <div
        className="absolute inset-0 translate-x-1 translate-y-1 bg-black"
        aria-hidden="true"
      />
      <button
        type={type}
        disabled={disabled}
        className={`${disabled ? '' : 'btn-press'} relative w-full flex items-center justify-center gap-3 border-2 border-black py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed ${
          isPink ? 'bg-ralph-pink text-black' : 'bg-white text-black'
        }`}
        style={{ fontFamily: "var(--font-intro, 'Gooper Trial'), serif", fontWeight: 600 }}
      >
        {children}
      </button>
    </div>
  )
}

interface Props {
  callbackUrl: string
  initialMode: 'signin' | 'signup'
  /** Banner state from URL params — e.g. verify=ok / verify=error&reason=… */
  banner: BannerState | null
  /** Google sign-in is wired via a server action passed from the page. */
  googleAction: () => Promise<void>
}

export type BannerState =
  | { tone: 'success'; text: string }
  | { tone: 'error'; text: string }
  | { tone: 'info'; text: string }

/**
 * /login form — Task 1.3 UI. Modes:
 *   - signin: email + password → server action calls signIn('credentials')
 *   - signup: email + password (+ optional name) → server action calls
 *            signupWithPassword(), shows "check your inbox" on success
 *
 * Google sign-in stays as a server-action form (no JS required for it).
 * The email/password path uses useActionState so we can render inline
 * errors without a page reload.
 */
export function LoginForm({ callbackUrl, initialMode, banner, googleAction }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [isGooglePending, startGoogleTransition] = useTransition()

  const [signinState, signinFormAction, signinPending] = useActionState<
    SigninResult | null,
    FormData
  >(signinWithCredentials, null)

  const [signupState, signupFormAction, signupPending] = useActionState<
    SignupResult | null,
    FormData
  >(signupAction, null)

  return (
    <div className="bg-white rounded-2xl px-6 py-12 text-black">
      {/* URL-driven banner (verify=ok, verify=error, ?error=…) */}
      {banner && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm border ${
            banner.tone === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : banner.tone === 'error'
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-sky-50 border-sky-300 text-sky-800'
          }`}
          role="status"
        >
          {banner.text}
        </div>
      )}

      {/* Google */}
      <form
        action={() => {
          startGoogleTransition(() => {
            void googleAction()
          })
        }}
      >
        <ShadowButton variant="white" type="submit" disabled={isGooglePending}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {isGooglePending ? 'Opening Google…' : 'Continue with Google'}
        </ShadowButton>
      </form>

      {/* divider */}
      <div className="flex items-center my-5">
        <div className="flex-1 h-px bg-black/15" />
        <span className="px-3 text-xs uppercase tracking-widest text-black/50">or</span>
        <div className="flex-1 h-px bg-black/15" />
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border-2 border-black p-1 mb-4 text-sm">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            mode === 'signin'
              ? 'bg-ralph-pink text-black font-medium'
              : 'text-black/60 hover:text-black'
          }`}
          style={{ fontFamily: "var(--font-intro, 'Gooper Trial'), serif", fontWeight: 600 }}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            mode === 'signup'
              ? 'bg-ralph-pink text-black font-medium'
              : 'text-black/60 hover:text-black'
          }`}
          style={{ fontFamily: "var(--font-intro, 'Gooper Trial'), serif", fontWeight: 600 }}
        >
          Create account
        </button>

      </div>

      {/* SIGN IN */}
      {mode === 'signin' && (
        <form action={signinFormAction} className="space-y-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {signinState && !signinState.ok && (
            <p className="text-sm text-red-600" role="alert">
              {signinState.message ?? 'Couldn’t sign in.'}
            </p>
          )}
          <div className="pt-1">
            <ShadowButton type="submit" disabled={signinPending}>
              {signinPending ? 'Signing in…' : 'Sign in'}
            </ShadowButton>
          </div>
          <div className="text-center">
            <Link
              href="/reset-password"
              className="text-xs text-black/50 hover:text-black transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      )}

      {/* SIGN UP */}
      {mode === 'signup' && (
        <form action={signupFormAction} className="space-y-3">
          <Field
            label="Name (optional)"
            name="name"
            type="text"
            autoComplete="name"
          />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            hint="Minimum 10 characters."
          />
          {signupState && (
            <p
              className={`text-sm ${
                signupState.ok ? 'text-emerald-700' : 'text-red-600'
              }`}
              role={signupState.ok ? 'status' : 'alert'}
            >
              {signupState.message}
            </p>
          )}
          <div className="pt-1">
            <ShadowButton type="submit" disabled={signupPending}>
              {signupPending ? 'Creating account…' : 'Create account'}
            </ShadowButton>
          </div>
          <p className="text-xs text-black/50 text-center">
            We’ll email you a link to verify your address before you can sign in.
          </p>
        </form>
      )}

      <p className="text-black/50 text-xs mt-6 text-center">
        By {mode === 'signin' ? 'signing in' : 'creating an account'}, you
        agree to Ralph’s Terms and Privacy Policy.
      </p>
    </div>
  )
}

interface FieldProps {
  label: string
  name: string
  type: string
  autoComplete?: string
  required?: boolean
  hint?: string
}

function Field({ label, name, type, autoComplete, required, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-black/60 mb-1">
        {label}
      </span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="w-full bg-gray-200 px-4 placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-ralph-pink/40"
        style={{
          height: 43,
          borderRadius: 8,
          color: 'black',
          fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
          fontWeight: 600,
          fontSize: 16,
          lineHeight: 1,
        }}
      />
      {hint && <span className="block text-xs text-black/50 mt-1">{hint}</span>}
    </label>
  )
}
