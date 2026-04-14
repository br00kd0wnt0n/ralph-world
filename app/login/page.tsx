import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/auth'

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

/**
 * Only accept same-origin relative paths as a callback.
 * Blocks absolute URLs (open-redirect), protocol-relative, and anything suspicious.
 */
function safeCallback(raw: string | undefined): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  // Reject any URL-ish strings that could trick the browser
  if (raw.includes('://') || raw.includes('\\')) return '/'
  return raw
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth()
  const { callbackUrl: rawCallback, error } = await searchParams
  const callbackUrl = safeCallback(rawCallback)

  // If already signed in, bounce to destination (now guaranteed same-origin)
  if (session?.user) {
    redirect(callbackUrl)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative z-10">
      <div className="max-w-sm w-full">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/ralph-logo.png"
            alt="Ralph.World"
            width={88}
            height={88}
            className="rounded-full mb-6"
            priority
          />
          <h1 className="text-3xl font-bold text-primary mb-2 text-center">
            Sign in to Ralph
          </h1>
          <p className="text-secondary text-sm text-center">
            Pop culture for the fun of it.
          </p>
        </div>

        <div className="bg-surface/80 backdrop-blur border border-border/50 rounded-2xl p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/40 p-3 text-sm text-red-300">
              Something went wrong. Please try again.
            </div>
          )}

          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: callbackUrl })
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 rounded-full bg-white py-3 text-black font-medium hover:bg-white/90 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="text-muted text-xs mt-6 text-center">
            By signing in, you agree to Ralph&apos;s Terms and Privacy Policy.
          </p>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-secondary hover:text-primary transition-colors"
          >
            &larr; Back to Ralph.World
          </Link>
        </div>
      </div>
    </div>
  )
}
