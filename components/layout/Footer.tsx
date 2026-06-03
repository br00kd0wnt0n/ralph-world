'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import Link from 'next/link'
import Globe from './Globe'
import Button from '@/components/ui/Button'
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

const OFFICES: { label: string; lines: string[] }[] = [
  {
    label: 'London',
    lines: ['2nd Floor', '27-33 Bethnal Green Rd', 'London', 'E1 6LA', 'UK'],
  },
  {
    label: 'U.S.A',
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
      <footer className="relative z-10 bg-surface py-8 px-6 border-t border-border/30">
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
        </div>
      </footer>
    )
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10">
      {/* footer-top — always-visible 103px bar. Globe + buttons. Pink top
          border is the top edge of the whole footer regardless of state. */}
      <div
        className="relative bg-black flex items-center justify-between px-6"
        style={{ height: 103, borderTop: '4px solid #EA128B' }}
      >
        {/* Globe — bottom left, overflows the top of the bar. Clicking
            opens the bottom panel on slide 0 (or closes if already
            showing addresses). */}
        <button
          type="button"
          onClick={handleGlobeClick}
          className="absolute z-10"
          style={{ bottom: 24, left: 24 }}
          aria-label="Show offices"
          aria-expanded={panelOpen}
        >
          <Globe />
        </button>

        <div />

        {/* Right: Contact + social icons */}
        <div className="flex items-center" style={{ gap: 32 }}>
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

      {/* footer-bottom — expandable panel below the bar. height 0 → auto
          slides the bar (and therefore the whole footer) up as the panel
          grows. Internal scroll if its content is taller than the
          available viewport (e.g. form on mobile). */}
      <motion.div
        initial={false}
        animate={{ height: panelOpen ? 'auto' : 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="bg-black overflow-hidden"
      >
        <div
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(100svh - 103px)' }}
        >
          <div className="relative max-w-6xl mx-auto px-6 py-12">
            {/* Close button — top right of the panel */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white hover:text-ralph-pink transition-colors"
              aria-label="Close panel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="2" y1="2" x2="14" y2="14" />
                <line x1="14" y1="2" x2="2" y2="14" />
              </svg>
            </button>

            <Swiper
              onSwiper={(s) => {
                swiperRef.current = s
              }}
              onSlideChange={(s) => setActiveSlide(s.activeIndex)}
              initialSlide={0}
              slidesPerView={1}
              autoHeight
              spaceBetween={0}
              noSwipingSelector="input, textarea, select, button, a"
            >
              {/* Slide 0 — offices */}
              <SwiperSlide>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10">
                  {OFFICES.map((office) => (
                    <div key={office.label}>
                      <h3
                        className="text-white uppercase mb-4"
                        style={{
                          fontFamily:
                            'var(--font-intro, "Gooper Trial"), serif',
                          fontWeight: 600,
                          fontSize: 24,
                          lineHeight: 1,
                          letterSpacing: 0,
                        }}
                      >
                        {office.label}
                      </h3>
                      <address
                        className="text-white not-italic"
                        style={{
                          fontFamily: 'var(--font-body), Arial, sans-serif',
                          fontWeight: 600,
                          fontSize: 14,
                          lineHeight: '22px',
                          letterSpacing: 0,
                        }}
                      >
                        {office.lines.map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </address>
                    </div>
                  ))}
                </div>
              </SwiperSlide>

              {/* Slide 1 — contact form */}
              <SwiperSlide>
                <form
                  onSubmit={handleSubmit}
                  className="max-w-2xl mx-auto flex flex-col gap-5"
                >
                  <select
                    required
                    value={enquiry}
                    onChange={(e) => setEnquiry(e.target.value)}
                    className="w-full bg-white text-black rounded-xl px-5 py-3.5 border-2 outline-none focus:ring-2 focus:ring-ralph-pink/40 appearance-none"
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
                    className="w-full bg-white text-black placeholder-gray-500 rounded-xl px-5 py-3.5 border-2 outline-none focus:ring-2 focus:ring-ralph-pink/40"
                    style={{ borderColor: '#EA128B' }}
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full bg-white text-black placeholder-gray-500 rounded-xl px-5 py-3.5 border-2 outline-none focus:ring-2 focus:ring-ralph-pink/40"
                    style={{ borderColor: '#EA128B' }}
                  />

                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message"
                    rows={5}
                    className="w-full bg-white text-black placeholder-gray-500 rounded-xl px-5 py-3.5 border-2 outline-none focus:ring-2 focus:ring-ralph-pink/40 resize-y"
                    style={{ borderColor: '#EA128B' }}
                  />

                  <div className="mt-2 flex items-center gap-4">
                    <button
                      type="submit"
                      className="btn-press relative"
                      style={{
                        height: 43,
                        minWidth: 230,
                        paddingLeft: 12,
                        paddingRight: 12,
                        border: '2px solid black',
                        backgroundColor: 'white',
                        color: 'black',
                        fontFamily:
                          'var(--font-intro, "Gooper Trial"), serif',
                        fontWeight: 600,
                        fontSize: 16,
                        lineHeight: 1,
                        cursor: 'pointer',
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </SwiperSlide>
            </Swiper>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}
