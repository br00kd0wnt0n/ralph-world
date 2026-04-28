'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { planetSectionVariants } from '@/lib/animation/homepage'
import { usePageTransition } from '@/context/PageTransitionContext'
import {
  planetExitVariants,
  PLANET_EXIT_DIRECTIONS,
} from '@/lib/animation/page-transitions'
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
  const { isExiting } = usePageTransition()

  const [isActive, setIsActive] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [sectionWidth, setSectionWidth] = useState(0)
  const [planetCenterY, setPlanetCenterY] = useState(0)
  const [planetHeight, setPlanetHeight] = useState(0)
  const [isTouch, setIsTouch] = useState(false)
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
    if (!isTouch) setIsActive(true)
  }, [isTouch])

  const planetOnRight = POSITION_LAYOUTS[planetPosition] === 'right'
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Get exit direction based on planet position (left planets slide left, right slide right)
  const exitDirection = PLANET_EXIT_DIRECTIONS[id] || (planetOnRight ? 'right' : 'left')
  const exitVariants = planetExitVariants(exitDirection)

  const visibleItems = moduleCard.items.slice(carouselIndex, carouselIndex + 2)
  const hasMoreForward = carouselIndex + 2 < moduleCard.items.length
  const hasMoreBack = carouselIndex > 0

  const panelState = isActive ? 'open' : isInView ? 'peek' : 'hidden'

  const planetLeft = planetOnRight
    ? sectionWidth - SECTION_PADDING - PLANET_SIZE
    : SECTION_PADDING

  // Panel = content width + half planet (the half that tucks behind the planet)
  const hasItems = moduleCard.items.length > 0
  const contentWidth = hasItems
    ? PANEL_PADDING * 2 + COLUMN_WIDTH * 2 + COLUMN_GAP
    : PANEL_PADDING * 2 + COLUMN_WIDTH
  const halfPlanet = PLANET_SIZE / 2
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

  // Combine scroll reveal with exit animation
  const exitAnimateState = isExiting
    ? { opacity: 0, x: exitDirection === 'left' ? -80 : 80 }
    : undefined

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
      animate={
        isExiting
          ? exitAnimateState
          : isVisible
            ? 'visible'
            : 'hidden'
      }
      transition={isExiting ? { duration: 0.1, ease: 'easeIn' } : undefined}
      className="relative px-6 md:px-16 py-4 md:py-6 max-w-7xl mx-auto"
    >
      {/* Panel — content-width, clip-path masks it, spring overshoot on open */}
      <motion.div
        className="absolute z-[6]"
        style={{
          left: panelLeft,
          width: panelWidth,
          height: PANEL_HEIGHT,
          top: planetCenterY + planetHeight / 2 - 50 - PANEL_HEIGHT,
          backgroundColor: accentColor,
          borderRadius: 12,
          clipPath: getClipPath(),
          transition: 'clip-path 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          pointerEvents: panelState === 'open' ? 'auto' : 'none',
          padding: PANEL_PADDING,
        }}
        initial={false}
        animate={{ x: planetShift }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, mass: 0.8 }}
      >
        <div
          className={`h-full flex ${!planetOnRight ? 'flex-row-reverse' : ''}`}
          style={{
            gap: COLUMN_GAP,
            ...(planetOnRight
              ? { paddingRight: PLANET_SIZE / 2 }
              : { paddingLeft: PLANET_SIZE / 2 }),
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

          {/* Column 2: items — staggered reveal, slightly later */}
          {hasItems && (
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

      {/* Title/subtitle — sits between panel (z-0) and planet (z-10), panel obscures it on open */}
      <motion.div
        className={`absolute z-[5] flex flex-col ${planetOnRight ? 'items-end' : 'items-start'}`}
        style={{
          bottom: `calc(100% - ${planetCenterY}px)`,
          ...(planetOnRight
            ? { right: SECTION_PADDING + PLANET_SIZE + 24 }
            : { left: SECTION_PADDING + PLANET_SIZE + 24 }),
        }}
        animate={{ x: planetShift * 0.3 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {TITLE_IMAGES[id] ? (
          <img
            src={TITLE_IMAGES[id].src}
            alt={label}
            style={{ width: TITLE_IMAGES[id].w, height: TITLE_IMAGES[id].h }}
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

      {/* Planet — foreground, pointer-events off when panel is open so it doesn't cover panel buttons */}
      <div
        className={`relative z-10 flex ${planetOnRight ? 'justify-end' : 'justify-start'}`}
        style={{ pointerEvents: panelState === 'open' ? 'none' : 'auto' }}
      >
        <motion.div
          onMouseEnter={activate}
          animate={{ x: planetShift }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, mass: 0.8 }}
        >
          <button
            ref={planetBtnRef}
            onClick={() => isTouch && setIsActive((a) => !a)}
            className="cursor-pointer group"
            aria-label={`Open ${label}`}
          >
            <img
              src={planetImageUrl || PLANET_IMAGES[id] || '/imgs/planet_tv.png'}
              alt={`${label} planet`}
              className="w-48 md:w-[411px] h-auto object-contain transition-transform group-hover:scale-[1.03]"
            />
          </button>
        </motion.div>
      </div>
    </motion.section>
  )
}
