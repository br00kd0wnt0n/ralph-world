'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useMenu } from '@/context/MenuContext'
import { useLanguage, LANGUAGES } from '@/lib/useLanguage'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const WORLDS = [
  { label: 'Ralph TV', href: '/tv' },
  { label: 'Magazine', href: '/magazine' },
  { label: 'Events', href: '/events' },
  { label: 'Lab', href: '/lab' },
  { label: 'Shop', href: '/shop' },
]

// `panel` items open the footer's expanding panel instead of navigating.
const ABOUT: { label: string; href?: string; panel?: 'find' | 'contact' }[] = [
  { label: 'Work with us', href: '/work-with-us' },
  { label: "Weren't you an agency?", href: '/work-with-us' },
  { label: 'Find us', panel: 'find' },
  { label: 'Contact us', panel: 'contact' },
]

// The menu text occupies ~400px on the left (or 55% on small screens). Place
// the decorations across the remaining space to the right of that column —
// `col(f)` is the fraction (0–1) into that leftover space.
const TEXT_COL = 'min(400px, 55%)'
const col = (f: number) => `calc(${TEXT_COL} + (100% - ${TEXT_COL}) * ${f})`

// Decorative space objects floating behind the links, spread to fill the space
// beside the left-aligned menu. `enter`/`slideDur` give each its own extra
// slide-in (on top of the panel's slide) so they arrive at noticeably
// different speeds — bigger/farther ones drift in slower for a parallax feel.
// Widths use clamp() so they grow on mid-range (tablet) screens.
const DECOR = [
  { src: '/imgs/item_satellite.png', style: { top: '52%', left: col(0.16) }, w: 'clamp(104px, 13vw, 145px)', float: 12, rot: 10, dur: 8, enter: 60, slideDur: 0.5 },
  { src: '/imgs/item_moon.png', style: { top: '8%', left: col(0.18) }, w: 'clamp(120px, 16vw, 172px)', float: 14, rot: 6, dur: 9, enter: 200, slideDur: 0.8 },
  { src: '/imgs/item_front_saucer.png', style: { top: '16%', left: col(0.66) }, w: 'clamp(140px, 18vw, 196px)', float: 18, rot: -8, dur: 11, enter: 340, slideDur: 1.05 },
  { src: '/imgs/item_planet.png', style: { bottom: '-3%', left: col(0.5) }, w: 'clamp(230px, 30vw, 320px)', float: 10, rot: 4, dur: 13, enter: 280, slideDur: 1.35 },
]

const GOOPER: React.CSSProperties = {
  fontFamily: 'var(--font-intro, "Gooper Trial"), serif', // Gooper Trial
  fontWeight: 600, // SemiBold
  lineHeight: '100%',
  letterSpacing: 0,
  // font-size set via responsive classes (smaller < 576)
}

