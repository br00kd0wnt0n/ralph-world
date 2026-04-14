import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { getDb } from '@/lib/db'
import {
  profiles,
  users,
  accounts,
  sessions,
  verificationTokens,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: getDrizzleAdapter(),
  providers: [Google],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string

        // Attach profile data
        try {
          const db = getDb()
          const [profile] = await db
            .select()
            .from(profiles)
            .where(eq(profiles.id, token.userId as string))
            .limit(1)

          if (profile) {
            ;(session as SessionWithProfile).profile = {
              subscriptionStatus: profile.subscriptionStatus as
                | null
                | 'free'
                | 'paid',
              role: profile.role,
              themePreference: profile.themePreference,
              languagePreference: profile.languagePreference,
            }
          }
        } catch {
          // DB not available — session still works, just no profile
        }
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create profile row when a new user signs up
      if (!user.id) return
      try {
        const db = getDb()
        await db.insert(profiles).values({
          id: user.id,
          displayName: user.name,
          subscriptionStatus: 'free',
        })
      } catch {
        // Profile may already exist
      }
    },
  },
})

function getDrizzleAdapter() {
  try {
    return DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    })
  } catch {
    // DB not configured yet — return undefined so app still boots
    return undefined as unknown as ReturnType<typeof DrizzleAdapter>
  }
}

export interface SessionProfile {
  subscriptionStatus: null | 'free' | 'paid'
  role: string | null
  themePreference: string | null
  languagePreference: string | null
}

export interface SessionWithProfile {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null }
  profile?: SessionProfile
  expires: string
}
