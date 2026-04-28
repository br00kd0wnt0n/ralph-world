import type { Metadata } from 'next'
import { Playfair_Display, Roboto } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/layout/CartDrawer'
import { BackgroundLayer } from '@/context/ThemeContext'
import Starfield from '@/components/layout/Starfield'
import ForegroundLayer from '@/components/layout/ForegroundLayer'
import MidgroundLayer from '@/components/layout/MidgroundLayer'
import { PageTransitionProvider } from '@/context/PageTransitionContext'

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-theme="cosy-dynamics"
      className={`${playfair.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Starfield />
          <MidgroundLayer />
          <Nav />
          <BackgroundLayer />
          <main className="flex-1 flex flex-col relative z-10">
            <PageTransitionProvider>
              {children}
            </PageTransitionProvider>
          </main>
          <Footer variant="dark" />
          <ForegroundLayer />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  )
}
