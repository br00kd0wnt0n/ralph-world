'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useParallax } from '@/hooks/useParallax'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import {
  planetSectionVariants,
  moduleCardVariants,
  PLANET_PARALLAX_FACTOR,
} from '@/lib/animation/homepage'
import type { PlanetSectionProps } from './PlanetSection.types'

const POSITION_CLASSES = {
  'upper-right': 'md:flex-row-reverse',
  'lower-left': 'md:flex-row',
  'lower-right': 'md:flex-row-reverse',
}

export default function PlanetSection({
  id,
  label,
  tagline,
  accentColor,
  planetPosition,
  moduleCard,
}: PlanetSectionProps) {
  // Light backgrounds (yellow, etc) need dark text
  const lightBgs = ['#FFE566', '#FFE066', '#FFEB3B', '#FFF176']
  const useDarkText = lightBgs.some(
    (c) => c.toLowerCase() === accentColor.toLowerCase()
  )
  const textColor = useDarkText ? 'text-black' : 'text-white'
  const textMuted = useDarkText ? 'text-black/70' : 'text-white/70'
  const textSubtle = useDarkText ? 'text-black/80' : 'text-white/80'
  const textFaint = useDarkText ? 'text-black/60' : 'text-white/60'
  const cardBg = useDarkText ? 'bg-black/10' : 'bg-white/20'
  const cardImgBg = useDarkText ? 'bg-black/5' : 'bg-white/10'
  const ctaBg = useDarkText ? 'bg-black/10 hover:bg-black/20' : 'bg-white/20 hover:bg-white/30'

  const sectionRef = useRef<HTMLDivElement>(null)
  const parallaxOffset = useParallax(PLANET_PARALLAX_FACTOR, sectionRef)
  const { ref, isVisible } = useScrollReveal(0.1)
  const [flyoutOpen, setFlyoutOpen] = useState(false)

  return (
    <motion.section
      ref={(node) => {
        // Share DOM node between scroll reveal and parallax refs
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        sectionRef.current = node
      }}
      variants={planetSectionVariants}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      className={`relative flex flex-col ${POSITION_CLASSES[planetPosition]} items-center gap-8 md:gap-16 px-6 md:px-16 py-20 md:py-32 max-w-7xl mx-auto`}
    >
      {/* Text side */}
      <div className="flex-1 max-w-md">
        <h2
          className="text-3xl md:text-5xl font-bold mb-3 font-[family-name:var(--font-display)]"
          style={{ color: accentColor }}
        >
          {label}
        </h2>
        <p className="text-secondary text-lg">{tagline}</p>
      </div>

      {/* Planet side */}
      <div className="flex-1 flex justify-center relative">
        <div
          className="relative cursor-pointer"
          onClick={() => setFlyoutOpen(!flyoutOpen)}
          onMouseEnter={() => setFlyoutOpen(true)}
          onMouseLeave={() => setFlyoutOpen(false)}
        >
          {/* Planet placeholder — Duffy SVG drop-in */}
          <div
            className="w-48 h-48 md:w-64 md:h-64 rounded-full border-4 flex items-center justify-center text-sm"
            style={{
              borderColor: accentColor,
              backgroundColor: `${accentColor}15`,
              color: accentColor,
              transform: `translateY(${-parallaxOffset}px)`,
            }}
          >
            <span className="opacity-50">planet-{id}</span>
          </div>

          {/* Module flyout card */}
          <AnimatePresence>
            {flyoutOpen && (
              <motion.div
                variants={moduleCardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 md:w-80 rounded-2xl p-5 shadow-2xl"
                style={{ backgroundColor: accentColor }}
              >
                <h3 className={`text-lg font-bold ${textColor} mb-1`}>
                  {moduleCard.heading}
                </h3>
                <p className={`${textSubtle} text-xs mb-1`}>
                  {moduleCard.tagline}
                </p>
                <p className={`${textMuted} text-sm mb-4 line-clamp-3`}>
                  {moduleCard.description}
                </p>

                {/* Item cards */}
                <div className="flex gap-3 mb-4 overflow-x-auto scrollbar-hide">
                  {moduleCard.items.map((item) => (
                    <div
                      key={item.id}
                      className={`shrink-0 w-32 rounded-lg ${cardBg} overflow-hidden`}
                    >
                      <div className={`w-full h-20 ${cardImgBg} relative`}>
                        {item.badge && (
                          <span className={`absolute top-1 left-1 px-1.5 py-0.5 ${useDarkText ? 'bg-black text-ralph-yellow' : 'bg-white'} text-[10px] font-bold rounded`} style={useDarkText ? undefined : { color: accentColor }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className={`${textColor} text-xs font-medium line-clamp-2`}>
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className={`${textFaint} text-[10px] mt-0.5`}>
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href={moduleCard.href}
                  className={`block text-center text-sm font-medium ${textColor} ${ctaBg} rounded-full py-2 transition-colors`}
                >
                  {moduleCard.ctaLabel}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  )
}
