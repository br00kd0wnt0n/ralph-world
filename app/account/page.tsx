import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth, type SessionWithProfile } from '@/lib/auth'
import Footer from '@/components/layout/Footer'
import { signOut } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const session = (await auth()) as SessionWithProfile | null

  if (!session?.user) {
    redirect('/login?callbackUrl=/account')
  }

  const tier = session.profile?.subscriptionStatus ?? null

  return (
    <>
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 font-[family-name:var(--font-display)]">
          Your account
        </h1>
        <p className="text-secondary text-sm mb-8">
          Signed in as {session.user.email}
        </p>

        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted uppercase tracking-widest">
              Subscription
            </span>
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
          <p className="text-primary text-sm">
            {tier === 'paid'
              ? 'You have full access: magazine, TV, events, shop, and lab.'
              : tier === 'free'
              ? 'You have access to magazine, TV, and events. Upgrade for the quarterly print mag and premium content.'
              : 'Get started to unlock the full Ralph experience.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-secondary hover:text-primary transition-colors"
          >
            &larr; Back to Ralph.World
          </Link>
          <div className="flex-1" />
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/' })
            }}
          >
            <button
              type="submit"
              className="text-sm text-secondary hover:text-ralph-pink transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
      <Footer variant="dark" />
    </>
  )
}
