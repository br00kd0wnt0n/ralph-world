'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import HomepageTvTeaser from '@/components/home/HomepageTvTeaser'
import HomepageTvSubtitle from '@/components/home/HomepageTvSubtitle'
import { motion } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperClass } from 'swiper/types'
import 'swiper/css'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { planetSectionVariants } from '@/lib/animation/homepage'
import { PLANET_EXIT_DIRECTIONS } from '@/lib/animation/page-transitions'
import { useTransitionState } from '@/components/layout/PageTransitionWrapper'
import type { PlanetSectionProps } from './PlanetSection.types'

const POSITION_LAYOUTS = {
  'upper-left': 'left',
  'upper-right': 'right',
  'lower-left': 'left',
  'lower-right': 'right',
} as const

const SECTION_PADDING = 64
const PLANET_SIZE = 411
const PANEL_HEIGHT = 276
const PEEK_VISIBLE = 20
const COLUMN_WIDTH = 340
const PANEL_PADDING = 20
const COLUMN_GAP = 20

// Title images — displayed at half intrinsic size
const TITLE_IMAGES: Record<string, { src: string; w: number; h: number }> = {
  tv: { src: '/imgs/title_tv.png', w: 362 / 2, h: 134 / 2 },
  magazine: { src: '/imgs/title_magazine.png', w: 369 / 2, h: 118 / 2 },
  events: { src: '/imgs/title_events.png', w: 324 / 2, h: 100 / 2 },
  shop: { src: '/imgs/title_shop.png', w: 195 / 2, h: 117 / 2 },
  lab: { src: '/imgs/title_lab.png', w: 202 / 2, h: 116 / 2 },
}

// Secondary titles — used inside the expanded panel
const TITLE_SECONDARY_IMAGES: Record<string, { src: string; w: number; h: number }> = {
  tv: { src: '/imgs/title_tv_secondary.png', w: 362 / 2, h: 134 / 2 },
  magazine: { src: '/imgs/title_magazine_secondary.png', w: 369 / 2, h: 118 / 2 },
  events: { src: '/imgs/title_events_secondary.png', w: 324 / 2, h: 100 / 2 },
  shop: { src: '/imgs/title_shop_secondary.png', w: 196 / 2, h: 117 / 2 },
  lab: { src: '/imgs/title_lab_secondary.png', w: 202 / 2, h: 116 / 2 },
}

const PLANET_IMAGES: Record<string, string> = {
  magazine: '/imgs/planet_mag.png',
  events: '/imgs/planet_events.png',
  shop: '/imgs/planet_shop.png',
  lab: '/imgs/planet_lab.png',
}

