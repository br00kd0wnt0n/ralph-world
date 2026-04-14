'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
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

function CartIcon({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative text-primary hover:text-ralph-pink transition-colors"
      aria-label="Cart"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      <span className="absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[9px] text-primary font-medium">
        {count}
      </span>
    </button>
  )
}

// Reads ?subscribe=1 and triggers the modal. Separated so it can sit behind
// Suspense — useSearchParams bails page-level static prerendering otherwise.
function SubscribeParamWatcher({
  onOpen,
}: {
  onOpen: () => void
}) {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('subscribe') === '1') {
      onOpen()
      const url = new URL(window.location.href)
      url.searchParams.delete('subscribe')
      window.history.replaceState(null, '', url.toString())
    }
  }, [searchParams, onOpen])
  return null
}

export default function Nav() {
  const pathname = usePathname()
  const { user, subscriptionStatus } = useAuth()
  const { itemCount, openCart } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  return (
    <>
      {/* ── Utility Bar (desktop) ── */}
      <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-surface/80 backdrop-blur-sm border-b border-border/30 text-xs relative z-50">
        {/* Left: ralph world circle logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/ralph-logo.png"
            alt="ralph world"
            width={36}
            height={36}
            className="rounded-full"
            priority
          />
        </Link>

        {/* Right: actions */}
        <div className="flex items-center gap-5">
          <ThemeToggle />
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
                className="rounded-full border border-primary/80 px-4 py-1.5 text-primary font-medium hover:bg-primary/10 transition-colors"
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
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left: hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="text-primary w-8"
              aria-label="Open menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Center: ralph wordmark */}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2">
              <Image
                src="/ralph-wordmark.png"
                alt="ralph"
                width={160}
                height={60}
                className="h-12 w-auto"
                priority
              />
            </Link>

            {/* Right: basket */}
            <CartIcon count={itemCount} onClick={openCart} />
          </div>

          {/* Nav items */}
          <div className="flex items-center justify-center gap-10 pb-3">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative pb-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-ralph-pink hover:text-primary'
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

        {/* Mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-primary"
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <Link href="/">
              <Image
                src="/ralph-wordmark.png"
                alt="ralph"
                width={100}
                height={38}
                className="h-8 w-auto"
                priority
              />
            </Link>

            <CartIcon count={itemCount} onClick={openCart} />
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
                      : 'text-ralph-pink hover:text-primary'
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

      {/* Auto-opens modal when /subscribe redirects with ?subscribe=1 */}
      <Suspense fallback={null}>
        <SubscribeParamWatcher onOpen={() => setSubscribeOpen(true)} />
      </Suspense>
    </>
  )
}
