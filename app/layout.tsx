import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Roboto } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/layout/CartDrawer'
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Ralph — The Entertainment People',
    template: '%s | Ralph',
  },
  description:
    'Ralph.World — pop culture for the fun of it. Magazine, TV, events, shop, and lab.',
  // Icons are auto-detected from app/favicon.ico, app/icon.png and
  // app/apple-icon.png (Next file-based metadata). The PWA icon set
  // (192/512 + maskable) is declared in public/manifest.webmanifest.
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Ralph',
    locale: 'en_GB',
    url: SITE_URL,
    title: 'Ralph — The Entertainment People',
    description:
      'Pop culture for the fun of it. Magazine, TV, events, shop, and lab.',
  },
  twitter: {
    // Only the card type is set globally. Title/description/image are left
    // to each page's openGraph (Twitter falls back to og: tags) so article/
    // product/event cards show their own titles, not the site default.
    card: 'summary_large_image',
  },
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
  const [copy, policyVersion] = await Promise.all([
    getSiteCopy(),
    getCurrentPolicyVersion(),
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
        <Providers>
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
            <CookieBanner currentPolicyVersion={policyVersion} />
          </SiteCopyProvider>
        </Providers>
      </body>
    </html>
  )
}
