import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Nav from '@/components/layout/Nav'
import CartDrawer from '@/components/layout/CartDrawer'
import { BackgroundLayer } from '@/context/ThemeContext'
import Starfield from '@/components/layout/Starfield'

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
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
      className={`${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Starfield />
          <Nav />
          <BackgroundLayer />
          <main className="flex-1">{children}</main>
          <CartDrawer />
        </Providers>
      </body>
    </html>
  )
}
