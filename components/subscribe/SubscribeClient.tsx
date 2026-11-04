'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import { withAttribution, type Attribution } from '@/lib/attribution'
import { trackEvent } from '@/lib/gtm-client-init'
import type { LatestMagazine } from '@/lib/data/latest-magazine'
import { SUBSCRIBE_COPY, type MemberState } from './copy'

const gooper: React.CSSProperties = {
  fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
  fontWeight: 600,
  letterSpacing: 0,
}

interface Props {
  latest: LatestMagazine | null
  attribution: Attribution
}

export default function SubscribeClient({ latest, attribution }: Props) {
  const { user, tier } = useAuth()
  const state: MemberState = !user ? 'guest' : tier === 'paid' ? 'paid' : 'member'

  // Guests go into the sign-up flow with the tier already chosen; the
  // utm_* tags and from=subscribe ride along for attribution.
  const joinHref = (t: 'free' | 'paid') =>
    withAttribution(`/join-ralph?tier=${t}&from=subscribe`, attribution)

  function track(t: 'free' | 'paid') {
    trackEvent('subscribe_cta_click', { tier: t, state, ...attribution })
  }

  const free = SUBSCRIBE_COPY.free
  const paid = SUBSCRIBE_COPY.paid

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

        <div className="relative z-10 pb-16 pt-[70px] min-[992px]:pt-[100px]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            {/* Intro: heading first on phones so the tiers stay close to the top;
                the cover sits beside it from 768px. */}
            <div className="grid md:grid-cols-[2fr_3fr] gap-6 md:gap-12 items-center">
              <div className="order-2 md:order-1 mx-auto w-full max-w-[150px] md:max-w-[300px]">
                {latest ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={latest.imageUrl}
                    alt={`${latest.title} cover`}
                    className="block w-full h-auto"
                    fetchPriority="high"
                  />
                ) : null}
              </div>
              <div className="order-1 md:order-2 text-center md:text-left">
                {latest && (
                  <p className="text-tag uppercase text-ralph-pink mb-2">
                    Out now: {latest.title}
                  </p>
                )}
                <h1
                  className="text-black light:text-white mb-3"
                  style={{ ...gooper, fontSize: 36, lineHeight: 1.1 }}
                >
                  {SUBSCRIBE_COPY.heading}
                </h1>
                <p className="text-body text-black light:text-white">
                  {SUBSCRIBE_COPY.intro[state]}
                </p>
              </div>
            </div>

            {/* Tiers */}
            <div className="mt-10 md:mt-14 grid md:grid-cols-2 gap-8 md:gap-10 items-stretch">
              <TierCard
                name={free.name}
                price={free.price}
                includes={free.includes}
                badge={state === 'member' ? 'You’re a member' : null}
                cta={
                  state === 'guest' ? (
                    <Button
                      label={free.cta}
                      href={joinHref('free')}
                      onClick={() => track('free')}
                      minWidth={230}
                    />
                  ) : (
                    <Button label="Read the magazine" href="/magazine" minWidth={230} />
                  )
                }
              />
              <TierCard
                name={paid.name}
                price={paid.price}
                includes={paid.includes}
                highlight
                badge={state === 'paid' ? 'You’re subscribed' : null}
                smallprint={paid.smallprint}
                cta={
                  state === 'guest' ? (
                    <Button
                      label={paid.cta}
                      href={joinHref('paid')}
                      onClick={() => track('paid')}
                      filled
                      minWidth={230}
                    />
                  ) : state === 'member' ? (
                    // Signed-in free member: straight to Stripe. A full page
                    // load, since the target is a route handler, not a page.
                    <Button
                      label={paid.upgradeCta}
                      onClick={() => {
                        track('paid')
                        window.location.href = '/api/account/upgrade'
                      }}
                      filled
                      minWidth={230}
                    />
                  ) : (
                    <Button label="Your account" href="/account" minWidth={230} />
                  )
                }
              />
            </div>

            {state === 'guest' && (
              <p className="mt-10 text-center text-body-sm text-black light:text-white">
                Already a member?{' '}
                <Link
                  href="/login?callbackUrl=/subscribe"
                  className="underline hover:opacity-70 transition-opacity"
                >
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  )
}

function TierCard({
  name,
  price,
  includes,
  cta,
  badge,
  smallprint,
  highlight = false,
}: {
  name: string
  price: string
  includes: readonly string[]
  cta: React.ReactNode
  badge: string | null
  smallprint?: string
  highlight?: boolean
}) {
  return (
    // Offset shadow like the brand Button: pink behind the paid card.
    <div className="relative">
      <div
        className={`absolute inset-0 translate-x-2 translate-y-2 ${highlight ? 'bg-ralph-pink' : 'bg-black light:bg-white'}`}
        aria-hidden="true"
      />
      <div className="relative h-full flex flex-col border-2 border-black light:border-white bg-white light:bg-[#232323] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-black light:text-white" style={{ ...gooper, fontSize: 26, lineHeight: 1.1 }}>
            {name}
          </h2>
          {badge && (
            <span className="shrink-0 text-tag uppercase px-2.5 py-1 rounded-full bg-ralph-teal text-black">
              {badge}
            </span>
          )}
        </div>
        <p className="text-black light:text-white mb-5" style={{ ...gooper, fontSize: 22, lineHeight: 1.1 }}>
          {price}
        </p>
        <ul className="mb-8 space-y-3 flex-1">
          {includes.map((item) => (
            <li key={item} className="flex gap-3 text-body text-black light:text-white">
              <span aria-hidden="true" className="text-ralph-pink font-bold">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div>{cta}</div>
        {smallprint && (
          <p className="mt-5 text-body-sm text-black/70 light:text-white/70">{smallprint}</p>
        )}
      </div>
    </div>
  )
}
