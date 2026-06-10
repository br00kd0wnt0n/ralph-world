/**
 * Sentry client setup — gated by cookie consent (Task 3.10).
 *
 * The init call was moved to `lib/sentry-client-init.ts` so the
 * CookieBanner can call it AFTER the user accepts analytics cookies
 * (or skip it entirely if they decline). Without consent, Sentry must
 * not load — it sets cookies + transmits IPs.
 *
 * The CookieBanner reads `ralph-cookie-consent` from localStorage on
 * mount and auto-calls `initSentryClient()` if 'cookies_all' is stored,
 * so returning visitors don't re-see the banner.
 */

import { onRouterTransitionStart } from './lib/sentry-client-init'

export { onRouterTransitionStart }
