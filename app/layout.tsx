import type { Metadata } from 'next'
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
  icons: {
    icon: '/ralph-logo.png',
    shortcut: '/ralph-logo.png',
    apple: '/ralph-logo.png',
  },
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
    card: 'summary_large_image',
    title: 'Ralph — The Entertainment People',
    description:
      'Pop culture for the fun of it. Magazine, TV, events, shop, and lab.',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Site copy feeds the global footer (tagline, socials, copyright).
  // Cached via unstable_cache + tagged 'site-copy', so this is a cheap
  // shared read and safe-falls-back to defaults if the DB is unreachable.
  const copy = await getSiteCopy()
  return (
    <html
      lang="en"
      data-theme="cosy-dynamics"
      className={`${playfair.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <PlanetPreloader />
          <Starfield />
          <MenuFade>
            <MidgroundCanvas />
            <Nav />
          </MenuFade>
          <BackgroundLayer />
          <PageShift>
            <main className="flex-1 flex flex-col relative z-10">
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
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}
