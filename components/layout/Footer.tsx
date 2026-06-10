'use client'

import { Fragment, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import Link from 'next/link'
import Globe from './Globe'
import Button from '@/components/ui/Button'
import CookiePreferencesLink from '@/components/legal/CookiePreferencesLink'
import type { SiteCopy } from '@/lib/data/site-copy'

const ENQUIRY_OPTIONS = [
  'General',
  'Press',
  'Partnerships & Brands',
  'Stockists',
  'Careers',
] as const

interface FooterProps {
  variant?: 'dark' | 'light'
  copy?: Partial<SiteCopy>
}

const OFFICES: {
  label: string
  title: { src: string; width: number; height: number }
  lines: string[]
}[] = [
  {
    label: 'London',
    title: { src: '/imgs/text_office_london.svg', width: 148, height: 60 },
    lines: ['2nd Floor', '27-33 Bethnal Green Rd', 'London', 'E1 6LA', 'UK'],
  },
  {
    label: 'U.S.A',
    title: { src: '/imgs/text_office_usa.svg', width: 139, height: 75 },
    lines: [
      'Pacific Design Center',
      'G-684, 6th Floor',
      '700 North San Vicente Blvd',
      'West Hollywood',
      'CA 90069, USA',
    ],
  },
  {
    label: 'Tokyo',
    title: { src: '/imgs/text_office_tokyo.svg', width: 117, height: 71 },
    lines: [
      '11th Floor,',
      'Aoyama Palacio Tower,',
      '3-6-7 Kita-Aoyama,',
      'Minato-ku,',
      'Tokyo 107-0061 Japan',
    ],
  },
  {
    label: 'Mumbai',
    title: { src: '/imgs/text_office_mumbai.svg', width: 162, height: 70 },
    lines: [
      '4th floor Pinnacle House',
      'Plot 604 15th Rd',
      'Bandra West',
      'Mumbai 400050',
      'India',
    ],
  },
]

export default function Footer({ variant = 'dark', copy }: FooterProps) {
  const tagline = copy?.footer_tagline ?? 'The Entertainment People'
  const copyright = copy?.footer_copyright ?? '© Ralph Creative Ltd, 2026'
  const agencyCta = copy?.footer_agency_cta ?? "Hey. Aren't you an agency?"
  const contactHref = copy?.footer_contact_email || '/contact'
  const tiktokUrl = copy?.footer_tiktok_url
  const instagramUrl = copy?.footer_instagram_url
  const youtubeUrl = copy?.footer_youtube_url

  // Footer is fixed at the bottom of the viewport. Only the 103px bar is
  // visible by default (via transform: translateY(calc(100% - 103px))).
  // Clicking the globe or "Contact us" slides the whole footer up to
  // translateY(0), revealing the offices/contact-form panel above.
  const [panelOpen, setPanelOpen] = useState(false)
  const swiperRef = useRef<SwiperType | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)

  // Form state — simple controlled inputs. Wire to API later.
  const [enquiry, setEnquiry] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  // Swiper is always mounted (the panel just collapses via height), so
  // both triggers slide to their slide and open the panel. When the
  // panel is closed, slide instantly (speed 0) so the user sees the
  // correct slide already in place as the panel reveals. When open,
  // let it animate between slides normally.
  function handleGlobeClick() {
    swiperRef.current?.slideTo(0, panelOpen ? undefined : 0)
    setPanelOpen(true)
  }

  function handleContactClick(e: React.MouseEvent) {
    e.preventDefault()
    swiperRef.current?.slideTo(1, panelOpen ? undefined : 0)
    setPanelOpen(true)
  }

  function handleClose() {
    setPanelOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Hook up to /api/contact (or wherever) when ready.
    console.log('[contact form]', { enquiry, name, email, message })
    // Optionally close + reset:
    // setEnquiry(''); setName(''); setEmail(''); setMessage(''); setPanelOpen(false)
  }

  if (variant === 'light') {
    return (
      <footer className="relative z-10 bg-surface py-8 px-4 min-[420px]:px-6 md:px-16 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
            <a
              href={contactHref}
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              Contact us
            </a>
            {tiktokUrl && (
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-primary transition-colors"
                aria-label="TikTok"
              >
                TikTok
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                Instagram
              </a>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-primary transition-colors"
                aria-label="YouTube"
              >
                YouTube
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted">
            <Link href="/subscribe" className="hover:text-primary transition-colors">
              Sign up
            </Link>
            <span>|</span>
            <Link href="/play" className="hover:text-primary transition-colors">
              {agencyCta}
            </Link>
          </div>
          <FooterLegalLinks copyright={copyright} />
        </div>
      </footer>
    )
  }

  return (
    <footer className="relative z-10">
      {/* footer-top — always-visible bar. Globe + buttons. min-height 103
          on md+, grows on narrow viewports as the social row wraps under
          Contact us. Pink top border is the top edge of the whole footer
          regardless of state. */}
      <div
        className="relative bg-black flex items-center justify-between px-4 min-[420px]:px-6 md:px-16 py-3"
        style={{ minHeight: 103, borderTop: '4px solid #EA128B' }}
      >
        {/* Globe — bottom left, overflows the top of the bar. Clicking
            opens the bottom panel on slide 0 (or closes if already
            showing addresses). */}
        <button
          type="button"
          onClick={handleGlobeClick}
          className="absolute z-10 left-4 min-[420px]:left-6 md:left-16"
          style={{ bottom: 24 }}
          aria-label="Show offices"
          aria-expanded={panelOpen}
        >
          <Globe />
        </button>

        <div />

        {/* Right: Contact + social icons. flex-wrap so the social icons
            drop onto a new row under "Contact us" on narrow viewports
            instead of overflowing. justify-end keeps each row anchored
            to the right; gap-y/gap-x split lets wrapped rows breathe
            vertically without enormous gaps horizontally. */}
        <div className="flex flex-wrap items-center justify-end gap-x-3 md:gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={handleContactClick}
            className="text-chrome text-white hover:text-ralph-pink transition-colors"
            aria-label="Open contact form"
          >
            Contact us
          </button>
          <a
            href={tiktokUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-icon-btn"
            aria-label="TikTok"
          >
            <img src="/imgs/icon_tiktok.svg" alt="" className="footer-icon" />
          </a>
          <a
            href={instagramUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-icon-btn"
            aria-label="Instagram"
          >
            <img src="/imgs/icon_instagram.svg" alt="" className="footer-icon" />
          </a>
          <a
            href={youtubeUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-icon-btn"
            aria-label="YouTube"
          >
            <img src="/imgs/icon_youtube.svg" alt="" className="footer-icon" />
          </a>
        </div>
      </div>

      {/* footer-bottom — expandable panel. Absolutely positioned ABOVE
          the bar (bottom: 100% of the footer = top edge of the bar) so
          it grows UPWARD and overlays the page content above rather
          than pushing it. The footer's collapsed height stays at the
          bar's 103px in normal document flow. */}
      <motion.div
        initial={false}
        animate={{ height: panelOpen ? 'auto' : 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="absolute left-0 right-0 bottom-full bg-black overflow-hidden"
        style={{ borderTop: '4px solid #EA128B' }}
      >
        {/* Close button — anchored to the panel (which spans the full
            viewport width via left-0/right-0), so the right offset is
            from the viewport edge, not the inner max-w-6xl container.
            Sits above the scrollable content via z-10. Default + hover
            states swap via the `group` parent and group-hover. */}
        <button
          type="button"
          onClick={handleClose}
          className="group absolute top-4 right-[calc(var(--spacing)*6)] w-12 h-12 z-10"
          aria-label="Close panel"
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
        </button>

        <div
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(100svh - 103px)' }}
        >
          <div className="relative max-w-6xl mx-auto px-4 min-[420px]:px-6 md:px-16 py-12 pb-28 md:pb-12">

            <Swiper
              onSwiper={(s) => {
                swiperRef.current = s
              }}
              onSlideChange={(s) => setActiveSlide(s.activeIndex)}
              initialSlide={0}
              slidesPerView={1}
              // No autoHeight: all slides take the height of the tallest
              // so the panel doesn't resize when switching between slides.
              spaceBetween={0}
              noSwipingSelector="input, textarea, select, button, a"
            >
              {/* Slide 0 — offices. SwiperSlide is the flex column via
                  inline style (more specific than Swiper's
                  .swiper-slide CSS) so the grid below can flex-1 and
                  centre vertically in the slide's remaining height.
                  Slides share the tallest slide's height (form slide). */}
              <SwiperSlide
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                <h2
                  className="text-white mb-8"
                  style={{
                    fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
                    fontWeight: 600,
                    fontSize: 32,
                    lineHeight: 1,
                    letterSpacing: 0,
                  }}
                >
                  Find us
                </h2>
                {/* flex-1 + items-center vertically centres the offices
                    grid in the slide's remaining height. */}
                <div className="flex-1 flex items-center">
                  {/* 4 offices with 3 decorative squiggly-line dividers
                      between them on lg+ (>=1024px). Below 1024px the
                      grid stays at 2 columns and the dividers are
                      display:none so the offices stack 2x2 cleanly. */}
                  <div className="w-full grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:gap-x-6">
                  {OFFICES.map((office, i) => {
                    const dividerSrc =
                      i === 0
                        ? '/imgs/office_lines.svg'
                        : `/imgs/office_lines_${i + 1}.svg`
                    return (
                      <Fragment key={office.label}>
                        {/* < 640px: flex-start (left-aligned) — true mobile.
                            >= 640px: centre each office's content as a
                            single block in its column so the gap on either
                            side of the divider (lg+) is symmetric. */}
                        <div className="sm:text-center">
                          <img
                            src={office.title.src}
                            alt={office.label}
                            width={office.title.width}
                            height={office.title.height}
                            className="mb-4 sm:mx-auto select-none"
                            style={{ height: 60, width: 'auto', maxWidth: 'none' }}
                          />
                          <address
                            className="text-white not-italic inline-block text-left"
                            style={{
                              fontFamily: 'var(--font-body), Arial, sans-serif',
                              fontWeight: 600,
                              fontSize: 14,
                              lineHeight: '22px',
                              letterSpacing: 0,
                            }}
                          >
                            {office.lines.map((line, j) => (
                              <div key={j}>{line}</div>
                            ))}
                          </address>
                        </div>
                        {i < OFFICES.length - 1 && (
                          <div
                            className="hidden lg:flex items-stretch justify-center"
                            aria-hidden="true"
                          >
                            <img
                              src={dividerSrc}
                              alt=""
                              className="h-full w-auto select-none"
                            />
                          </div>
                        )}
                      </Fragment>
                    )
                  })}
                  </div>
                </div>
              </SwiperSlide>

              {/* Slide 1 — contact form */}
              <SwiperSlide>
                <h2
                  className="text-white mb-8"
                  style={{
                    fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
                    fontWeight: 600,
                    fontSize: 32,
                    lineHeight: 1,
                    letterSpacing: 0,
                  }}
                >
                  Contact us
                </h2>
                <form
                  onSubmit={handleSubmit}
                  className="max-w-2xl mx-auto flex flex-col gap-4 pb-[10px]"
                >
                  <select
                    required
                    value={enquiry}
                    onChange={(e) => setEnquiry(e.target.value)}
                    className="w-full bg-white text-black rounded-xl px-4 py-2.5 border-2 outline-none focus:ring-2 focus:ring-ralph-pink/40 appearance-none"
                    style={{ borderColor: '#EA128B' }}
                  >
                    <option value="" disabled>
                      Select Enquiry
                    </option>
                    {ENQUIRY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="w-full bg-white text-black placeholder-gray-500 rounded-xl px-4 py-2.5 border-2 outline-none focus:ring-2 focus:ring-ralph-pink/40"
                    style={{ borderColor: '#EA128B' }}
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full bg-white text-black placeholder-gray-500 rounded-xl px-4 py-2.5 border-2 outline-none focus:ring-2 focus:ring-ralph-pink/40"
                    style={{ borderColor: '#EA128B' }}
                  />

                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message"
                    rows={3}
                    className="w-full bg-white text-black placeholder-gray-500 rounded-xl px-4 py-2.5 border-2 outline-none focus:ring-2 focus:ring-ralph-pink/40 resize-y"
                    style={{ borderColor: '#EA128B' }}
                  />

                  <div className="mt-2 flex items-center gap-4">
                    <Button label="Submit" type="submit" pink minWidth={230} />
                  </div>
                </form>
              </SwiperSlide>
            </Swiper>
          </div>
        </div>
      </motion.div>
      <div className="bg-black px-4 py-3 border-t border-white/10">
        <FooterLegalLinks copyright={copyright} />
      </div>
    </footer>
  )
}

/**
 * Legal links row — Task 3.10. Linked from both footer variants.
 * Includes a "Cookie preferences" button that re-opens the consent banner,
 * plus the editable copyright line beneath.
 */
function FooterLegalLinks({ copyright }: { copyright: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <Link href="/legal/terms" className="hover:text-primary transition-colors">
          Terms
        </Link>
        <span>·</span>
        <Link href="/legal/privacy" className="hover:text-primary transition-colors">
          Privacy
        </Link>
        <span>·</span>
        <Link href="/legal/cookies" className="hover:text-primary transition-colors">
          Cookies
        </Link>
        <span>·</span>
        <CookiePreferencesLink className="hover:text-primary transition-colors underline-offset-2 hover:underline cursor-pointer">
          Cookie preferences
        </CookiePreferencesLink>
      </div>
      {copyright && (
        <p className="text-[11px] text-muted/80 text-center">{copyright}</p>
      )}
    </div>
  )
}
