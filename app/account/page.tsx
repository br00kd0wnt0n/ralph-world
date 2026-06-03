import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth, type SessionWithProfile } from '@/lib/auth'
import Footer from '@/components/layout/Footer'
import AccountPreferences from '@/components/account/AccountPreferences'
import SignOutButton from '@/components/account/SignOutButton'
import { startSubscriptionCheckout, openBillingPortal } from './actions'

export const dynamic = 'force-dynamic'

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
    <>
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-block text-sm text-secondary hover:text-primary transition-colors mb-8"
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
              className="w-16 h-16 rounded-full border-2 border-ralph-pink/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-ralph-pink/30 bg-surface flex items-center justify-center text-xl font-bold text-primary">
              {displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-[family-name:var(--font-display)] truncate">
              {displayName}
            </h1>
            <p className="text-secondary text-sm truncate">
              {session.user.email}
            </p>
          </div>
        </div>

        {upgradeError && (
          <div className="bg-ralph-pink/10 border border-ralph-pink/40 rounded-2xl p-4 mb-6 text-sm text-primary">
            We couldn&apos;t start your checkout. Please try again, or{' '}
            <a
              href="mailto:hello@ralph.world"
              className="underline hover:text-ralph-pink transition-colors"
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
              className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                tier === 'paid'
                  ? 'bg-ralph-pink/20 text-ralph-pink'
                  : tier === 'free'
                  ? 'bg-ralph-teal/20 text-ralph-teal'
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {tier ?? 'guest'}
            </span>
            {subscriptionStatus === 'past_due' && (
              <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                payment failed
              </span>
            )}
          </div>
          <p className="text-primary text-sm mb-2">
            {tier === 'paid'
              ? 'You have full access: magazine, TV, events, shop, and lab. Thanks for backing us.'
              : tier === 'free'
              ? 'You have access to magazine, TV, and events. Upgrade for the quarterly print mag and premium content.'
              : tier === 'guest'
              ? 'Verify your email to unlock free-tier perks: TV, members-only articles, and event RSVPs.'
              : 'Get started to unlock the full Ralph experience.'}
          </p>
          {tier === 'paid' && subscriptionPeriodEnd && (
            <p className="text-secondary text-xs mb-4">
              {subscriptionStatus === 'past_due'
                ? `Last payment attempt failed. Stripe will retry; update your card if needed. Current period ends ${formatPeriodEnd(subscriptionPeriodEnd)}.`
                : `Next billing date: ${formatPeriodEnd(subscriptionPeriodEnd)}`}
            </p>
          )}

          {tier === 'paid' ? (
            <form action={openBillingPortal}>
              <button
                type="submit"
                className="inline-block rounded-full border border-border px-5 py-2 text-primary font-medium text-sm hover:border-secondary transition-colors"
              >
                Manage subscription
              </button>
            </form>
          ) : (
            <form action={startSubscriptionCheckout}>
              <button
                type="submit"
                className="inline-block rounded-full bg-ralph-pink text-white px-5 py-2 font-medium text-sm hover:bg-ralph-pink/90 transition-colors"
              >
                Upgrade to paid &mdash; £3/month
              </button>
            </form>
          )}
        </Section>

        {/* Events — RSVPs land here once Phase 2 ships them. */}
        <Section title="Your events">
          <p className="text-secondary text-sm">
            RSVPs to Ralph events will show up here. None yet — keep an eye on{' '}
            <Link href="/events" className="underline hover:text-ralph-pink transition-colors">
              the events page
            </Link>
            .
          </p>
        </Section>

        {/* Shipping address — mirror of Shopify once a purchase is made (Phase 2). */}
        <Section title="Shipping address">
          {shippingAddress ? (
            <pre className="text-primary text-sm whitespace-pre-wrap font-sans">
              {formatShippingAddress(shippingAddress)}
            </pre>
          ) : (
            <p className="text-secondary text-sm">
              We&apos;ll show your shipping address here once you&apos;ve made a
              purchase — it mirrors the address on file with Shopify.
            </p>
          )}
        </Section>

        {/* Mailing preferences — Phase 1 view-only. Toggle lands with Mailchimp sync (Phase 4). */}
        <Section title="Mailing preferences">
          <div className="flex items-center justify-between">
            <p className="text-primary text-sm">
              Ralph newsletter
            </p>
            <span
              className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                marketingOptIn
                  ? 'bg-ralph-teal/20 text-ralph-teal'
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {marketingOptIn ? 'subscribed' : 'not subscribed'}
            </span>
          </div>
          <p className="text-secondary text-xs mt-3">
            You can subscribe or unsubscribe via any newsletter we send you. A
            toggle here is coming.
          </p>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <AccountPreferences
            initialLanguage={session.profile?.languagePreference ?? 'en'}
            initialTheme={session.profile?.themePreference ?? 'cosy-dynamics'}
          />
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone" tone="muted">
          <p className="text-secondary text-sm mb-4">
            Sign out on this device, or request we delete your account and
            associated data.
          </p>
          <div className="flex flex-wrap gap-3">
            <SignOutButton />
            <a
              href={`mailto:hello@ralph.world?subject=Delete%20my%20Ralph%20account&body=Please%20delete%20the%20account%20and%20associated%20data%20for%20${encodeURIComponent(
                session.user.email ?? ''
              )}.`}
              className="rounded-full border border-red-400/40 px-5 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
            >
              Request account deletion
            </a>
          </div>
        </Section>
      </section>
      <Footer variant="dark" />
    </>
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
  tone,
}: {
  title: string
  children: React.ReactNode
  tone?: 'muted'
}) {
  return (
    <div
      className={`rounded-2xl border p-6 mb-6 ${
        tone === 'muted'
          ? 'bg-background border-border/50'
          : 'bg-surface border-border'
      }`}
    >
      <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
        {title}
      </h2>
      {children}
    </div>
  )
}
