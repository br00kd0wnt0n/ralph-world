/**
 * Lazy Sentry initialisation — Task 3.10.
 *
 * Sentry can't auto-init in instrumentation-client.ts any more because
 * we have to wait for cookie consent. This module exposes a single
 * `initSentryClient()` that the CookieBanner calls once the user has
 * accepted analytics cookies (or has previously accepted in a stored
 * localStorage flag).
 *
 * Idempotent — safe to call multiple times. Subsequent calls are no-ops
 * because the SDK caches a `Sentry.getCurrentHub().getClient()` reference.
 */

import * as Sentry from '@sentry/nextjs'

let initialised = false

export function initSentryClient(): void {
  if (initialised) return
  if (typeof window === 'undefined') return
  // No DSN configured = nothing to initialise. Keeps dev quiet.
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
    environment: process.env.NODE_ENV,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /^Network request failed$/,
      /^Load failed$/,
      /^TypeError: Failed to fetch$/,
      /extension\//i,
      /^chrome-extension:\/\//i,
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
  })
  initialised = true
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
