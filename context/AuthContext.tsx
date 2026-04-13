'use client'

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { SessionProvider, useSession } from 'next-auth/react'
import type { SessionProfile } from '@/lib/auth'

export type SubscriptionStatus = null | 'free' | 'paid'

interface AuthContextValue {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null } | null
  profile: SessionProfile | null
  subscriptionStatus: SubscriptionStatus
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function AuthInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  const user = session?.user?.id ? session.user as AuthContextValue['user'] : null
  const profile = (session as { profile?: SessionProfile } | null)?.profile ?? null
  const subscriptionStatus: SubscriptionStatus = profile?.subscriptionStatus ?? null
  const isLoading = status === 'loading'

  return (
    <AuthContext.Provider value={{ user, profile, subscriptionStatus, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthInner>{children}</AuthInner>
    </SessionProvider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
