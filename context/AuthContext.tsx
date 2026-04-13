'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export type SubscriptionStatus = null | 'free' | 'paid'

interface Profile {
  id: string
  email: string
  display_name: string | null
  subscription_status: SubscriptionStatus
  role: string
  theme_preference: string | null
  language_preference: string | null
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  subscriptionStatus: SubscriptionStatus
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseBrowser()

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data as Profile | null)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      }
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = getSupabaseBrowser()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const subscriptionStatus: SubscriptionStatus =
    profile?.subscription_status ?? null

  return (
    <AuthContext.Provider
      value={{ user, profile, subscriptionStatus, isLoading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
