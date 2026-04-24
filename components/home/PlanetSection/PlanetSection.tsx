'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { planetSectionVariants } from '@/lib/animation/homepage'
import type { PlanetSectionProps } from './PlanetSection.types'

const POSITION_LAYOUTS = {
  'upper-right': 'right',
  'lower-left': 'left',
  'lower-right': 'right',
} as const

const SECTION_PADDING = 64
const PLANET_SIZE = 411
const PANEL_HEIGHT = 320
const PEEK_VISIBLE = 20
const COLUMN_WIDTH = 340
const PANEL_PADDING = 20
const COLUMN_GAP = 20

// Title images — displayed at half intrinsic size
const TITLE_IMAGES: Record<string, { src: string; w: number; h: number }> = {
  magazine: { src: '/imgs/title_magazine.png', w: 369 / 2, h: 118 / 2 },
  events: { src: '/imgs/title_events.png', w: 324 / 2, h: 100 / 2 },
  shop: { src: '/imgs/title_shop.png', w: 195 / 2, h: 117 / 2 },
  lab: { src: '/imgs/title_lab.png', w: 202 / 2, h: 116 / 2 },
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
}: PlanetSectionProps) {
  const lightBgs = ['#FBC000', '#FFE566', '#FFE066', '#FFEB3B', '#FFF176']
  const useDarkText = lightBgs.some(
    (c) => c.toLowerCase() === accentColor.toLowerCase()
  )
  const textColor = useDarkText ? 'text-black' : 'text-white'
  const textMuted = useDarkText ? 'text-black/70' : 'text-white/70'
  const ctaBg = useDarkText
    ? 'bg-black text-white hover:bg-black/80'
    : 'bg-white text-black hover:bg-white/90'
  const badgeColors = useDarkText
    ? 'bg-black text-white'
    : 'bg-white'

  const sectionRef = useRef<HTMLDivElement>(null)
  const planetBtnRef = useRef<HTMLButtonElement>(null)
  const { ref: revealRef, isVisible } = useScrollReveal(0.1)

  const [isActive, setIsActive] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [sectionWidth, setSectionWidth] = useState(0)
  const [planetCenterY, setPlanetCenterY] = useState(0)
  const [isTouch, setIsTouch] = useState(false)

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
    }
    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(section)
    return () => ro.disconnect()
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

  const planetOnRight = POSITION_LAYOUTS[planetPosition] === 'right'
  const [carouselIndex, setCarouselIndex] = useState(0)

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
      animate={isVisible ? 'visible' : 'hidden'}
      className="relative px-6 md:px-16 py-4 md:py-6 max-w-7xl mx-auto"
      onMouseLeave={() => isActive && setIsActive(false)}
    >
      {/* Panel — content-width, clip-path masks it */}
      <div
        className="absolute z-[6]"
        style={{
          left: panelLeft,
          width: panelWidth,
          height: PANEL_HEIGHT,
          top: planetCenterY - PANEL_HEIGHT / 2,
          backgroundColor: accentColor,
          borderRadius: 12,
          clipPath: getClipPath(),
          transition: 'clip-path 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          pointerEvents: panelState === 'open' ? 'auto' : 'none',
          padding: PANEL_PADDING,
        }}
      >
        <div
          className="h-full flex"
          style={{
            gap: COLUMN_GAP,
            ...(planetOnRight
              ? { paddingRight: PLANET_SIZE / 2 }
              : { paddingLeft: PLANET_SIZE / 2 }),
          }}
        >
          {/* Column 1: text */}
          <div
            className="flex flex-col justify-center shrink-0"
            style={{ width: COLUMN_WIDTH }}
          >
            <h3
              className={`text-2xl md:text-3xl font-bold ${textColor} mb-1 font-[family-name:var(--font-display)]`}
            >
              {moduleCard.heading}
            </h3>
            <p
              className={`${textColor} font-medium text-sm md:text-base mb-2`}
            >
              {moduleCard.tagline}
            </p>
            <p className={`${textMuted} text-sm mb-5 leading-relaxed`}>
              {moduleCard.description}
            </p>
            <Link
              href={moduleCard.href}
              className={`inline-block rounded-full px-5 py-2 font-medium text-sm ${ctaBg} transition-colors w-fit`}
            >
              {moduleCard.ctaLabel}
            </Link>
          </div>

          {/* Column 2: items */}
          {hasItems && (
            <div
              className="flex items-center gap-2 shrink-0"
              style={{ width: COLUMN_WIDTH }}
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
            </div>
          )}
        </div>
      </div>

      {/* Title/subtitle — sits between panel (z-0) and planet (z-10), panel obscures it on open */}
      <motion.div
        className={`absolute z-[5] flex flex-col ${planetOnRight ? 'items-end' : 'items-start'}`}
        style={{
          top: planetCenterY,
          transform: 'translateY(-50%)',
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

      {/* Planet — foreground */}
      <div
        className={`relative z-10 flex ${planetOnRight ? 'justify-end' : 'justify-start'}`}
      >
        <motion.div
          onMouseEnter={() => !isTouch && setIsActive(true)}
          animate={{ x: planetShift }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            ref={planetBtnRef}
            onClick={() => isTouch && setIsActive((a) => !a)}
            className="cursor-pointer group"
            aria-label={`Open ${label}`}
          >
            <img
              src={PLANET_IMAGES[id] || '/imgs/planet_tv.png'}
              alt={`${label} planet`}
              className="w-48 md:w-[411px] h-auto object-contain transition-transform group-hover:scale-[1.03]"
            />
          </button>
        </motion.div>
      </div>
    </motion.section>
  )
}
