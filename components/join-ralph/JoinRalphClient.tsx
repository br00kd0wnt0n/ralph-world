'use client'

import { useEffect, useState, useTransition, useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import { signupAction, type SignupResult } from '@/app/login/actions'
import Button from '@/components/ui/Button'

type Tier = 'free' | 'paid'
type Step = 1 | 2 | 3 | 4

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
}

const slideTransition = { type: 'tween' as const, duration: 0.4, ease: 'easeInOut' as const }

// Shop-style back button — `< Back` in ralph-pink Gooper Trial 600/18.
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-[22px] inline-flex items-center justify-center text-ralph-pink hover:opacity-80 transition-opacity"
      style={{
        fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
        fontWeight: 600,
        fontSize: 18,
        lineHeight: 1,
        letterSpacing: 0,
      }}
    >
      &lt; Back
    </button>
  )
}

export default function JoinRalphClient() {
  const router = useRouter()
  const params = useSearchParams()

  const rawStep = parseInt(params.get('step') ?? '1', 10) || 1
  const step = Math.max(1, Math.min(4, rawStep)) as Step
  const tier: Tier = params.get('tier') === 'paid' ? 'paid' : 'free'

  // Form state carried across slides 2 → 3 → 4. Held in component state
  // rather than URL so we don't leak emails into the URL/history.
  // Trade-off: a hard refresh on slide 3+ bounces back to slide 2.
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [direction, setDirection] = useState(0)
  const [isGooglePending, startGoogleTransition] = useTransition()

  const [signupState, signupFormAction, signupPending] = useActionState<
    SignupResult | null,
    FormData
  >(signupAction, null)

  // Build a new search-params URL for a given step + tier (keeps the
  // current tier unless explicitly overridden).
  function buildHref(targetStep: number, targetTier: Tier = tier) {
    const sp = new URLSearchParams()
    sp.set('step', String(targetStep))
    sp.set('tier', targetTier)
    return `/join-ralph?${sp.toString()}`
  }

  function goToStep(targetStep: number, targetTier: Tier = tier) {
    setDirection(targetStep > step ? 1 : -1)
    router.push(buildHref(targetStep, targetTier))
  }

  // Bounce hard-refreshed users back to step 2 when slide 3+ requires
  // form data that's been lost. Only intervene if the URL is downstream
  // of where the state can support.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if ((step === 3 || step === 4) && !email) {
      router.replace(buildHref(2))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, email])

  // When the signup action succeeds, advance to the verify slide.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (signupState?.ok && step === 3) {
      setDirection(1)
      router.push(buildHref(4))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signupState])

  function handleSelectTier(t: Tier) {
    goToStep(2, t)
  }

  function handleGoogleSignup() {
    const callbackUrl =
      tier === 'paid' ? '/account?upgrade=paid' : '/account'
    startGoogleTransition(() => {
      void signIn('google', { callbackUrl })
    })
  }

  function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    goToStep(3)
  }

  return (
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      <section
        className="relative"
        style={{ minHeight: 'calc(100svh - 200px)' }}
      >
        {/* Planet bg (top) + white fill */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full planet-bg-cover"
              style={{
                backgroundImage: 'url(/imgs/planet_background_creative.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                width: '100%',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none planet-bg-cover"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_creative.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                width: '100%',
              }}
              aria-hidden="true"
            />
          </div>
          <div
            className="absolute bg-white"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </div>

        {/* Content */}
        <div
          className="relative z-10 pb-16 min-h-[60vh]"
          style={{ paddingTop: 200 }}
        >
          <div className="max-w-5xl mx-auto px-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="pb-6"
              >
                {step === 1 && <Slide1 onSelectTier={handleSelectTier} />}
                {step === 2 && (
                  <Slide2
                    email={email}
                    setEmail={setEmail}
                    onBack={() => goToStep(1)}
                    onGoogle={handleGoogleSignup}
                    googlePending={isGooglePending}
                    onSubmit={handleEmailContinue}
                  />
                )}
                {step === 3 && (
                  <Slide3
                    email={email}
                    firstName={firstName}
                    setFirstName={setFirstName}
                    lastName={lastName}
                    setLastName={setLastName}
                    password={password}
                    setPassword={setPassword}
                    onBack={() => goToStep(2)}
                    signupFormAction={signupFormAction}
                    signupPending={signupPending}
                    signupState={signupState}
                  />
                )}
                {step === 4 && (
                  <Slide4
                    email={email}
                    firstName={firstName}
                    onBack={() => goToStep(3)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Slide 1 — JOIN RALPH hero + tier copy
// ────────────────────────────────────────────────────────────────────────────

function Slide1({ onSelectTier }: { onSelectTier: (t: Tier) => void }) {
  return (
    <div className="grid md:grid-cols-[1fr_1fr] gap-8 md:gap-16 items-start">
      {/* Left: JOIN RALPH title + magazine cover decoration + astronaut */}
      <div className="relative">
        {/* Mag cover placeholder */}
        <div className="absolute -left-2 top-20 hidden md:block pointer-events-none">
          <div
            className="w-36 h-52 bg-ralph-yellow/40 border border-black rounded flex items-center justify-center text-[10px] text-gray-500"
            style={{ transform: 'rotate(-8deg)' }}
          >
            mag cover
          </div>
        </div>

        <img
          src="/imgs/text-join-ralph.svg"
          alt="Join Ralph"
          className="relative z-10 block mx-auto w-full max-w-[250px] h-auto"
        />

        {/* Astronaut placeholder */}
        <div className="relative z-10 w-28 h-36 bg-black/5 border border-black/30 rounded flex items-center justify-center text-[10px] text-gray-500 mt-8 ml-auto">
          astronaut
        </div>
      </div>

      {/* Right: tiers */}
      <div className="flex flex-col gap-10 relative pt-4">
        {/* Mag cover placeholder */}
        <div className="absolute -right-6 -top-4 hidden md:block pointer-events-none">
          <div
            className="w-28 h-40 bg-ralph-pink/40 border border-black rounded flex items-center justify-center text-[10px] text-gray-500"
            style={{ transform: 'rotate(6deg)' }}
          >
            mag cover
          </div>
        </div>

        {/* Free tier */}
        <div className="relative z-10 max-w-md">
          <h3
            className="text-black mb-3"
            style={{
              fontFamily: "'Gooper Trial', serif",
              fontWeight: 600,
              fontSize: 22,
              lineHeight: '100%',
              letterSpacing: 0,
            }}
          >
            Experience pop culture for the fun of it.
          </h3>
          <p
            className="text-black mb-5"
            style={{
              fontFamily: 'var(--font-body), Arial, sans-serif',
              fontWeight: 600,
              fontSize: 16,
              lineHeight: '28px',
              letterSpacing: 0,
            }}
          >
            For the princely sum of just your email address, you can enjoy
            access to all our editorial content, buy tickets to one of our
            amazing IRL events and much more. Sounds good, right? Then
            what&apos;s stopping you?
          </p>
          <Button
            label="Hook me up for free"
            onClick={() => onSelectTier('free')}
            minWidth={230}
          />
        </div>

        {/* Paid tier */}
        <div className="relative z-10 max-w-md">
          <h3
            className="text-black mb-3"
            style={{
              fontFamily: "'Gooper Trial', serif",
              fontWeight: 600,
              fontSize: 22,
              lineHeight: '100%',
              letterSpacing: 0,
            }}
          >
            Prefer your culture more hands-on?
          </h3>
          <p
            className="text-black mb-5"
            style={{
              fontFamily: 'var(--font-body), Arial, sans-serif',
              fontWeight: 600,
              fontSize: 16,
              lineHeight: '28px',
              letterSpacing: 0,
            }}
          >
            Then you need a bit of The Ralph&trade; in your life. For just
            £3 a month you&apos;ll get our quarterly fun, glossy mag straight
            through your letterbox. On top of that, we&apos;ll switch on our
            TV channel for you, plus everything else Ralph World has to offer.
          </p>
          <Button
            label="Join for £3 per month"
            onClick={() => onSelectTier('paid')}
            minWidth={230}
          />
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Slide 2 — Google or email
// ────────────────────────────────────────────────────────────────────────────

function Slide2({
  email,
  setEmail,
  onBack,
  onGoogle,
  googlePending,
  onSubmit,
}: {
  email: string
  setEmail: (s: string) => void
  onBack: () => void
  onGoogle: () => void
  googlePending: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="grid md:grid-cols-[1fr_auto] gap-8 md:gap-16 items-start">
        {/* Left: methods */}
        <div className="max-w-md w-full">
          <button
            type="button"
            onClick={onGoogle}
            disabled={googlePending}
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-white border-2 border-black py-3 text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{
              fontFamily: "'Gooper Trial', serif",
              fontWeight: 600,
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {googlePending ? 'Opening Google…' : 'Continue with Google'}
          </button>

          <div className="flex items-center my-5">
            <div className="flex-1 h-px bg-black/15" />
            <span className="px-3 text-xs uppercase tracking-widest text-black/60">
              or
            </span>
            <div className="flex-1 h-px bg-black/15" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-gray-200 px-4 py-3 text-black text-sm border border-transparent focus:outline-none focus:border-ralph-pink"
            />
            <div className="flex justify-center pt-1">
              <Button label="Continue" type="submit" minWidth={230} />
            </div>
          </form>

          <p className="text-xs text-black/60 mt-4 text-center">
            By signing up, you are creating an account with Ralph and agree to
            Ralph&apos;s{' '}
            <a href="/legal/terms" className="underline">
              Terms
            </a>{' '}
            and{' '}
            <a href="/legal/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        {/* Right: character placeholder */}
        <div className="hidden md:block">
          <div className="w-40 h-56 bg-black/5 border border-black/30 rounded flex items-center justify-center text-[10px] text-gray-500">
            astronaut
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Slide 3 — Complete your account (credentials form)
// ────────────────────────────────────────────────────────────────────────────

function Slide3({
  email,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  password,
  setPassword,
  onBack,
  signupFormAction,
  signupPending,
  signupState,
}: {
  email: string
  firstName: string
  setFirstName: (s: string) => void
  lastName: string
  setLastName: (s: string) => void
  password: string
  setPassword: (s: string) => void
  onBack: () => void
  signupFormAction: (formData: FormData) => void
  signupPending: boolean
  signupState: SignupResult | null
}) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="grid md:grid-cols-[1fr_auto] gap-8 md:gap-16 items-start">
        <div className="max-w-md w-full">
          <h2
            className="text-2xl text-black text-center mb-2"
            style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
          >
            Complete your account
          </h2>
          <p className="text-sm text-black/70 text-center mb-6">{email}</p>

          <form action={signupFormAction} className="space-y-3">
            {/* Server-action FormData: combine first + last into `name`. */}
            <input
              type="hidden"
              name="name"
              value={`${firstName} ${lastName}`.trim()}
            />
            <input type="hidden" name="email" value={email} />

            <input
              type="text"
              autoComplete="given-name"
              required
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg bg-gray-200 px-4 py-3 text-black text-sm border border-transparent focus:outline-none focus:border-ralph-pink"
            />
            <input
              type="text"
              autoComplete="family-name"
              required
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg bg-gray-200 px-4 py-3 text-black text-sm border border-transparent focus:outline-none focus:border-ralph-pink"
            />
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={10}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-gray-200 px-4 py-3 text-black text-sm border border-transparent focus:outline-none focus:border-ralph-pink"
            />
            <p className="text-xs text-black/60">
              Minimum 10 characters.
            </p>

            {signupState && !signupState.ok && (
              <p className="text-sm text-red-600" role="alert">
                {signupState.message}
              </p>
            )}

            <div className="flex justify-center pt-1">
              <Button
                label={signupPending ? 'Creating account…' : 'Continue'}
                type="submit"
                minWidth={230}
              />
            </div>
          </form>
        </div>

        <div className="hidden md:block">
          <div className="w-40 h-56 bg-black/5 border border-black/30 rounded flex items-center justify-center text-[10px] text-gray-500">
            character
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Slide 4 — Verify your email
// ────────────────────────────────────────────────────────────────────────────

function Slide4({
  email,
  firstName,
  onBack,
}: {
  email: string
  firstName: string
  onBack: () => void
}) {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleResend() {
    if (!email || resending) return
    setResending(true)
    try {
      await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'resend-placeholder' }),
      })
      setResent(true)
    } finally {
      setResending(false)
    }
  }

  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="grid md:grid-cols-[auto_1fr] gap-8 md:gap-16 items-start">
        {/* Left: character placeholder */}
        <div className="hidden md:block">
          <div className="w-32 h-40 bg-black/5 border border-black/30 rounded flex items-center justify-center text-[10px] text-gray-500">
            character
          </div>
        </div>

        <div className="max-w-md w-full">
          <h2
            className="text-2xl text-black mb-2"
            style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
          >
            Verify your email{firstName ? `, ${firstName}` : ''}
          </h2>
          <p className="text-sm text-black/70 mb-6">{email}</p>

          <h3
            className="text-base text-black mb-3"
            style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
          >
            Welcome to Ralph&apos;s World
          </h3>
          <p className="text-sm text-black/80 mb-4 leading-relaxed">
            Just one more step — we need to confirm your email, so you don&apos;t
            miss out on updates, offers, events and all the other good stuff.
          </p>
          <p className="text-sm text-black/80 mb-6 leading-relaxed">
            We&apos;ve already pinged you an email to the above address. Simply
            press the link in that email to verify.
          </p>

          <p className="text-sm text-black/60 mb-2">No email? Check spam.</p>
          <p className="text-sm text-black/60 mb-6">Still nothing?</p>

          <Button
            label={
              resending
                ? 'Sending…'
                : resent
                  ? 'Sent — check your inbox'
                  : 'Send a new verify link'
            }
            onClick={handleResend}
            minWidth={230}
          />
        </div>
      </div>
    </div>
  )
}
