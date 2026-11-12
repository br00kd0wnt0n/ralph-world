import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Roboto } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/layout/CartDrawer'
import { auth } from '@/lib/auth'
import { getSiteCopy } from '@/lib/data/site-copy'
import { BackgroundLayer } from '@/context/ThemeContext'
import Starfield from '@/components/layout/Starfield'
import ForegroundLayer from '@/components/layout/ForegroundLayer'
import MidgroundCanvas from '@/components/anim/MidgroundCanvas'
import ForegroundCanvas from '@/components/anim/ForegroundCanvas'
import PlanetPreloader from '@/components/layout/PlanetPreloader'
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper'
import PageShift from '@/components/layout/PageShift'
import MenuFade from '@/components/layout/MenuFade'
import MobileMenu from '@/components/layout/MobileMenu'
import CookieBanner from '@/components/legal/CookieBanner'
import { getCurrentPolicyVersion } from '@/lib/consent'
import { SiteCopyProvider } from '@/components/layout/SiteCopyContext'
import { JsonLd } from '@/components/seo/JsonLd'
import { BASE_OPEN_GRAPH, copyOrDefault, shareImages } from '@/lib/seo'

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
})

const roboto = Roboto({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ralph.world'

// The Storefront API token is Shopify's public kind (sent as
// X-Shopify-Storefront-Access-Token), made for use in the browser. Only pass
// it down if it has the public format (32 hex chars), never an Admin token.
function publicStorefrontToken(): string | undefined {
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN
  return token && /^[0-9a-f]{32}$/i.test(token) ? token : undefined
}

// Root defaults. The description and default share image are editable in
// the CMS (Site Copy → Page SEO → "Site defaults"); every route without its
// own values inherits them. getSiteCopy is cached and tagged 'site-copy', so
// a CMS save refreshes these with the rest of the copy.
export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy()
  const description = copyOrDefault(copy, 'seo_default_description')
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: 'Ralph — The Entertainment People',
      template: '%s | Ralph',
    },
    description,
    // Icons are auto-detected from app/favicon.ico, app/icon.png and
    // app/apple-icon.png (Next file-based metadata). The PWA icon set
    // (192/512 + maskable) is declared in public/manifest.webmanifest.
    manifest: '/manifest.webmanifest',
    openGraph: {
      ...BASE_OPEN_GRAPH,
      type: 'website',
      url: SITE_URL,
      title: 'Ralph — The Entertainment People',
      description,
      // The CMS default image, else /og-default.png. Pages that set their
      // own openGraph must pass images too (see shareImages in lib/seo.ts):
      // Next replaces openGraph wholesale rather than merging it.
      images: shareImages(copy.seo_default_image),
    },
    twitter: {
      // Only the card type is set globally. Title/description/image are left
      // to each page's openGraph (Twitter falls back to og: tags) so article/
      // product/event cards show their own titles, not the site default.
      card: 'summary_large_image',
    },
  }
}

// theme-color drives the mobile browser chrome; black matches the site bg.
export const viewport: Viewport = {
  themeColor: '#000000',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Site copy feeds the global footer (tagline, socials, copyright).
  // Cached via unstable_cache + tagged 'site-copy', so this is a cheap
  // shared read and safe-falls-back to defaults if the DB is unreachable.
  // auth() feeds the client-side SessionProvider its initial session so
  // the Nav header doesn't have to wait on /api/auth/session to know
  // the user is signed in. Without this the header flashes the guest
  // state (or stays guest, if the fetch is slow/blocked) after a login
  // redirect — the observed §9.8 bug.
  const [copy, policyVersion, session] = await Promise.all([
    getSiteCopy(),
    getCurrentPolicyVersion(),
    auth(),
  ])
  return (
    <html
      lang="en-GB"
      data-theme="cosy-dynamics"
      className={`${playfair.variable} ${roboto.variable} h-full antialiased`}
    >
      <head>
        {/* Preload the above-the-fold display font (used by hero/titles/buttons)
            so it isn't discovered late via the CSS @font-face. */}
        <link
          rel="preload"
          href="/fonts/Gooper7-SemiBold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Skip link — first focusable element; jumps keyboard/SR users past
            the nav straight to the page content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-lg"
        >
          Skip to content
        </a>
        {/* Site-wide structured data (Organization + WebSite). */}
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Ralph',
              url: SITE_URL,
              logo: `${SITE_URL}/icon-512.png`,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Ralph World',
              url: SITE_URL,
            },
          ]}
        />
        <Providers session={session}>
          <SiteCopyProvider value={copy}>
            <PlanetPreloader />
            <Starfield />
            <MenuFade>
              <MidgroundCanvas />
              <Nav />
            </MenuFade>
            <BackgroundLayer />
            <PageShift>
              <main id="main-content" className="flex-1 flex flex-col relative z-10">
                <PageTransitionWrapper>
                  {children}
                </PageTransitionWrapper>
              </main>
              <Footer variant="dark" copy={copy} />
            </PageShift>
            <MenuFade>
              <ForegroundLayer />
              <ForegroundCanvas />
            </MenuFade>
            <CartDrawer />
            <MobileMenu />
            <CookieBanner
              currentPolicyVersion={policyVersion}
              shopifyStorefrontToken={publicStorefrontToken()}
            />
          </SiteCopyProvider>
        </Providers>
      </body>
    </html>
  )
}
