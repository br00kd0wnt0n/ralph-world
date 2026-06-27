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

// Shared signup field style — grey fill, 8px radius, black Gooper text.
const fieldClass =
  'w-full bg-gray-200 px-4 placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-ralph-pink/40'
const fieldStyle: React.CSSProperties = {
  height: 43,
  borderRadius: 8,
  color: 'black',
  fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
  fontWeight: 600,
  fontSize: 16,
  lineHeight: 1,
}

// Body copy — Roboto 600, 13px / 23px, black, centred.
const bodyCopyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body), Arial, sans-serif',
  fontWeight: 600,
  fontSize: 13,
  lineHeight: '23px',
  letterSpacing: 0,
  color: '#000',
}

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

// Full-width shadow button (skeuomorphic offset shadow + black rim, Gooper
// face). Accepts an icon + text as children. Matches the shared Button look.
function ShadowButton({
  children,
  type = 'button',
  onClick,
  disabled = false,
}: {
  children: React.ReactNode
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <div className="relative w-full">
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          pointerEvents: 'none',
        }}
      />
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`relative w-full inline-flex items-center justify-center gap-3 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'btn-press'
        }`}
        style={{
          height: 43,
          border: '2px solid black',
          backgroundColor: 'white',
          color: 'black',
          fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
          fontWeight: 600,
          fontSize: 16,
          lineHeight: 1,
          cursor: 'pointer',
          transition: 'transform 0.15s ease',
        }}
      >
        {children}
      </button>
    </div>
  )
}

export default function JoinRalphClient({
  magCoverUrl = null,
}: {
  magCoverUrl?: string | null
}) {
  const router = useRouter()
  const params = useSearchParams()

  const rawStep = parseInt(params.get('step') ?? '1', 10) || 1
  const step = Math.max(1, Math.min(4, rawStep)) as Step
  const tier: Tier = params.get('tier') === 'paid' ? 'paid' : 'free'
  // Preview mode (?preview=1): skip the "needs form data" guard and seed
  // placeholder name/email so slides 3 & 4 can be styled without filling
  // out the flow. Dev/design aid only.
  const preview = params.get('preview') === '1'

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
    if (!preview && (step === 3 || step === 4) && !email) {
      router.replace(buildHref(2))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, email, preview])

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
        {/* overflow-hidden on the slides container is needed for the horizontal
            slide transitions, so 100px of the top offset lives *inside* it
            (as padding) to give slide characters headroom without being clipped. */}
        <div
          className="relative z-10 pb-16 min-h-[60vh]"
          style={{ paddingTop: 100 }}
        >
          <div className="max-w-5xl mx-auto px-6 overflow-hidden" style={{ paddingTop: 100 }}>
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
                {step === 1 && <Slide1 onSelectTier={handleSelectTier} magCoverUrl={magCoverUrl} />}
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
                    email={email || (preview ? 'you@example.com' : '')}
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
                    email={email || (preview ? 'you@example.com' : '')}
                    firstName={firstName || (preview ? 'Alex' : '')}
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

