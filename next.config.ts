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

  webpack: {
    treeshake: {
      // Replaces the deprecated top-level disableLogger option.
      removeDebugLogging: true,
    },
  },
})
