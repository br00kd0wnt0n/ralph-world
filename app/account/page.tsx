import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth, type SessionWithProfile } from '@/lib/auth'
import PrivacyControls from '@/components/account/PrivacyControls'
import SignOutButton from '@/components/account/SignOutButton'
import { startSubscriptionCheckout, openBillingPortal } from './actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
}

interface AccountPageProps {
  searchParams: Promise<{ upgrade?: string }>
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = (await auth()) as SessionWithProfile | null

  if (!session?.user) {
    redirect('/login?callbackUrl=/account')
  }

  // Prefer the RW2.0 tier column; fall back to legacy subscription_status
  // until Phase 4 cutover (SOW §1.1). Guest is the implicit default for
  // signed-in-but-unprovisioned users.
  const tier =
    session.profile?.tier ??
    session.profile?.subscriptionStatus ??
    'free'
  const marketingOptIn = session.profile?.marketingOptIn ?? false
  const shippingAddress = session.profile?.shippingAddressCached ?? null
  const subscriptionStatus = session.profile?.subscriptionStatus ?? null
  const subscriptionPeriodEnd = session.profile?.subscriptionCurrentPeriodEnd ?? null
  const cancelAtPeriodEnd = session.profile?.subscriptionCancelAtPeriodEnd ?? false
  const { upgrade } = await searchParams

  // Free/guest users coming back from SubscribeModal's OAuth flow get sent
  // straight into Shopify checkout. Paid users skip — already subscribed.
  if (upgrade === 'paid' && tier !== 'paid') {
    redirect('/api/account/upgrade')
  }

  const upgradeError = upgrade === 'error'

  const displayName = session.user.name || session.user.email?.split('@')[0]
  const avatarUrl = session.user.image

