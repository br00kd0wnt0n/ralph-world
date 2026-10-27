'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import { LoginForm } from '@/app/login/LoginForm'
import { pickAttribution, withAttribution } from '@/lib/attribution'
import { trackEvent } from '@/lib/gtm-client-init'
import {
  ISSUE9_BUY_COPY,
  ISSUE9_JOIN_COPY,
  ISSUE9_SUBSCRIBER_NOTE,
  type Issue9Mode,
} from '@/lib/issue9'

const LANDING = 'issue9'

interface Issue9ClientProps {
  mode: Issue9Mode
  /** False before ISSUE9_OPENS_AT — the button stays closed. */
  open: boolean
  product: {
    price: string
    imageUrl: string | null
    imageAlt: string | null
    /** The Shopify product description, edited in Shopify. */
    description: string | null
    available: boolean
  } | null
}

// "10.00" → "10", "10.50" stays "10.50" (button reads "Pay today, £10").
function displayPrice(price: string | undefined): string {
  return (price ?? '').replace(/\.00$/, '')
}

const gooper: React.CSSProperties = {
  fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
  fontWeight: 600,
  letterSpacing: 0,
}

export default function Issue9Client({ mode: liveMode, open, product }: Issue9ClientProps) {
  const params = useSearchParams()
  const router = useRouter()
  const { user, tier } = useAuth()

  // ?preview=order|preorder shows the other state's wording for review. The
  // pre-order flag on real orders is still decided server-side by date.
  const preview = params.get('preview')
  const mode: Issue9Mode = preview === 'order' || preview === 'preorder' ? preview : liveMode
  const copy = ISSUE9_BUY_COPY[mode]

  const attribution = useMemo(() => pickAttribution(params), [params])

  // No newsletter opt-in for now (removed 2026-10-15 pending Substack).
  const callbackUrl = withAttribution('/issue9?joined=1', attribution)

  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)

  async function handleBuy() {
    if (buying) return
    setBuying(true)
    setBuyError(null)
    trackEvent('issue9_buy_click', { mode, ...attribution })
    try {
      const res = await fetch('/api/checkout/issue9', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attribution, testToken }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        checkoutUrl?: string
        message?: string
      }
      if (res.ok && data.checkoutUrl) {
        window.location.assign(data.checkoutUrl)
        return
      }
      setBuyError(data.message ?? 'Sorry, we couldn’t start the checkout. Try again.')
    } catch {
      setBuyError('Sorry, we couldn’t start the checkout. Try again.')
    }
    setBuying(false)
  }

  // Back from sign-in (?joined=1): bring the join section into view and
  // record where a brand-new Google account came from. Then drop the one-shot
  // param so a reload doesn't repeat it.
  const joined = params.get('joined') === '1'
  const joinRef = useRef<HTMLElement | null>(null)
  const handledRef = useRef(false)
  useEffect(() => {
    if (!joined) return
    joinRef.current?.scrollIntoView({ block: 'start' })
    if (!user || handledRef.current) return
    handledRef.current = true
    const post = (url: string, body: unknown) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {})
    void post('/api/attribution/signup', { landing: LANDING, attribution })
    router.replace(withAttribution('/issue9', attribution), { scroll: false })
  }, [joined, user, attribution, router])

  // ?test=<token> opens the button early for a test order; the checkout
  // route checks the token, so a wrong one just gets the not-open message.
  const testToken = params.get('test')
  const isOpen = open || Boolean(testToken)
  const canBuy = isOpen && Boolean(product?.available)

  return (
    <motion.div variants={sectionPageVariants} initial="initial" animate="animate">
      <section className="relative" style={{ minHeight: 'calc(100svh - 200px)' }}>
        {/* Planet bg (top) + white fill — same decoration block as /join-ralph */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full planet-bg-cover light:brightness-[0.1373]"
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
            className="absolute bg-white light:bg-[#232323]"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </div>

        {/* Below 992 the heading + buy button come first and the cover
            follows, so the button is in the first screen on a short phone or
            in Instagram's in-app browser whatever the cover's shape. */}
        <div className="relative z-10 pb-12 pt-[70px] min-[992px]:pt-[100px]">
          <div className="max-w-5xl mx-auto px-6">
            {/* 1 — Buy Issue 9 */}
            <div className="grid min-[992px]:grid-cols-[3fr_2fr] gap-5 min-[992px]:gap-12 items-center">
              {/* Full column width: the Shopify image is a wide product mockup on
                  white, so it needs the room and no frame of its own. */}
              <div className="order-2 min-[992px]:order-1 mx-auto w-full max-w-[420px] min-[992px]:max-w-none">
                {product?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.imageAlt ?? 'Ralph magazine Issue 09'}
                    className="block w-full h-auto"
                    fetchPriority="high"
                  />
                ) : (
                  // Placeholder until the hero image / Shopify product lands.
                  <div
                    className="mx-auto flex aspect-[3/4] w-full max-w-[220px] items-center justify-center border-2 border-black bg-ralph-pink text-black text-3xl"
                    style={gooper}
                  >
                    Issue 09
                  </div>
                )}
              </div>

              <div className="order-1 min-[992px]:order-2 text-center min-[992px]:text-left">
                <p className="text-tag uppercase text-ralph-pink mb-2">{copy.eyebrow}</p>
                <h1
                  className="text-black light:text-white mb-3"
                  style={{ ...gooper, fontSize: 36, lineHeight: 1.1 }}
                >
                  {copy.heading}
                </h1>
                {/* Each line of the body is its own paragraph, with a gap
                    between them (the issue line, then the call to action). */}
                <div className="mb-5 space-y-3">
                  {copy.body.split('\n').map((line) => (
                    <p key={line} className="text-body text-black light:text-white">
                      {line}
                    </p>
                  ))}
                </div>
                <div className="flex justify-center min-[992px]:justify-start">
                  <Button
                    label={
                      !isOpen
                        ? copy.notOpenYet
                        : !canBuy
                          ? copy.unavailable
                        : buying
                          ? 'One sec…'
                          : copy.cta.replace('{price}', displayPrice(product?.price))
                    }
                    onClick={handleBuy}
                    disabled={!canBuy || buying}
                    filled
                    minWidth={260}
                  />
                </div>
                {canBuy && (
                  <p className="text-body-sm text-black light:text-white mt-4">{copy.note}</p>
                )}
                {tier === 'paid' && (
                  <p className="text-body-sm text-black light:text-white mt-3">
                    {ISSUE9_SUBSCRIBER_NOTE}
                  </p>
                )}
                {buyError && (
                  <p className="text-sm text-red-600 mt-3" role="alert">
                    {buyError}
                  </p>
                )}
                {/* What's in the issue, from the Shopify product description
                    (same styling as the shop's product pages). Sits below the
                    button so the button stays in the first screen on phones. */}
                {product?.description && (
                  <p
                    className="mt-6 text-left text-black light:text-white whitespace-pre-line"
                    style={{
                      fontFamily: 'var(--font-body), Arial, sans-serif',
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: '23px',
                      letterSpacing: 0,
                    }}
                  >
                    {product.description}
                  </p>
                )}
              </div>
            </div>

            {/* 2 — Join Ralph World */}
            <section
              ref={joinRef}
              id="join"
              className="mt-12 min-[992px]:mt-20 scroll-mt-28 border-t-2 border-black light:border-white pt-10"
            >
              <div className="grid min-[992px]:grid-cols-2 gap-8 min-[992px]:gap-16 items-start">
                <div className="text-center min-[992px]:text-left">
                  <h2
                    className="text-black light:text-white mb-3"
                    style={{ ...gooper, fontSize: 30, lineHeight: 1.1 }}
                  >
                    {user ? ISSUE9_JOIN_COPY.signedInHeading : ISSUE9_JOIN_COPY.heading}
                  </h2>
                  <p className="text-body text-black light:text-white">
                    {user ? ISSUE9_JOIN_COPY.signedInBody : ISSUE9_JOIN_COPY.body}
                  </p>
                  {user && (
                    <div className="mt-6 flex justify-center min-[992px]:justify-start">
                      <Button label="Read the magazine" href="/magazine" minWidth={230} />
                    </div>
                  )}
                </div>

                {!user && (
                  <div className="w-full max-w-[408px] mx-auto min-[992px]:max-w-none min-[992px]:mx-0">
                    <LoginForm
                      bare
                      callbackUrl={callbackUrl}
                      initialMode="signup"
                      banner={null}
                      googleAction={async () => {
                        trackEvent('issue9_join_click', { method: 'google', ...attribution })
                        await signIn('google', { callbackUrl })
                      }}
                      signupHiddenFields={{ landing: LANDING, ...attribution }}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* The global footer is hidden on this route — legal links only. */}
            <p className="mt-12 text-center text-xs text-black/60 light:text-white/60">
              <Link href="/legal/terms" className="underline hover:opacity-70 transition-opacity">
                Terms
              </Link>
              {' · '}
              <Link href="/legal/privacy" className="underline hover:opacity-70 transition-opacity">
                Privacy
              </Link>
              {' · '}
              <Link href="/legal/cookies" className="underline hover:opacity-70 transition-opacity">
                Cookies
              </Link>
            </p>
          </div>
        </div>
      </section>
    </motion.div>
  )
}
