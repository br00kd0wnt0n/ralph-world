import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Low sample rate in prod — free tier caps at 10k traces/mo and we'd
  // burn through that in a day on a busy page. 100% in dev for debugging.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Don't include IPs, cookies, or request headers. Re-enable per-event
  // via Sentry.setUser() if you need to tie errors to a logged-in user.
  sendDefaultPii: false,

  environment: process.env.NODE_ENV,

  ignoreErrors: [
    // Next.js control-flow exceptions, not real errors
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],
})
