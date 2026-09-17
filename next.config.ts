import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

// Pragmatic launch CSP. `unsafe-inline`/`unsafe-eval` on script-src are
// required because Next.js App Router emits inline bootstrap scripts and we
// don't yet do nonce injection (a strict nonce CSP is post-launch hardening).
// XSS is mitigated separately by DOMPurify on the rich-text render path, so
// the CSP's job here is clickjacking (frame-ancestors), MIME-sniffing,
// base-uri/object-src lockdown, and scoping which third parties can be framed
// / loaded. frame-src allows the YouTube/Vimeo article embeds + Stripe.
// script-src also allows googletagmanager.com for the consent-gated GTM
// loader (lib/gtm-client-init.ts), plus one entry per script-loading tag
// added inside the GTM container since (each needs its own script-src host
// — connect-src/img-src are already broad (any https:), so most GTM tags
// don't need CSP changes, but anything that injects a <script> or <iframe>
// does). Confirmed happening in practice, not just theoretical — the Meta
// Pixel needed three separate directives, not just script-src, because it
// falls back to an HTML form POST and a hidden iframe when its normal beacon
// delivery is blocked (ad blockers, cookie restrictions):
//   - script-src:  connect.facebook.net  (fbevents.js)
//   - form-action: www.facebook.com      (tr/ beacon delivered as a form POST)
//   - frame-src:   www.facebook.com      (tr/ beacon delivered via hidden iframe)
// GTM's tag config lives outside this repo, so a new CSP violation after
// adding a tag there is expected — add the blocked host to whichever
// directive the browser console names, don't assume script-src is the only one.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://www.facebook.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https:",
  "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://js.stripe.com https://*.stripe.com https://www.facebook.com",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
]

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake large barrel-import packages so only the used exports ship.
    optimizePackageImports: ['framer-motion', 'swiper'],
  },
  images: {
    // Prefer AVIF (falls back to WebP, then the original) for next/image.
    formats: ['image/avif', 'image/webp'],
    // Hosts allowed through the next/image optimizer.
    //  - cdn.shopify.com: all Storefront product images.
    //  - picsum.photos: dev/mock product images (lib/shopify/mock.ts) used when
    //    Shopify env vars aren't configured.
    // NOTE: Broadcaster/Ralph TV thumbnails are backend-authored, likely
    // presigned object-store URLs on a variable host — deliberately NOT added
    // here; confirm the runtime host before optimizing those (they may be
    // better left unoptimized due to TTL'd query strings).
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  // ralphandco.com is the old company domain. It used to be a redirect-only
  // project on Vercel; it's attached to this Railway service instead so the
  // Vercel subscription can go. Everything lands on the ralph.world homepage,
  // matching what Vercel did — the old site's paths don't exist here, so
  // preserving the path would turn old links into 404s rather than a welcome.
  // Inert until the domain is attached in Railway and DNS is repointed.
  // NOTE: that domain's DNS zone also carries company email (Google Workspace
  // MX, SPF, DKIM). Only the apex and www web records should ever change.
  async redirects() {
    return ['ralphandco.com', 'www.ralphandco.com'].map((host) => ({
      source: '/:path*',
      has: [{ type: 'host' as const, value: host }],
      destination: 'https://ralph.world/',
      permanent: true,
    }))
  },
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
