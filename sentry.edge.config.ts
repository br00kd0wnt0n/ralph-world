import * as Sentry from '@sentry/nextjs'

// Edge runtime (middleware, edge routes). Kept minimal — edge has a
// smaller bundle budget than Node.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  sendDefaultPii: false,
  environment: process.env.NODE_ENV,
})
