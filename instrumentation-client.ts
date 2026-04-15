import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  sendDefaultPii: false,

  environment: process.env.NODE_ENV,

  // Noise filter — these aren't bugs:
  // - ResizeObserver loop: benign, thrown by some CSS animations
  // - Network aborts: user navigated away mid-request
  // - Extensions: Chrome extensions injecting into our pages
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