export default function PlanetSection({
  id,
  label,
  tagline,
  accentColor,
  planetPosition,
  moduleCard,
  planetImageUrl,
}: PlanetSectionProps) {
  // Purple = white text, all others (blue, green, yellow, orange) = black text
  const whitTextBgs = ['#7B3FE4']
  const useWhiteText = whitTextBgs.some(
    (c) => c.toLowerCase() === accentColor.toLowerCase()
  )
  const textColor = useWhiteText ? 'text-white' : 'text-black'
  const textMuted = useWhiteText ? 'text-white' : 'text-black'
  const ctaBg = useWhiteText
    ? 'bg-white text-black hover:bg-white/90'
    : 'bg-black text-white hover:bg-black/80'
  const badgeColors = useWhiteText
    ? 'bg-white text-black'
    : 'bg-black text-white'

  const sectionRef = useRef<HTMLDivElement>(null)
  const planetBtnRef = useRef<HTMLButtonElement>(null)
  const { ref: revealRef, isVisible } = useScrollReveal(0.1)
  const { isExiting } = useTransitionState()

  const [isActive, setIsActive] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [sectionWidth, setSectionWidth] = useState(0)
  const [planetCenterY, setPlanetCenterY] = useState(0)
  const [planetHeight, setPlanetHeight] = useState(0)
  const [isTouch, setIsTouch] = useState(false)
  const [transitionsOn, setTransitionsOn] = useState(false)
  const [swiperIndex, setSwiperIndex] = useState(0)
  const swiperRef = useRef<SwiperClass | null>(null)
  const mouseYRef = useRef(0)
  const isActiveRef = useRef(false)

  useEffect(() => { isActiveRef.current = isActive }, [isActive])

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(hover: none)').matches || 'ontouchstart' in window)
    ) {
      setIsTouch(true)
    }
  }, [])

  // Enable the panel clip-path transition only after the first painted frame,
  // so panels render hidden on load instead of animating open (avoids a flash
  // of narrow panels before/while the section is measured).
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setTransitionsOn(true)),
    )
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const planet = planetBtnRef.current
    if (!section || !planet) return
    const update = () => {
      setSectionWidth(section.offsetWidth)
      const sRect = section.getBoundingClientRect()
      const pRect = planet.getBoundingClientRect()
      setPlanetCenterY(pRect.top - sRect.top + pRect.height / 2)
      setPlanetHeight(pRect.height)
    }
    update()
    // Re-measure when planet image loads (height changes)
    const img = planet.querySelector('img')
    if (img) img.addEventListener('load', update)
    const ro = new ResizeObserver(() => update())
    ro.observe(section)
    ro.observe(planet)
    return () => {
      ro.disconnect()
      if (img) img.removeEventListener('load', update)
    }
  }, [])

  // Scroll-based peek
  useEffect(() => {
    const check = () => {
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const center = rect.top + rect.height / 2
      setIsInView(center > vh * 0.05 && center < vh * 0.95)
    }
    window.addEventListener('scroll', check, { passive: true })
    check()
    return () => window.removeEventListener('scroll', check)
  }, [])

  // Track mouse Y (always, lightweight)
  useEffect(() => {
    const onMove = (e: MouseEvent) => { mouseYRef.current = e.clientY }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // When active: observe mouse position vs section bounds on scroll + mousemove
  useEffect(() => {
    if (!isActive || isTouch) return

    const checkBounds = () => {
      const section = sectionRef.current
      if (!section || !isActiveRef.current) return
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const sectionCenter = rect.top + rect.height / 2
      const halfZone = vh * 0.45 // 90% of screen height
      const mouseY = mouseYRef.current

      // Mouse must be within 90% screen height centered on section
      if (
        mouseY < sectionCenter - halfZone ||
        mouseY > sectionCenter + halfZone ||
        sectionCenter < -halfZone ||
        sectionCenter > vh + halfZone
      ) {
        setIsActive(false)
      }
    }

    window.addEventListener('scroll', checkBounds, { passive: true })
    window.addEventListener('mousemove', checkBounds, { passive: true })
    return () => {
      window.removeEventListener('scroll', checkBounds)
      window.removeEventListener('mousemove', checkBounds)
    }
  }, [isActive, isTouch])

  const activate = useCallback(() => {
    // Don't open the panel at all in planet-only mode (< 768px).
    if (sectionWidth > 0 && sectionWidth < 768) return
    if (!isTouch) setIsActive(true)
  }, [isTouch, sectionWidth])

  const planetOnRight = POSITION_LAYOUTS[planetPosition] === 'right'
  const [carouselIndex, setCarouselIndex] = useState(0)
  const router = useRouter()

  const navigateToSection = useCallback(() => {
    if (moduleCard.href) router.push(moduleCard.href)
  }, [router, moduleCard.href])

  // Below 1200px the section is too narrow to fit two 340px columns +
  // the 411px planet inside the viewport. We just drop the right
  // (carousel) column in that range — the title + copy + CTA in the
  // left column is enough on its own and the single-col panel
  // comfortably fits down to ~855px wide viewports.
  const hasRoomForTwoColumns = sectionWidth === 0 || sectionWidth >= 1200

  // Responsive planet size — must match the Tailwind classes on the
  // rendered <img>:
  //   < 768  → 220
  //   768-991 → 350
  //   >= 992 → 411 (PLANET_SIZE)
  const planetSize =
    sectionWidth === 0 || sectionWidth >= 992
      ? PLANET_SIZE
      : sectionWidth < 768
        ? 220
        : 350

  // Below 768px the planet view collapses to "just the planet + title +
  // tagline" — the expanding panel is suppressed and the planet doesn't
  // respond to clicks/hover. The title image uses a fixed 52px height
  // (width auto) instead of the half-intrinsic desktop sizing.
  const isPlanetOnly = sectionWidth > 0 && sectionWidth < 768

  // Below 575px the planet hangs 50px past the section edge (negative
  // padding pulls it off-screen) so the title + tagline have room to
  // breathe on narrow phones.
  const sectionPadding =
    sectionWidth > 0 && sectionWidth < 575 ? -50 : SECTION_PADDING

  // Get exit direction based on planet position (left planets slide left, right slide right)
  const exitDirection = PLANET_EXIT_DIRECTIONS[id] || (planetOnRight ? 'right' : 'left')

  const visibleItems = moduleCard.items.slice(carouselIndex, carouselIndex + 2)
  const hasMoreForward = carouselIndex + 2 < moduleCard.items.length
  const hasMoreBack = carouselIndex > 0

  const panelState = isActive ? 'open' : isInView ? 'peek' : 'hidden'

  const planetLeft = planetOnRight
    ? sectionWidth - sectionPadding - planetSize
    : sectionPadding

  // Panel = content width + half planet (the half that tucks behind the planet)
  const hasItems = moduleCard.items.length > 0
  // TV always shows preview; magazine + shop show carousel when items exist.
  // Events + lab are single-column (left only). Two-column panel is also
  // suppressed below 1200px viewport so the panel fits.
  const hasRightColumn =
    hasRoomForTwoColumns &&
    (id === 'tv' || ((id === 'magazine' || id === 'shop') && hasItems))
  const contentWidth = hasRightColumn
    ? PANEL_PADDING * 2 + COLUMN_WIDTH * 2 + COLUMN_GAP
    : PANEL_PADDING * 2 + COLUMN_WIDTH
  const halfPlanet = planetSize / 2
  const panelWidth = contentWidth + halfPlanet

  // Panel starts from planet center
  const planetCenterX = planetLeft + halfPlanet
  const panelLeft = planetOnRight
    ? planetCenterX - panelWidth
    : planetCenterX

  // Clip-path: reveals from the planet-facing edge outward
  const getClipPath = () => {
    if (panelState === 'open') return 'inset(0px 0px 0px 0px round 12px)'

    if (planetOnRight) {
      // Planet is right → panel is left → reveal from right edge (planet side)
      const leftInset = panelState === 'hidden' ? panelWidth : panelWidth - PEEK_VISIBLE
      return `inset(0px 0px 0px ${leftInset}px round 12px)`
    } else {
      // Planet is left → panel is right → reveal from left edge (planet side)
      const rightInset = panelState === 'hidden' ? panelWidth : panelWidth - PEEK_VISIBLE
      return `inset(0px ${rightInset}px 0px 0px round 12px)`
    }
  }

  const planetShift =
    panelState === 'open' ? (planetOnRight ? 100 : -100) : 0

  // Planet exit offset - slide to nearest side
  const planetExitOffset = exitDirection === 'left' ? -100 : 100

  return (
    <motion.section
      ref={(node) => {
        ;(revealRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node as HTMLDivElement | null
        ;(sectionRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node as HTMLDivElement | null
      }}
      variants={planetSectionVariants}
      initial="hidden"
      animate={isExiting ? { opacity: 0 } : isVisible ? 'visible' : 'hidden'}
      transition={isExiting ? { duration: 0.25, ease: 'easeIn' } : undefined}
      onClick={navigateToSection}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigateToSection()
        }
      }}
      className="relative px-4 min-[420px]:px-6 md:px-16 py-4 md:py-6 max-w-7xl mx-auto cursor-pointer"
    >
      {/* Panel — content-width, clip-path masks it, spring overshoot on open.
          Suppressed below 768px (planet-only view).
          Top alignment:
            - 768-991 (single-col panel) → vertically centred on the
              planet (panel midpoint = planet midpoint)
            - >= 992 → panel bottom anchored 50px above the planet's
              bottom edge (original desktop design) */}
      {!isPlanetOnly && (
      <motion.div
        className="absolute z-[6]"
        style={{
          left: panelLeft,
          width: panelWidth,
          height: PANEL_HEIGHT,
          top:
            sectionWidth > 0 && sectionWidth < 992
              ? planetCenterY - PANEL_HEIGHT / 2
              : planetCenterY + planetHeight / 2 - 50 - PANEL_HEIGHT,
          backgroundColor: accentColor,
          borderRadius: 12,
          // padding is included in width so the clip-path (which insets by the
          // full width when hidden) fully covers it — otherwise the padding
          // strip peeks at 0 visible width.
          boxSizing: 'border-box',
          clipPath: getClipPath(),
          transition: transitionsOn
            ? 'clip-path 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
            : 'none',
          pointerEvents: panelState === 'open' ? 'auto' : 'none',
          padding: PANEL_PADDING,
          // Stay fully hidden until measured + transition-ready, so no partial
          // panel flashes before the section is sized on load.
          visibility: transitionsOn && sectionWidth > 0 ? 'visible' : 'hidden',
        }}
        initial={false}
        animate={{
          x: planetShift,
          opacity: isExiting ? 0 : 1,
        }}
        transition={
          isExiting
            ? { duration: 0.15, ease: 'easeIn' }
            : { type: 'spring', stiffness: 200, damping: 20, mass: 0.8 }
        }
      >
        <div
          className={`h-full flex ${!planetOnRight ? 'flex-row-reverse' : ''}`}
          style={{
            gap: COLUMN_GAP,
            ...(planetOnRight
              ? { paddingRight: planetSize / 2 }
              : { paddingLeft: planetSize / 2 }),
          }}
        >
          {/* Column 1: text — staggered reveal */}
          <motion.div
            className={`flex flex-col justify-between h-full shrink-0 ${!planetOnRight ? 'items-end text-right' : 'items-start text-left'}`}
            style={{ width: COLUMN_WIDTH }}
            initial={false}
            animate={{
              opacity: panelState === 'open' ? 1 : 0,
              y: panelState === 'open' ? 0 : 20,
            }}
            transition={{ duration: 0.4, delay: panelState === 'open' ? 0.15 : 0, ease: 'easeOut' }}
          >
            <div className={!planetOnRight ? 'flex flex-col items-end' : ''}>
              {TITLE_SECONDARY_IMAGES[id] ? (
                <img
                  src={TITLE_SECONDARY_IMAGES[id].src}
                  alt={moduleCard.heading}
                  style={{ width: TITLE_SECONDARY_IMAGES[id].w, height: TITLE_SECONDARY_IMAGES[id].h }}
                  className="mb-1"
                />
              ) : (
                <h3
                  className={`text-2xl md:text-3xl font-bold ${textColor} mb-1 font-[family-name:var(--font-display)]`}
                >
                  {moduleCard.heading}
                </h3>
              )}
              <p
                className={`text-intro ${textColor} mb-2`}
              >
                {moduleCard.tagline}
              </p>
              <p className={`${textMuted} text-body-sm`} style={{ lineHeight: '18px' }}>
                {moduleCard.description}
              </p>
            </div>
            <Button href={moduleCard.href} label={moduleCard.ctaLabel} />
          </motion.div>

          {/* Column 2: TV preview — broadcast still + subtitle + body */}
          {id === 'tv' && hasRightColumn && (
            <motion.div
              className="flex flex-col shrink-0"
              style={{ width: COLUMN_WIDTH }}
              initial={false}
              animate={{
                opacity: panelState === 'open' ? 1 : 0,
                y: panelState === 'open' ? 0 : 20,
              }}
              transition={{ duration: 0.4, delay: panelState === 'open' ? 0.3 : 0, ease: 'easeOut' }}
            >
              <div
                style={{
                  width: 323,
                  height: 204,
                  border: '2px solid black',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                <HomepageTvTeaser />
              </div>
              <p className={`text-intro ${textColor} mt-3`}>
                {moduleCard.items[0]?.title ?? 'On now'}
              </p>
              <HomepageTvSubtitle
                raw={moduleCard.items[0]?.subtitle}
                className={`${textMuted} text-body-sm mt-1`}
                style={{ lineHeight: '18px' }}
              />
            </motion.div>
          )}

          {/* Column 2: Magazine + Shop carousel — Swiper with chevron nav + touch */}
          {(id === 'magazine' || id === 'shop') && hasItems && hasRightColumn && (() => {
            const currentItem = moduleCard.items[swiperIndex] ?? moduleCard.items[0]
            const showNav = moduleCard.items.length > 1
            return (
              <motion.div
                className="flex flex-col shrink-0"
                style={{ width: COLUMN_WIDTH }}
                initial={false}
                animate={{
                  opacity: panelState === 'open' ? 1 : 0,
                  y: panelState === 'open' ? 0 : 20,
                }}
                transition={{ duration: 0.4, delay: panelState === 'open' ? 0.3 : 0, ease: 'easeOut' }}
              >
                <div className="relative" style={{ width: 323, height: 204 }}>
                  <div
                    style={{
                      width: 323,
                      height: 204,
                      border: '2px solid black',
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#e5e5e5',
                    }}
                  >
                    <Swiper
                      onSwiper={(s) => { swiperRef.current = s }}
                      onSlideChange={(s) => setSwiperIndex(s.realIndex)}
                      loop={moduleCard.items.length > 1}
                      speed={400}
                      className="w-full h-full"
                    >
                      {moduleCard.items.map((item) => (
                        <SwiperSlide key={item.id}>
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full" />
                          )}
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </div>
                  {showNav && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          swiperRef.current?.slidePrev()
                        }}
                        className={`${ctaBg} absolute top-1/2 -translate-y-1/2 flex items-center justify-center z-10`}
                        style={{ width: 30, height: 30, left: -15 }}
                        aria-label="Previous"
                      >
                        <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                          <path d="M8 1L2 7L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          swiperRef.current?.slideNext()
                        }}
                        className={`${ctaBg} absolute top-1/2 -translate-y-1/2 flex items-center justify-center z-10`}
                        style={{ width: 30, height: 30, right: -15 }}
                        aria-label="Next"
                      >
                        <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                          <path d="M2 1L8 7L2 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                <p className={`text-intro ${textColor} mt-3`}>
                  {currentItem?.title}
                </p>
                {currentItem?.subtitle && (
                  <p
                    className={`${textMuted} text-body-sm mt-1 line-clamp-3`}
                    style={{ lineHeight: '18px' }}
                  >
                    {currentItem.subtitle}
                  </p>
                )}
              </motion.div>
            )
          })()}

          {/* Column 2: legacy generic carousel — currently no section uses
              this branch since events + lab are single-column and the others
              have bespoke renderers. Kept for any future section that wants it. */}
          {id !== 'tv' && id !== 'magazine' && id !== 'shop' && id !== 'events' && id !== 'lab' && hasItems && (
            <motion.div
              className="flex items-center gap-2 shrink-0"
              style={{ width: COLUMN_WIDTH }}
              initial={false}
              animate={{
                opacity: panelState === 'open' ? 1 : 0,
                y: panelState === 'open' ? 0 : 20,
              }}
              transition={{ duration: 0.4, delay: panelState === 'open' ? 0.3 : 0, ease: 'easeOut' }}
            >
              {hasMoreBack && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCarouselIndex((i) => Math.max(0, i - 1))
                  }}
                  className={`w-7 h-7 rounded-full ${ctaBg} flex items-center justify-center text-xs shadow-md shrink-0`}
                  aria-label="Previous"
                >
                  ←
                </button>
              )}
              <div className="flex gap-2">
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className="w-24 md:w-28 bg-white overflow-hidden shadow-lg shrink-0"
                    style={{ borderLeft: `3px solid ${accentColor}` }}
                  >
                    <div className="aspect-[4/5] bg-gray-200 relative">
                      {item.thumbnailUrl && (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {item.badge && (
                        <span
                          className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 ${badgeColors} text-[9px] font-bold rounded`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-black text-[11px] font-medium line-clamp-2 leading-tight">
                        {item.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {hasMoreForward && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCarouselIndex((i) => i + 1)
                  }}
                  className={`w-7 h-7 rounded-full ${ctaBg} flex items-center justify-center text-xs shadow-md shrink-0`}
                  aria-label="Next"
                >
                  →
                </button>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
      )}

      {/* Title/subtitle — sits between panel (z-0) and planet (z-10), panel
          obscures it on open. Planet-only mode (< 768px) centres the
          block vertically on the planet's middle instead of anchoring
          its bottom edge there. */}
      <motion.div
        onMouseEnter={activate}
        onClick={() => isTouch && setIsActive((a) => !a)}
        className={`absolute z-[5] flex flex-col cursor-pointer ${planetOnRight ? 'items-end' : 'items-start'}`}
        style={{
          ...(isPlanetOnly
            ? { top: planetCenterY }
            : { bottom: `calc(100% - ${planetCenterY}px)` }),
          ...(() => {
            // Title/tagline block offset from the planet-side edge.
            // < 400px: tightened to 160px so the title fits next to a
            // more-offscreen planet without overflowing the viewport.
            const titleEdgeOffset =
              sectionWidth > 0 && sectionWidth < 400
                ? 160
                : sectionPadding + planetSize + 24
            return planetOnRight
              ? { right: titleEdgeOffset }
              : { left: titleEdgeOffset }
          })(),
        }}
        animate={{
          x: planetShift * 0.3,
          y: isPlanetOnly ? '-50%' : 0,
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {TITLE_IMAGES[id] ? (
          <img
            src={TITLE_IMAGES[id].src}
            alt={label}
            style={
              isPlanetOnly
                ? { height: 52, width: 'auto' }
                : { width: TITLE_IMAGES[id].w, height: TITLE_IMAGES[id].h }
            }
            className="mb-2"
          />
        ) : (
          <div
            className="w-48 md:w-64 h-12 md:h-16 rounded-md mb-2"
            style={{ backgroundColor: accentColor, opacity: 0.8 }}
            aria-label={label}
          />
        )}
        <p className={`text-intro text-white ${planetOnRight ? 'text-right' : 'text-left'}`}>
          {tagline}
        </p>
      </motion.div>

      {/* Planet — foreground, pointer-events off when panel is open so it
          doesn't cover panel buttons. Below 575px the planet motion.div
          gets a negative outer-side margin so the image overlaps the
          viewport edge by ~50px (the section's px-6 24px padding is
          neutralised + 50px of overlap). */}
      <div
        className={`relative z-10 flex pointer-events-none ${planetOnRight ? 'justify-end' : 'justify-start'}`}
      >
        <motion.div
          onMouseEnter={activate}
          style={(() => {
            // Only the planet itself is interactive (container is click-through
            // so the title block beneath still receives hover). Off when open
            // so it doesn't cover the panel buttons.
            const pe: 'none' | 'auto' = panelState === 'open' ? 'none' : 'auto'
            const base = { pointerEvents: pe } as React.CSSProperties
            // Push planet past the section edge so it doesn't dominate
            // the centre horizontally. Tighter on the smallest phones.
            if (sectionWidth === 0 || sectionWidth >= 575) return base
            const offset = sectionWidth < 400 ? -104 : -74
            return planetOnRight
              ? { ...base, marginRight: offset }
              : { ...base, marginLeft: offset }
          })()}
          animate={{
            x: isExiting ? planetShift + planetExitOffset : planetShift,
            opacity: isExiting ? 0 : 1,
          }}
          transition={
            isExiting
              ? { duration: 0.3, ease: 'easeIn' }
              : { type: 'spring', stiffness: 200, damping: 20, mass: 0.8 }
          }
        >
          <button
            ref={planetBtnRef}
            onClick={() => isTouch && setIsActive((a) => !a)}
            className="cursor-pointer group"
            aria-label={`Open ${label}`}
          >
            {(() => {
              const planetSrc =
                planetImageUrl || PLANET_IMAGES[id] || '/imgs/planet_tv.png'
              const planetClass =
                'w-[220px] md:w-[350px] min-[992px]:w-[411px] h-auto object-contain transition-transform group-hover:scale-[1.03]'
              // Local assets go through next/image (AVIF + resized to display
              // size); CMS/remote URLs stay as a plain <img> (no host config).
              return planetSrc.startsWith('/') ? (
                <Image
                  src={planetSrc}
                  alt={`${label} planet`}
                  width={822}
                  height={860}
                  sizes="(min-width: 992px) 411px, (min-width: 768px) 350px, 220px"
                  className={planetClass}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={planetSrc} alt={`${label} planet`} className={planetClass} />
              )
            })()}
          </button>
        </motion.div>
      </div>
    </motion.section>
  )
}