export default function MobileMenu() {
  const { user } = useAuth()
  const { open: isOpen, setOpen, openFooterPanel, setInstantNav } = useMenu()
  const { language, setLanguage } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)
  const onClose = () => setOpen(false)
  // Trap focus inside the open menu; restores focus to the burger on close.
  const menuRef = useFocusTrap<HTMLDivElement>(isOpen)

  // Escape closes the menu.
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, setOpen])
  const currentLanguage =
    LANGUAGES.find((l) => l.code === language)?.label ?? 'English'
  // Language switcher hidden for launch — restore when i18n ships.
  const SHOW_LANGUAGE: boolean = false

  // Close the menu only once the route actually changes, so the navigation
  // commits while the page is still off-screen and the new page slides in
  // already rendered — rather than sliding the old page in then swapping.
  // (Worth a slight delay for the route to commit.)
  const pathname = usePathname()
  useEffect(() => {
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
  // Navigating from the menu: skip the page-transition fade so the new page is
  // ready before the panel slides it in (the menu closes on the pathname
  // change). Same-route links don't navigate, so just close.
  const handleNav = (href: string) => {
    if (href === pathname) {
      setOpen(false)
    } else {
      setInstantNav(true)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const linkClass =
    'text-ralph-pink hover:text-white transition-colors text-[24px] min-[576px]:text-[28px]'
  const headerClass =
    'uppercase text-white mt-6 min-[576px]:mt-8 mb-1 text-[16px] min-[576px]:text-[18px]'
  const headerStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body), Arial, sans-serif', // Roboto
    fontWeight: 900, // Black
    lineHeight: '100%',
    letterSpacing: 0,
  }

  return (
    <AnimatePresence>
      {/* Floating space objects (planet, moon, saucer, satellite) on their OWN
          layer at z-30 — BELOW the CanvasStage (z-40 saucer / alien squad) so
          those sprites fly in front of the planets; the menu content sits above
          at z-[80]. Slides in with the panel. */}
      {isOpen && (
        <motion.div
          key="menu-decor"
          className="fixed inset-0 z-30 overflow-hidden pointer-events-none select-none"
          aria-hidden="true"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
        >
          {DECOR.map((d) => (
            <motion.img
              key={d.src}
              src={d.src}
              alt=""
              className="absolute"
              style={{ ...d.style, width: d.w, height: 'auto' }}
              initial={{ x: -d.enter, opacity: 0 }}
              animate={{ x: 0, opacity: 1, y: [0, -d.float, 0], rotate: [0, d.rot, 0] }}
              exit={{ x: -d.enter, opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }}
              transition={{
                x: { duration: d.slideDur, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: Math.min(0.4, d.slideDur) },
                y: { duration: d.dur, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: d.dur, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          ))}
        </motion.div>
      )}
      {isOpen && (
        <motion.div
          key="menu-content"
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[80] flex flex-col overflow-hidden"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
        >
          {/* Top bar — logo left. */}
          <div className="relative z-10 flex items-center px-6 py-4 shrink-0">
            <Link href="/" onClick={() => handleNav('/')} aria-label="ralph world">
              <Image
                src="/ralph-wordmark.png"
                alt="ralph"
                width={200}
                height={98}
                // Fixed height (width auto) so the bar reserves space and
                // doesn't shift once the image loads. Inline width:auto too —
                // next/image doesn't reliably detect the Tailwind w-auto and
                // warns about a modified dimension without it.
                className="h-[71px] min-[768px]:h-[92px] w-auto"
                style={{ width: 'auto' }}
                priority
              />
            </Link>
          </div>

          {/* Close button — absolutely positioned so it lines up vertically
              with the nav utility bar's basket (60px bar, centred → ~30px)
              regardless of the logo height, and px-6 from the right edge. */}
          <motion.button
            type="button"
            onClick={onClose}
            className="group absolute top-[13px] right-6 z-20 w-10 h-10"
            aria-label="Close menu"
            // Pop in once the menu has finished sliding in; pop straight back
            // out (no delay) when closing.
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.15, ease: 'easeIn' } }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 520, damping: 20 }}
          >
            <img
              src="/imgs/close_btn.svg"
              alt=""
              aria-hidden="true"
              className="w-full h-full block group-hover:hidden select-none"
            />
            <img
              src="/imgs/close_btn_over.svg"
              alt=""
              aria-hidden="true"
              className="w-full h-full hidden group-hover:block select-none"
            />
          </motion.button>

          {/* Scrollable links */}
          <nav className="relative z-10 flex-1 overflow-y-auto px-6 pb-12 flex flex-col items-start gap-4">
            {/* Top utility links */}
            {user ? (
              <Link href="/account" onClick={() => handleNav('/account')} className={linkClass} style={GOOPER}>
                Your account
              </Link>
            ) : (
              <Link href="/join-ralph" onClick={() => handleNav('/join-ralph')} className={linkClass} style={GOOPER}>
                Login / Subscribe
              </Link>
            )}
            {/* Language — same icon as the nav; opens an inline list that
                works like the nav dropdown (pick + persist, tick on current).
                Hidden for launch (SHOW_LANGUAGE) — restore when i18n ships. */}
            {SHOW_LANGUAGE && (
            <div className="flex flex-col items-start">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className={`${linkClass} flex items-center gap-2`}
                style={GOOPER}
                aria-expanded={langOpen}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    height: 30,
                    width: 38, // 56:44 aspect of icon_language.svg at h=30
                    backgroundColor: 'currentColor', // pink (white on hover) via the button's text colour
                    WebkitMaskImage: 'url(/imgs/icon_language.svg)',
                    maskImage: 'url(/imgs/icon_language.svg)',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                  }}
                />
                {currentLanguage}
              </button>
              <AnimatePresence initial={false}>
                {langOpen && (
                  <motion.div
                    key="lang-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden w-full"
                  >
                    <div className="flex flex-col items-start gap-2 pl-10 pt-3">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code)
                            setLangOpen(false)
                          }}
                          className="flex items-center gap-2 text-ralph-pink hover:text-white transition-colors text-[18px] min-[576px]:text-[20px]"
                          style={GOOPER}
                        >
                          {lang.label}
                          {language === lang.code && (
                            <img src="/imgs/icon_tick.svg" alt="" aria-hidden="true" width={18} height={16} />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* Worlds */}
            <h2 className={headerClass} style={headerStyle}>
              Worlds
            </h2>
            {WORLDS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNav(item.href)}
                aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                className={linkClass}
                style={GOOPER}
              >
                {item.label}
              </Link>
            ))}

            {/* About us */}
            <h2 className={headerClass} style={headerStyle}>
              About us
            </h2>
            {ABOUT.map((item) =>
              item.panel ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => openFooterPanel(item.panel!)}
                  className={`${linkClass} text-left`}
                  style={GOOPER}
                >
                  {item.label}
                </button>
              ) : (
                <Link key={item.label} href={item.href ?? '#'} onClick={() => handleNav(item.href ?? '#')} className={linkClass} style={GOOPER}>
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
