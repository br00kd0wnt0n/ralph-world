import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
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
import { logSignupConsents } from '@/lib/consent'
import { verifyPassword } from '@/lib/auth/passwords'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: getDrizzleAdapter(),
  providers: [
    Google,
    Credentials({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // Task 1.3: signin blocked until email is verified. Signup itself
      // is handled by /api/auth/signup → see lib/auth/signup.ts.
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string'
            ? credentials.email.trim().toLowerCase()
            : null
        const password =
          typeof credentials?.password === 'string' ? credentials.password : null
        if (!email || !password) return null

        const db = getDb()
        const [row] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            image: users.image,
            emailVerified: users.emailVerified,
            passwordHash: users.passwordHash,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
        if (!row || !row.passwordHash) return null
        const ok = await verifyPassword(password, row.passwordHash)
        if (!ok) return null
        if (!row.emailVerified) {
          // Surface a distinguishable error code so the login page can
          // offer "resend verification email" instead of a generic
          // "bad credentials" message.
          throw new Error('EmailNotVerified')
        }
        return {
          id: row.id,
          email: row.email,
          name: row.name,
          image: row.image,
        }
      },
    }),
  ],
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
              // RW2.0 tier (Task 1.1). Source of truth post-migration.
              tier: (profile.tier ?? null) as null | 'guest' | 'free' | 'paid',
              role: profile.role,
              themePreference: profile.themePreference,
              languagePreference: profile.languagePreference,
              marketingOptIn: profile.marketingOptIn ?? false,
              shippingAddressCached: profile.shippingAddressCached ?? null,
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
      // Auto-create profile row when a new user signs up.
      if (!user.id) return
      try {
        const db = getDb()
        await db.insert(profiles).values({
          id: user.id,
          displayName: user.name,
          // RW2.0 entitlement column (Task 1.1). Signed-in user → 'free'.
          tier: 'free',
          // Deprecated legacy column — kept until Phase 4 cutover (SOW §1.1).
          subscriptionStatus: 'free',
        })
      } catch {
        // Profile may already exist (idempotent re-signup, race).
      }
      // Capture terms + privacy consent at signup. Per SOW §1.8 the
      // signup creates 2 consent_log rows; helper handles failure
      // silently so audit lag never breaks signup.
      await logSignupConsents(user.id)
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
  } catch (error) {
    // Log — build-time page data collection runs without env vars, so we can't throw.
    // At real runtime this will cause auth requests to fail visibly in logs.
    console.error('[auth] Drizzle adapter failed to initialise:', error)
    return undefined as unknown as ReturnType<typeof DrizzleAdapter>
  }
}

export interface SessionProfile {
  subscriptionStatus: null | 'free' | 'paid'
  /** RW2.0 tier — source of truth post-Phase 1. */
  tier: null | 'guest' | 'free' | 'paid'
  role: string | null
  themePreference: string | null
  languagePreference: string | null
  marketingOptIn: boolean
  shippingAddressCached: unknown | null
}

export interface SessionWithProfile {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null }
  profile?: SessionProfile
  expires: string
}
