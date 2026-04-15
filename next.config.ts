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

  // tunnelRoute removed — was returning 403 on Railway. Can re-add later
  // if ad-blockers become a measurable problem.

  // Skip source-map upload on non-CI / local builds so every `next build`
  // doesn't try to auth to Sentry.
  disableLogger: true,

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
