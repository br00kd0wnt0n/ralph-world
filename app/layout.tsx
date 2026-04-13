import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Nav from '@/components/layout/Nav'
import CartDrawer from '@/components/layout/CartDrawer'
import { BackgroundLayer } from '@/context/ThemeContext'

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Ralph — The Entertainment People',
  description:
    'Ralph.World — pop culture for the fun of it. Magazine, TV, events, shop, and lab.',
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
          <Nav />
          <BackgroundLayer />
          <main className="flex-1">{children}</main>
          <CartDrawer />
        </Providers>
      </body>
    </html>
  )
}
