import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
}

export default withSentryConfig(nextConfig, {
  org: 'ralph-ck',
  project: 'javascript-nextjs',

  silent: !process.env.CI,

  widenClientFileUpload: true,

  // Route browser error reports through /monitoring to dodge ad-blockers.
  // Adds a bit of Railway egress but ensures we actually see client errors.
  tunnelRoute: '/monitoring',

  // Skip source-map upload on non-CI / local builds so every `next build`
  // doesn't try to auth to Sentry.
  disableLogger: true,

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
