import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth, signOut, type SessionWithProfile } from '@/lib/auth'
import Footer from '@/components/layout/Footer'
import AccountPreferences from '@/components/account/AccountPreferences'

export const dynamic = 'force-dynamic'

interface AccountPageProps {
  searchParams: Promise<{ upgrade?: string }>
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = (await auth()) as SessionWithProfile | null

  if (!session?.user) {
    redirect('/login?callbackUrl=/account')
  }

  const tier = session.profile?.subscriptionStatus ?? null
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
          <div className="flex items-center justify-between mb-3">
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
          </div>
          <p className="text-primary text-sm mb-4">
            {tier === 'paid'
              ? 'You have full access: magazine, TV, events, shop, and lab. Thanks for backing us.'
              : tier === 'free'
              ? 'You have access to magazine, TV, and events. Upgrade for the quarterly print mag and premium content.'
              : 'Get started to unlock the full Ralph experience.'}
          </p>

          {tier === 'paid' ? (
            // No Shopify customer portal wired yet — mailto is the escape
            // hatch until we build /account/billing against Shopify's
            // Customer Account API.
            <a
              href="mailto:hello@ralph.world?subject=Manage%20my%20Ralph%20subscription"
              className="inline-block rounded-full border border-border px-5 py-2 text-primary font-medium text-sm hover:border-secondary transition-colors"
            >
              Manage subscription
            </a>
          ) : (
            <a
              href="/api/account/upgrade"
              className="inline-block rounded-full bg-ralph-pink text-white px-5 py-2 font-medium text-sm hover:bg-ralph-pink/90 transition-colors"
            >
              Upgrade to paid &mdash; £3/month
            </a>
          )}
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
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/' })
              }}
            >
              <button
                type="submit"
                className="rounded-full border border-border px-5 py-2 text-sm text-secondary hover:text-primary hover:border-secondary transition-colors"
              >
                Sign out
              </button>
            </form>
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
