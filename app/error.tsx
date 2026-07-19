'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import Button from '@/components/ui/Button'

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
        <h1
          className="text-4xl md:text-5xl text-white mb-4"
          style={{ fontFamily: "var(--font-intro, 'Gooper Trial'), serif", fontWeight: 600 }}
        >
          Something broke.
        </h1>
        <p className="text-white/70 text-sm mb-8">
          We hit a snag loading this page. Try again, or head back to the
          homepage.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Button label="Try again" onClick={() => reset()} filled />
          <Button label="Go home" href="/" />
        </div>
        {error.digest && (
          <p className="mt-8 text-[10px] text-muted">Ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
