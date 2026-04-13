'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import ThemeToggle from './ThemeToggle'
import LanguageModal from './LanguageModal'
import MobileMenu from './MobileMenu'
import SubscribeModal from './SubscribeModal'

const NAV_ITEMS = [
  { label: 'Ralph TV', href: '/tv', color: 'bg-ralph-yellow' },
  { label: 'Magazine', href: '/magazine', color: 'bg-ralph-orange' },
  { label: 'Events', href: '/events', color: 'bg-ralph-teal' },
  { label: 'Lab', href: '/lab', color: 'bg-ralph-purple' },
  { label: 'Shop', href: '/shop', color: 'bg-ralph-green' },
]

export default function Nav() {
  const pathname = usePathname()
  const { user, subscriptionStatus } = useAuth()
  const { itemCount, openCart } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  return (
    <>
      {/* ── Utility Bar (desktop) ── */}
      <div className="hidden md:flex items-center justify-between px-6 py-2 bg-surface/80 backdrop-blur-sm border-b border-border/30 text-xs">
        <ThemeToggle />

        <Link
          href="/play"
          className="text-secondary hover:text-primary transition-colors"
        >
          Play with Ralph
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <Link
              href="/account"
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-ralph-pink text-white text-sm font-bold"
            >
              {user.email?.[0]?.toUpperCase() ?? 'R'}
              {subscriptionStatus === 'paid' && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-ralph-green border-2 border-surface" />
              )}
            </Link>
          ) : (
            <>
              <button
                onClick={() => setSubscribeOpen(true)}
                className="rounded-full bg-ralph-pink px-4 py-1.5 text-white font-medium hover:bg-ralph-pink/90 transition-colors"
              >
                Get started
              </button>
              <LanguageModal />
              <Link
                href="/login"
                className="text-secondary hover:text-primary transition-colors"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Main Nav Bar ── */}
      <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/30">
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between px-6 py-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-primary text-xl"
              aria-label="Open menu"
            >
              &#9776;
            </button>

            <Link href="/" className="absolute left-1/2 -translate-x-1/2">
              {/* ralph logo SVG placeholder */}
              <div className="w-24 h-10 bg-ralph-pink/20 rounded flex items-center justify-center text-ralph-pink font-bold">
                ralph
              </div>
            </Link>

            <button
              onClick={openCart}
              className="relative text-primary text-xl"
              aria-label="Cart"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-ralph-pink text-[10px] text-white font-bold">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Nav items */}
          <div className="flex items-center justify-center gap-8 pb-3 relative">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative pb-1 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-0.5 rounded ${item.color}`}
                    />
                  )}
                </Link>
              )
            })}

            {/* Mascot placeholder */}
            <div className="absolute right-6 -bottom-4 w-12 h-12 bg-ralph-pink/10 rounded-full flex items-center justify-center text-[10px] text-muted">
              mascot
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-primary text-xl"
              aria-label="Open menu"
            >
              &#9776;
            </button>

            <button className="text-primary" aria-label="More options">
              &#8942;
            </button>

            <button
              onClick={openCart}
              className="relative text-primary text-xl"
              aria-label="Cart"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-ralph-pink text-[9px] text-white font-bold">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile logo */}
          <div className="flex justify-center pb-2">
            <Link href="/">
              <div className="w-20 h-8 bg-ralph-pink/20 rounded flex items-center justify-center text-ralph-pink font-bold text-sm">
                ralph
              </div>
            </Link>
          </div>

          {/* Mobile nav items */}
          <div className="flex items-center justify-center gap-4 pb-2 px-2 overflow-x-auto scrollbar-hide">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative whitespace-nowrap pb-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-0.5 rounded ${item.color}`}
                    />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onSubscribe={() => setSubscribeOpen(true)}
      />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </>
  )
}
