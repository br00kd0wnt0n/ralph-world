'use client'

import { useState } from 'react'
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
  const parallaxOffset = useParallax(PLANET_PARALLAX_FACTOR)
  const { ref, isVisible } = useScrollReveal(0.1)
  const [flyoutOpen, setFlyoutOpen] = useState(false)

  return (
    <motion.section
      ref={ref}
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
                <h3 className="text-lg font-bold text-white mb-1">
                  {moduleCard.heading}
                </h3>
                <p className="text-white/80 text-xs mb-1">
                  {moduleCard.tagline}
                </p>
                <p className="text-white/70 text-sm mb-4 line-clamp-3">
                  {moduleCard.description}
                </p>

                {/* Item cards */}
                <div className="flex gap-3 mb-4 overflow-x-auto scrollbar-hide">
                  {moduleCard.items.map((item) => (
                    <div
                      key={item.id}
                      className="shrink-0 w-32 rounded-lg bg-white/20 overflow-hidden"
                    >
                      <div className="w-full h-20 bg-white/10 relative">
                        {item.badge && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-white text-[10px] font-bold rounded" style={{ color: accentColor }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-white text-xs font-medium line-clamp-2">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-white/60 text-[10px] mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href={moduleCard.href}
                  className="block text-center text-sm font-medium text-white bg-white/20 rounded-full py-2 hover:bg-white/30 transition-colors"
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
