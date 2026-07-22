'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import Button from '@/components/ui/Button'
import { LoginForm } from '@/app/login/LoginForm'

type Tier = 'free' | 'paid'
type Step = 1 | 2 | 3

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

export default function JoinRalphClient({
  magCoverUrl = null,
}: {
  magCoverUrl?: string | null
}) {
  const router = useRouter()
  const params = useSearchParams()

  const rawStep = parseInt(params.get('step') ?? '1', 10) || 1
  const step = Math.max(1, Math.min(3, rawStep)) as Step
  const tier: Tier = params.get('tier') === 'paid' ? 'paid' : 'free'
  // Preview mode (?preview=1): seed placeholder signup fields so the tier +
  // verify slides can be styled without walking the flow. Dev/design aid only.
  const preview = params.get('preview') === '1'

  // Email/name captured from the signup form (LoginForm) so the verify slide
  // can show them + resend. Kept in state, not the URL, so we don't leak the
  // address. Trade-off: a hard refresh on slide 2/3 bounces back to slide 1.
  const [signupEmail, setSignupEmail] = useState(preview ? 'you@example.com' : '')
  const [signupName, setSignupName] = useState(preview ? 'Alex' : '')
  const [direction, setDirection] = useState(0)

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

  // Steps 2 (tier) and 3 (verify) are only reachable after a signup this
  // session; a hard refresh loses that state — bounce back to the form.
  useEffect(() => {
    if (!preview && (step === 2 || step === 3) && !signupEmail) {
      router.replace(buildHref(1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, signupEmail, preview])

  // New account created → carry the details and move to the tier slide.
  function handleSignupSuccess(fields: { email: string; name: string }) {
    setSignupEmail(fields.email)
    setSignupName(fields.name)
    setDirection(1)
    router.push(buildHref(2))
  }

  return (
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Page h1 — visually hidden; the flow's own step headings are h2/h3. */}
      <h1 className="sr-only">Join Ralph</h1>
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
          style={{ paddingTop: 100 }}
        >
          {/* overflow-clip (+ a small clip-margin) instead of overflow-hidden so
              the decorative mag cover / badge can bleed ~40px past the edge
              without being cropped, while the full-width slide transitions
              (which translate 100% AND fade) are still effectively clipped. */}
          <div className="max-w-5xl mx-auto px-6 overflow-clip [overflow-clip-margin:40px] min-[992px]:pt-[100px]">
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
                {step === 1 && (
                  <Slide1
                    magCoverUrl={magCoverUrl}
                    right={
                      <LoginForm
                        bare
                        heading="Log in or sign up to Ralph.World"
                        callbackUrl="/account"
                        initialMode="signup"
                        banner={null}
                        googleAction={async () => {
                          await signIn('google', { callbackUrl: '/account' })
                        }}
                        onSignupSuccess={handleSignupSuccess}
                      />
                    }
                  />
                )}
                {step === 2 && (
                  <TierSlide
                    onSelectTier={(t) => {
                      if (t === 'free') {
                        // Digital Ralph — straight to the magazine.
                        router.push('/magazine')
                      } else {
                        // Physical Ralph — Stripe checkout (bounces to login
                        // first if the just-signed-up user isn't authed yet).
                        window.location.href = '/api/account/upgrade'
                      }
                    }}
                    firstName={signupName}
                  />
                )}
                {step === 3 && (
                  <VerifySlide
                    email={signupEmail}
                    firstName={signupName}
                    onBack={() => goToStep(2)}
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
// Slide 1 — JOIN RALPH hero (left) + login / signup form (right)
// ────────────────────────────────────────────────────────────────────────────

function Slide1({
  magCoverUrl,
  right,
}: {
  magCoverUrl?: string | null
  right: React.ReactNode
}) {
  // Single column (auto height) below 992px; two equal columns at >=992.
  return (
    <div className="grid min-[992px]:grid-cols-[1fr_1fr] gap-8 min-[992px]:gap-16 items-start">
      {/* Left: JOIN RALPH title + magazine cover decoration + painter */}
      <div className="relative">
        {/* Latest shop magazine cover */}
        {magCoverUrl && (
          <div className="absolute left-[-48px] top-20 hidden min-[1200px]:block pointer-events-none">
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
          className="relative z-10 block mx-auto w-full max-w-[180px] min-[992px]:max-w-[250px] h-auto"
        />

        {/* "Fun worth finding" badge — centred over the title, then nudged
            right (120px < 992, 150px >= 992). Smaller below 992. */}
        <img
          src="/imgs/fun-worth-finding.svg"
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 ml-[120px] min-[992px]:ml-[150px] top-[-20px] z-20 block pointer-events-none select-none w-[100px] min-[992px]:w-[130px] h-auto"
        />

        {/* Painter character — absolute so it doesn't add height; the column
            then collapses to just the JOIN RALPH title. top-full + the upward
            translate keep it in the same spot as the old in-flow version. */}
        <img
          src="/imgs/join-ralph-painter.svg"
          alt=""
          aria-hidden="true"
          className="absolute top-full right-0 z-10 hidden min-[992px]:block pointer-events-none select-none"
          style={{ width: 153, height: 'auto', transform: 'translate(20px, -168px)' }}
        />
      </div>

      {/* Right: login / signup. Capped + centred at <992 when stacked; fills
          the column at >=992. */}
      <div className="relative z-10 w-full max-w-[408px] mx-auto min-[992px]:max-w-none min-[992px]:mx-0">
        {right}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Slide 2 — Choose your subscription tier (shown after a new signup)
// ────────────────────────────────────────────────────────────────────────────

function TierSlide({
  onSelectTier,
  firstName,
}: {
  onSelectTier: (t: Tier) => void
  firstName: string
}) {
  const titleStyle: React.CSSProperties = {
    fontFamily: "'Gooper Trial', serif",
    fontWeight: 600,
    fontSize: 22,
    lineHeight: '110%',
    letterSpacing: 0,
  }
  const bodyStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body), Arial, sans-serif',
    fontWeight: 600,
    fontSize: 16,
    lineHeight: '28px',
    letterSpacing: 0,
  }
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-10 py-16 md:px-16 min-[992px]:p-0">
      <div className="relative">
        <h2 className="text-center text-black" style={titleStyle}>
          Hey{firstName ? `, ${firstName}` : ''}. Select your subscription level
        </h2>
        <img
          src="/imgs/fun-worth-finding.svg"
          alt=""
          aria-hidden="true"
          className="absolute -right-[100px] top-1/2 -translate-y-1/2 rotate-[15deg] hidden md:block pointer-events-none select-none w-[150px] h-auto"
        />
      </div>

      {/* Digital (free) */}
      <div className="relative z-10">
        <h2 className="text-black" style={titleStyle}>
          Digital Ralph
        </h2>
        <p className="text-black mb-3" style={titleStyle}>
          £FREE
        </p>
        <p className="text-black mb-5" style={bodyStyle}>
          Enjoy access to all our editorial content, buy tickets to one of our
          amazing IRL events and much more. Sounds good, right? Then
          what&apos;s stopping you?
        </p>
        <Button
          label="I want to see Ralph"
          onClick={() => onSelectTier('free')}
          minWidth={230}
        />
      </div>

      {/* Physical (paid) — right aligned */}
      <div className="relative z-10 text-right">
        <h2 className="text-black" style={titleStyle}>
          Physical Ralph
        </h2>
        <p className="text-black mb-3" style={titleStyle}>
          £3 per month
        </p>
        <p className="text-black mb-5" style={bodyStyle}>
          Or for just £3 a month you&apos;ll also get everything Digital Ralph
          has to offer, plus our quarterly fun, glossy mag straight through
          your letterbox. If that wasn&apos;t enough we&apos;ll switch on our
          TV channel for you too.
        </p>
        <div className="flex justify-end">
          <Button
            label="I want to hold Ralph"
            onClick={() => onSelectTier('paid')}
            minWidth={230}
          />
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Slide 3 — Verify your email
// ────────────────────────────────────────────────────────────────────────────

function VerifySlide({
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
      {/* Centred column with the character to the side. */}
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