function Slide1({
  onSelectTier,
  magCoverUrl,
}: {
  onSelectTier: (t: Tier) => void
  magCoverUrl?: string | null
}) {
  return (
    <div className="grid md:grid-cols-[1fr_1fr] gap-8 md:gap-16 items-start">
      {/* Left: JOIN RALPH title + magazine cover decoration + astronaut */}
      <div className="relative">
        {/* Latest shop magazine cover */}
        {magCoverUrl && (
          <div className="absolute -left-2 top-20 hidden md:block pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={magCoverUrl}
              alt=""
              aria-hidden="true"
              className="w-36 h-52 object-cover border border-black rounded select-none"
              style={{ transform: 'rotate(-8deg)' }}
            />
          </div>
        )}

        <img
          src="/imgs/text-join-ralph.svg"
          alt="Join Ralph"
          className="relative z-10 block mx-auto w-full max-w-[250px] h-auto"
        />

        {/* Painter character */}
        <img
          src="/imgs/join-ralph-painter.svg"
          alt=""
          aria-hidden="true"
          className="relative z-10 block mt-8 ml-auto pointer-events-none select-none"
          style={{ width: 153, height: 'auto', transform: 'translate(20px, -100px)' }}
        />
      </div>

      {/* Right: tiers */}
      <div className="flex flex-col gap-10 relative pt-4">
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
      {/* Centred form column. Astronaut is absolutely positioned just to the
        right of the form (decorative; hidden on mobile where there's no room). */}
      <div className="relative mx-auto w-full" style={{ maxWidth: 361 }}>
        <BackButton onClick={onBack} />
        <img
          src="/imgs/join-raph-astronaut.svg"
          alt=""
          aria-hidden="true"
          className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-2 pointer-events-none select-none"
          style={{ width: 182, height: 'auto' }}
        />
        <div className="w-full">
          {/* Google — shadow button style */}
          <ShadowButton onClick={onGoogle} disabled={googlePending}>
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
          </ShadowButton>

          <div className="flex items-center justify-center my-5">
            <span
              style={{
                fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                fontWeight: 600,
                fontSize: 16,
                lineHeight: 1,
                letterSpacing: 0,
                color: '#000000',
              }}
            >
              or
            </span>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              style={fieldStyle}
            />
            <button
              type="submit"
              className="w-full hover:bg-black/5 transition-colors"
              style={{
                height: 43,
                border: '2px solid #00000066',
                backgroundColor: 'transparent',
                color: 'black',
                fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                fontWeight: 600,
                fontSize: 16,
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              Continue
            </button>
          </form>

          <p
            className="text-black mt-4 text-center mx-auto"
            style={{
              fontFamily: 'var(--font-body), Arial, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              lineHeight: 1,
              letterSpacing: 0,
              maxWidth: '80%',
            }}
          >
            By signing up, you are creating an account with Ralph and agree to
            Ralph&apos;s{' '}
            <a href="/legal/terms" className="underline font-extrabold">
              Terms
            </a>{' '}
            and{' '}
            <a href="/legal/privacy" className="underline font-extrabold">
              Privacy Policy
            </a>
            .
          </p>
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
      {/* Centred form column with the eyes character to its right (matches Slide 2). */}
      <div className="relative mx-auto w-full" style={{ maxWidth: 361 }}>
        <BackButton onClick={onBack} />
        <img
          src="/imgs/join-ralph-eyes.svg"
          alt=""
          aria-hidden="true"
          className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-2 pointer-events-none select-none"
          style={{ width: 120, height: 'auto' }}
        />
        <div className="w-full">
          <h2
            className="text-2xl text-black text-center mb-2"
            style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
          >
            Complete your account
          </h2>
          <p
            className="text-center mb-6"
            style={{
              fontFamily: 'var(--font-body), Arial, sans-serif',
              fontWeight: 600,
              fontSize: 13,
              lineHeight: '33px',
              letterSpacing: 0,
              color: '#000',
            }}
          >
            {email}
          </p>

          <form action={signupFormAction}>
            {/* Server-action FormData: combine first + last into `name`. */}
            <input
              type="hidden"
              name="name"
              value={`${firstName} ${lastName}`.trim()}
            />
            <input type="hidden" name="email" value={email} />

            {/* Name fields */}
            <div className="space-y-3">
              <input
                type="text"
                autoComplete="given-name"
                required
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={fieldClass}
                style={fieldStyle}
              />
              <input
                type="text"
                autoComplete="family-name"
                required
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={fieldClass}
                style={fieldStyle}
              />
            </div>

            {/* Password — double gap above to separate from the name fields */}
            <div className="mt-6 space-y-2">
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={10}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
                style={fieldStyle}
              />
              <p className="text-xs text-black/60">Minimum 10 characters.</p>
            </div>

            {/* Marketing opt-in — GDPR requires this to be an unchecked,
                granular, explicit choice (no pre-ticked boxes). */}
            <label className="flex items-start gap-2 mt-4 cursor-pointer text-xs text-black">
              <input
                type="checkbox"
                name="marketing_opt_in"
                className="mt-0.5 h-4 w-4 accent-ralph-pink shrink-0"
              />
              <span>
                Send me the Ralph newsletter — news, drops, and the
                occasional pun. You can unsubscribe any time.
              </span>
            </label>

            {signupState && !signupState.ok && (
              <p className="text-sm text-red-600 mt-3" role="alert">
                {signupState.message}
              </p>
            )}

            <div className="mt-4">
              <ShadowButton type="submit" disabled={signupPending}>
                {signupPending ? 'Creating account…' : 'Continue'}
              </ShadowButton>
            </div>
          </form>
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
      {/* Centred column with the character to the side. Wider than Slides 2 & 3. */}
      <div className="relative mx-auto w-full text-center" style={{ maxWidth: 620 }}>
        <BackButton onClick={onBack} />
        <div className="w-full">
          {/* Title with the wave character to its left */}
          <div className="relative flex justify-center mb-2">
            <h2
              className="relative text-2xl text-black"
              style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
            >
              <img
                src="/imgs/join-ralph-wave.svg"
                alt=""
                aria-hidden="true"
                className="hidden md:block absolute right-full top-1/2 mr-3 pointer-events-none select-none"
                style={{ width: 120, height: 'auto', transform: 'translateY(calc(-50% - 40px))' }}
              />
              Verify your email{firstName ? `, ${firstName}` : ''}
            </h2>
          </div>
          <p
            className="mb-6"
            style={{
              fontFamily: 'var(--font-body), Arial, sans-serif',
              fontWeight: 600,
              fontSize: 13,
              lineHeight: '33px',
              letterSpacing: 0,
              color: '#000',
            }}
          >
            {email}
          </p>

          <h3
            className="text-base text-black mb-3"
            style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
          >
            Welcome to Ralph&apos;s World
          </h3>
          <p className="mb-4" style={bodyCopyStyle}>
            Just one more step — we need to confirm your email, so you don&apos;t
            miss out on updates, offers, events and all the other good stuff.
          </p>
          <p className="mb-6" style={bodyCopyStyle}>
            We&apos;ve already pinged you an email to the above address. Simply
            press the link in that email to verify.
          </p>

          <p className="mb-2" style={bodyCopyStyle}>No email? Check spam.</p>
          <p className="mb-6" style={bodyCopyStyle}>Still nothing?</p>

          <div className="flex justify-center">
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
    </div>
  )
}
