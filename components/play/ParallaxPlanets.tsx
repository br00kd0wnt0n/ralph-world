'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import WhatsNextPlanet from './WhatsNextPlanet'
import ExpertisePlanet from './ExpertisePlanet'

interface ParallaxPlanetsProps {
  whatsNext: {
    body: string
    ctaLabel: string
    ctaHref: string
  }
  expertise: {
    intro: string
    bullets: { heading: string; body: string }[]
  }
}

// Spring config for smooth parallax
const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }

export default function ParallaxPlanets({ whatsNext, expertise }: ParallaxPlanetsProps) {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  // Smooth the scroll progress with a spring
  const smoothProgress = useSpring(scrollYProgress, springConfig)

  // Planet 2 (WhatsNext) starts higher, moves down as you scroll
  const planet2Y = useTransform(smoothProgress, [0, 1], [-200, 500])

  // Planet 1 (Expertise) starts lower, moves up as you scroll
  const planet1Y = useTransform(smoothProgress, [0, 1], [200, -300])

  // Shadow moves in same direction as planet 1 (up as you scroll)
  const shadowY = useTransform(smoothProgress, [0, 1], [-100, -550])

  return (
    <section ref={containerRef} className="relative px-6 py-16 md:py-24 overflow-visible" style={{ paddingBottom: 400 }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center overflow-visible" style={{ gap: 180 }}>
        <motion.div
          className="relative isolate"
          style={{ y: planet2Y, willChange: 'transform' }}
        >
          <WhatsNextPlanet
            body={whatsNext.body}
            ctaLabel={whatsNext.ctaLabel}
            ctaHref={whatsNext.ctaHref}
            shadowY={shadowY}
          />
        </motion.div>
        <motion.div
          className="relative isolate"
          style={{ y: planet1Y, willChange: 'transform' }}
        >
          <ExpertisePlanet intro={expertise.intro} bullets={expertise.bullets} />
        </motion.div>
      </div>
    </section>
  )
}
