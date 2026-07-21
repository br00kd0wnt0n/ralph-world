'use client'

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { SessionProvider, useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import type { SessionProfile } from '@/lib/auth'

/**
 * Subscription lifecycle status — widened in Phase 2 to accept Stripe
 * values ('active' | 'past_due' | 'canceled' | 'unpaid' | …) alongside
 * the legacy Shopify Subscriptions values ('free' | 'paid'). Consumers
 * gating paid content should now check `tier === 'paid'` instead — see
 * Tier below.
 */
export type SubscriptionStatus = string | null

/** Effective entitlement tier — source of truth post-Phase 1. */
export type Tier = null | 'guest' | 'free' | 'paid'

interface AuthContextValue {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null } | null
  profile: SessionProfile | null
  /**
   * Effective tier — `'paid'` for active Stripe subs AND legacy
   * paid-Shopify subs. Use this for gating, not `subscriptionStatus`.
   */
  tier: Tier
  subscriptionStatus: SubscriptionStatus
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function AuthInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  const user = session?.user?.id ? session.user as AuthContextValue['user'] : null
  const profile = (session as { profile?: SessionProfile } | null)?.profile ?? null
  const subscriptionStatus: SubscriptionStatus = profile?.subscriptionStatus ?? null
  // Tier is the canonical gate. Fall back to legacy subscriptionStatus
  // for any pre-Phase-1 profile rows that haven't been backfilled yet.
  const tier: Tier =
    (profile?.tier ?? null) ??
    (subscriptionStatus === 'paid' ? 'paid' : subscriptionStatus === 'free' ? 'free' : null)
  const isLoading = status === 'loading'

  return (
    <AuthContext.Provider value={{ user, profile, tier, subscriptionStatus, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({
  children,
  session,
}: {
  children: ReactNode
  /** Session pre-fetched on the server via auth() in the root layout.
   *  Without this, useSession() starts in 'loading' with a null session
   *  and only reconciles after a /api/auth/session round-trip — so the
   *  header shows the guest state for a beat after login, and never
   *  updates within a single client navigation if the fetch stalls. */
  session?: Session | null
}) {
  return (
    <SessionProvider session={session}>
      <AuthInner>{children}</AuthInner>
    </SessionProvider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
