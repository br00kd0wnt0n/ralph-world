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
          className="text-4xl md:text-5xl text-white light:text-black mb-4"
          style={{ fontFamily: "var(--font-intro, 'Gooper Trial'), serif", fontWeight: 600 }}
        >
          Something broke.
        </h1>
        <p className="text-white/70 light:text-black/70 text-sm mb-8">
          We hit a snag loading this page. Try again, or head back to the
          homepage.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          {/* Try again — shadow button, theme-flipped via classes (which
              <Button>'s inline styles can't do): pink fill in dark mode,
              off-black fill + white text in light mode. */}
          <div className="relative inline-block" style={{ width: 'fit-content' }}>
            <div
              aria-hidden="true"
              className="absolute bg-black pointer-events-none"
              style={{ top: 4, left: 4, width: '100%', height: '100%' }}
            />
            <button
              type="button"
              onClick={() => reset()}
              className="btn-press relative inline-flex items-center justify-center border-2 border-black bg-ralph-pink light:bg-[#232323] text-black light:text-white"
              style={{
                height: 43,
                minWidth: 170,
                paddingLeft: 12,
                paddingRight: 12,
                fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                fontWeight: 600,
                fontSize: 16,
                lineHeight: 1,
                transition: 'transform 0.15s ease',
              }}
            >
              Try again
            </button>
          </div>
          <Button label="Go home" href="/" />
        </div>
        {error.digest && (
          <p className="mt-8 text-[10px] text-muted light:text-black/50">Ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
