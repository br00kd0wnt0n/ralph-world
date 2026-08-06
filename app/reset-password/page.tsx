'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password-policy'

/**
 * Password reset page — Task 3.7.
 *
 * Two modes driven by URL params:
 *   - No params         → request form (enter email, we send a link)
 *   - ?email=&token=    → confirm form (enter new password)
 */
export default function ResetPasswordPage() {
  const params = useSearchParams()
  const email = params.get('email')
  const token = params.get('token')
  const isConfirmMode = !!(email && token)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <Link
          href="/login"
          className="inline-block text-sm text-secondary hover:text-primary transition-colors mb-8"
        >
          &larr; Back to sign in
        </Link>
        {isConfirmMode ? (
          <ConfirmForm email={email} token={token} />
        ) : (
          <RequestForm />
        )}
      </div>
    </div>
  )
}

// ── Request form ──────────────────────────────────────────────────────

function RequestForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  if (sent) {
    return (
      <>
        <h1 className="text-2xl font-bold text-primary mb-4 font-[family-name:var(--font-intro,'Gooper_Trial')]">
          Check your email
        </h1>
        <p className="text-secondary text-sm">
          If{' '}<strong>{email}</strong>{' '}has a Ralph.world account, we&apos;ve sent a
          reset link. It expires in 1 hour.
        </p>
        <p className="text-secondary text-sm mt-4">
          Didn&apos;t get it? Check your spam folder or{' '}
          <button
            className="underline hover:text-primary transition-colors"
            onClick={() => setSent(false)}
          >
            try again
          </button>
          .
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-primary mb-2 font-[family-name:var(--font-intro,'Gooper_Trial')]">
        Reset your password
      </h1>
      <p className="text-secondary text-sm mb-8">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-primary mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ralph-pink/40 light:focus:ring-neutral-400/40"
            placeholder="you@example.com"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-ralph-pink text-black py-3 text-sm font-medium hover:bg-ralph-pink/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </>
  )
}

// ── Confirm form ──────────────────────────────────────────────────────

function ConfirmForm({ email, token }: { email: string; token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // Must match the server floor in lib/auth/passwords.ts — a shorter
    // client gate just turns into an opaque 400 from /api/auth/set-password.
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError("Passwords don’t match.")
      return
    }
    startTransition(async () => {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      })
      if (res.ok) {
        router.push('/login?reset=ok')
      } else {
        const data = await res.json().catch(() => ({}))
        if (data?.error === 'expired') {
          setError('This reset link has expired. Please request a new one.')
        } else if (data?.error === 'not_found' || data?.error === 'no_user') {
          setError('This reset link is invalid. Please request a new one.')
        } else if (data?.error === 'password_too_short') {
          // Surface the server's own reason rather than the generic
          // fallback — otherwise a policy mismatch reads as a server fault.
          setError(data?.message ?? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        } else if (data?.error === 'rate_limited') {
          setError('Too many attempts. Please wait a few minutes and try again.')
        } else {
          setError('Something went wrong. Please try again.')
        }
      }
    })
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-primary mb-2 font-[family-name:var(--font-intro,'Gooper_Trial')]">
        Choose a new password
      </h1>
      <p className="text-secondary text-sm mb-8">
        Setting password for <strong>{email}</strong>.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-primary mb-1">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ralph-pink/40 light:focus:ring-neutral-400/40"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-primary mb-1">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ralph-pink/40 light:focus:ring-neutral-400/40"
            placeholder="Repeat password"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-ralph-pink text-black py-3 text-sm font-medium hover:bg-ralph-pink/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </>
  )
}
