'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useParallax } from '@/hooks/useParallax'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import {
  planetSectionVariants,
  PLANET_PARALLAX_FACTOR,
} from '@/lib/animation/homepage'
import type { PlanetSectionProps } from './PlanetSection.types'

// Desktop layout: planet on one side, text/panel on the other.
// 'right' = planet right, text/panel left.
// 'left' = planet left, text/panel right.
const POSITION_LAYOUTS = {
  'upper-right': 'right',
  'lower-left': 'left',
  'lower-right': 'right',
} as const

export default function PlanetSection({
  id,
  label,
  tagline,
  accentColor,
  planetPosition,
  moduleCard,
}: PlanetSectionProps) {
  const lightBgs = ['#FFE566', '#FFE066', '#FFEB3B', '#FFF176']
  const useDarkText = lightBgs.some(
    (c) => c.toLowerCase() === accentColor.toLowerCase()
  )
  const textColor = useDarkText ? 'text-black' : 'text-white'
  const textMuted = useDarkText ? 'text-black/70' : 'text-white/70'
  const cardBg = useDarkText ? 'bg-black/10' : 'bg-white/20'
  const cardImgBg = useDarkText ? 'bg-black/5' : 'bg-white/10'
  const ctaBg = useDarkText
    ? 'bg-black text-white hover:bg-black/80'
    : 'bg-white text-black hover:bg-white/90'
  const badgeColors = useDarkText
    ? 'bg-black text-white'
    : 'bg-white'

  const sectionRef = useRef<HTMLDivElement>(null)
  const parallaxOffset = useParallax(PLANET_PARALLAX_FACTOR, sectionRef)
  const { ref, isVisible } = useScrollReveal(0.1)
  const [isOpen, setIsOpen] = useState(false)

  // Detect touch devices so we don't fire synthetic hover events on tap.
  // Hover-to-open makes no sense on touch — clicks toggle instead.
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    const detect = () => {
      if (
        typeof window !== 'undefined' &&
        (window.matchMedia('(hover: none)').matches ||
          'ontouchstart' in window)
      ) {
        setIsTouch(true)
      }
    }
    detect()
  }, [])

  const hoverHandlers = isTouch
    ? {}
    : {
        onMouseEnter: () => setIsOpen(true),
        onMouseLeave: () => setIsOpen(false),
      }

  const planetOnRight = POSITION_LAYOUTS[planetPosition] === 'right'
  const [carouselIndex, setCarouselIndex] = useState(0)

  const visibleItems = moduleCard.items.slice(
    carouselIndex,
    carouselIndex + 2
  )
  const hasMoreForward =
    carouselIndex + 2 < moduleCard.items.length
  const hasMoreBack = carouselIndex > 0

  return (
    <motion.section
      ref={(node) => {
        ;(ref as React.MutableRefObject<HTMLDivElement | null>).current =
          node as HTMLDivElement | null
        ;(sectionRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node as HTMLDivElement | null
      }}
      variants={planetSectionVariants}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      {...hoverHandlers}
      className={`relative flex items-center gap-6 md:gap-0 px-6 md:px-16 py-16 md:py-24 max-w-7xl mx-auto ${
        planetOnRight ? 'flex-row' : 'flex-row-reverse'
      }`}
    >
      {/* Text side / Slide-out panel — toggles between collapsed label and expanded panel */}
      <div className="flex-1 min-w-0 relative z-20">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.button
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsOpen(true)}
              className={`block text-left group ${
                planetOnRight ? 'text-left' : 'text-right'
              }`}
            >
              <h2
                className="text-4xl md:text-6xl font-bold mb-2 font-[family-name:var(--font-display)] group-hover:opacity-80 transition-opacity"
                style={{ color: accentColor }}
              >
                {label}
              </h2>
              <p className="text-secondary text-base md:text-lg max-w-sm">
                {tagline}
              </p>
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              layout
              initial={{ opacity: 0, x: planetOnRight ? -40 : 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: planetOnRight ? -40 : 40 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-md shadow-2xl relative overflow-visible"
              style={{ backgroundColor: accentColor }}
            >
              {/* Close tab */}
              <button
                onClick={() => setIsOpen(false)}
                className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  useDarkText
                    ? 'bg-black text-white'
                    : 'bg-white text-black'
                } shadow-lg z-10`}
                aria-label="Close"
              >
                ✕
              </button>

              <div className="p-5 md:p-7">
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
                <p
                  className={`${textMuted} text-sm mb-5 leading-relaxed max-w-md`}
                >
                  {moduleCard.description}
                </p>

                <Link
                  href={moduleCard.href}
                  className={`inline-block rounded-full px-5 py-2 font-medium text-sm ${ctaBg} transition-colors`}
                >
                  {moduleCard.ctaLabel}
                </Link>
              </div>

              {/* Item carousel — extends out from the panel on desktop */}
              {moduleCard.items.length > 0 && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 hidden md:flex items-center gap-3 ${
                    planetOnRight ? 'left-full ml-4' : 'right-full mr-4'
                  }`}
                >
                  {hasMoreBack && (
                    <button
                      onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
                      className={`w-8 h-8 rounded-full ${ctaBg} flex items-center justify-center text-sm shadow-lg`}
                      aria-label="Previous"
                    >
                      ←
                    </button>
                  )}
                  <div className="flex gap-3">
                    {visibleItems.map((item) => (
                      <div
                        key={item.id}
                        className={`w-28 md:w-32 ${cardBg} overflow-hidden shadow-lg`}
                        style={{
                          borderLeft: `3px solid ${accentColor}`,
                          backgroundColor: useDarkText ? '#fff' : '#fff',
                        }}
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
                      onClick={() => setCarouselIndex((i) => i + 1)}
                      className={`w-8 h-8 rounded-full ${ctaBg} flex items-center justify-center text-sm shadow-lg`}
                      aria-label="Next"
                    >
                      →
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Planet side */}
      <div className="flex-1 flex justify-center relative">
        <button
          onClick={() => setIsOpen((o) => !o)}
          className="relative cursor-pointer group"
          style={{ transform: `translateY(${-parallaxOffset}px)` }}
          aria-label={`Open ${label}`}
        >
          {/* Planet placeholder — Duffy SVG drop-in */}
          <div
            className="w-48 h-48 md:w-72 md:h-72 rounded-full border-4 flex items-center justify-center text-sm transition-transform group-hover:scale-[1.03]"
            style={{
              borderColor: accentColor,
              backgroundColor: `${accentColor}15`,
              color: accentColor,
            }}
          >
            <span className="opacity-50">planet-{id}</span>
          </div>
        </button>
      </div>

      {/* Mobile item carousel (below, full width) */}
      {isOpen && moduleCard.items.length > 0 && (
        <div className="md:hidden absolute left-6 right-6 bottom-4 flex gap-3 overflow-x-auto scrollbar-hide">
          {moduleCard.items.map((item) => (
            <div
              key={item.id}
              className="shrink-0 w-28 bg-white overflow-hidden shadow-lg"
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
              </div>
              <div className="p-2">
                <p className="text-black text-[11px] font-medium line-clamp-2">
                  {item.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  )
}
