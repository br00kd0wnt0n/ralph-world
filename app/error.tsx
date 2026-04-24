'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Per-route error boundary. Any component throw inside a route renders
// this fallback — the nav, footer, and rest of the page shell stay put.
// `global-error.tsx` above it handles layout-level crashes.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 font-[family-name:var(--font-display)]">
          Something broke.
        </h1>
        <p className="text-secondary text-sm mb-6">
          We hit a snag loading this page. Try again, or head back to the
          homepage.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="rounded-full bg-ralph-pink text-white px-5 py-2.5 text-sm font-medium hover:bg-ralph-pink/90 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-border text-secondary hover:text-primary px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Go home
          </a>
        </div>
        {error.digest && (
          <p className="mt-8 text-[10px] text-muted">Ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