  return (
    <section className="px-6 py-16">
        {/* Solid white sheet on the dark canvas — matches the legal pages. */}
        <div className="max-w-2xl mx-auto bg-white text-black rounded-2xl shadow-xl px-6 sm:px-10 py-10">
          <Link
            href="/"
            className="inline-block text-sm font-semibold text-black/60 hover:text-black transition-colors mb-8"
          >
            &larr; Back to Ralph.World
          </Link>

          {/* Profile header */}
          <div className="flex items-center gap-4 mb-10">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName ?? 'avatar'}
                className="w-16 h-16 rounded-full border-2 border-ralph-pink/40"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full border-2 border-ralph-pink/40 bg-black/[0.04] flex items-center justify-center text-xl text-black"
                style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
              >
                {displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <h1
                className="text-2xl md:text-3xl text-black truncate"
                style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600, lineHeight: 1 }}
              >
                {displayName}
              </h1>
              <p className="text-black/60 text-sm font-semibold truncate">
                {session.user.email}
              </p>
            </div>
          </div>

          {upgradeError && (
            <div className="bg-ralph-pink/10 border border-ralph-pink/40 rounded-2xl p-4 mb-6 text-sm font-semibold text-black">
              We couldn&apos;t start your checkout. Please try again, or{' '}
              <a
                href="mailto:hello@ralph.world"
                className="underline text-ralph-pink hover:opacity-80 transition-opacity"
              >
                drop us a line
              </a>
              .
            </div>
          )}

          {/* Subscription */}
          <Section title="Subscription">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                  tier === 'paid'
                    ? 'bg-ralph-pink text-black'
                    : tier === 'free'
                    ? 'bg-ralph-teal text-black'
                    : 'bg-black/10 text-black/60'
                }`}
              >
                {tier ?? 'guest'}
              </span>
              {subscriptionStatus === 'past_due' && (
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                  payment failed
                </span>
              )}
            </div>
            <p className="text-black text-sm font-semibold mb-2">
              {tier === 'paid'
                ? 'You have full access: magazine, TV, events, shop, and lab. Thanks for backing us.'
                : tier === 'free'
                ? 'You have access to magazine, TV, and events. Upgrade for the quarterly print mag and premium content.'
                : tier === 'guest'
                ? 'Verify your email to unlock free-tier perks: TV, members-only articles, and event RSVPs.'
                : 'Get started to unlock the full Ralph experience.'}
            </p>
            {tier === 'paid' && subscriptionPeriodEnd && (
              <p className="text-black/60 text-xs font-semibold mb-4">
                {subscriptionStatus === 'past_due'
                  ? `Last payment attempt failed. Stripe will retry; update your card if needed. Current period ends ${formatPeriodEnd(subscriptionPeriodEnd)}.`
                  : cancelAtPeriodEnd
                  ? `Cancelled — access continues until ${formatPeriodEnd(subscriptionPeriodEnd)}.`
                  : `Next billing date: ${formatPeriodEnd(subscriptionPeriodEnd)}`}
              </p>
            )}

            {tier === 'paid' ? (
              <form action={openBillingPortal}>
                <button
                  type="submit"
                  className="inline-block rounded-full border-2 border-black/30 px-5 py-2 text-black text-sm hover:border-black transition-colors"
                  style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
                >
                  Manage subscription
                </button>
              </form>
            ) : (
              <form action={startSubscriptionCheckout}>
                <button
                  type="submit"
                  className="inline-block rounded-full bg-ralph-pink text-black px-5 py-2 text-sm hover:bg-ralph-pink/90 transition-colors"
                  style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
                >
                  Upgrade to paid &mdash; £3/month
                </button>
              </form>
            )}
          </Section>

          {/* Events — RSVPs land here once Phase 2 ships them. */}
          <Section title="Your events">
            <p className="text-black/70 text-sm font-semibold">
              RSVPs to Ralph events will show up here. None yet — keep an eye on{' '}
              <Link href="/events" className="underline text-ralph-pink hover:opacity-80 transition-opacity">
                the events page
              </Link>
              .
            </p>
          </Section>

          {/* Shipping address — mirror of Shopify once a purchase is made (Phase 2). */}
          <Section title="Shipping address">
            {shippingAddress ? (
              <pre className="text-black text-sm font-semibold whitespace-pre-wrap font-sans">
                {formatShippingAddress(shippingAddress)}
              </pre>
            ) : (
              <p className="text-black/70 text-sm font-semibold">
                We&apos;ll show your shipping address here once you&apos;ve made a
                purchase — it mirrors the address on file with Shopify.
              </p>
            )}
          </Section>

          {/* Privacy & data rights — Task 3.10. Marketing toggle, DSAR export,
              account deletion. Replaces the previous view-only mailing
              preferences + 'email us to delete' link. */}
          <Section title="Privacy &amp; data">
            <PrivacyControls initialMarketingOptIn={marketingOptIn} />
          </Section>

          {/* Preferences (theme + language) hidden for launch — restore when
              themes / i18n ship.
          <Section title="Preferences">
            <AccountPreferences
              initialLanguage={session.profile?.languagePreference ?? 'en'}
            />
          </Section>
          */}

          {/* Sign out */}
          <Section title="Sign out">
            <p className="text-black/70 text-sm font-semibold mb-4">
              Sign out on this device.
            </p>
            <SignOutButton />
          </Section>
        </div>
    </section>
  )
}

/**
 * Format a subscription period-end Date as a friendly "next billing
 * date" — UK English, plain. Returns the ISO date if we somehow get
 * a non-Date value (defensive — session callback should pass a Date).
 */
function formatPeriodEnd(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Render a cached Shopify shipping address as plain text. The shape we get
 * back is whatever Shopify's REST API returns under `default_address` —
 * keep this tolerant: pick the standard fields if present, otherwise fall
 * back to JSON so we surface SOMETHING rather than nothing.
 */
function formatShippingAddress(addr: unknown): string {
  if (!addr || typeof addr !== 'object') return ''
  const a = addr as Record<string, unknown>
  const get = (k: string) => (typeof a[k] === 'string' ? (a[k] as string) : '')
  const lines = [
    [get('first_name'), get('last_name')].filter(Boolean).join(' '),
    get('company'),
    get('address1'),
    get('address2'),
    [get('city'), get('province'), get('zip')].filter(Boolean).join(', '),
    get('country'),
  ].filter(Boolean)
  return lines.length ? lines.join('\n') : JSON.stringify(addr, null, 2)
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="py-7 border-t border-black/10 first:border-t-0 first:pt-0">
      <h2
        className="text-black mb-4"
        style={{
          fontFamily: "'Gooper Trial', serif",
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}
