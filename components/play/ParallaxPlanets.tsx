'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'
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

  // Parallax + side-by-side layout only from 992px up; below that the planets
  // stack and sit still.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 992px)')
    const sync = () => setIsDesktop(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  // Static fallback so the WhatsNext shadow still renders (just doesn't move)
  // when parallax is off (stacked, < 992).
  const staticY = useMotionValue(0)

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
    <section
      ref={containerRef}
      className="relative px-6 py-16 md:py-24 mt-[200px] md:mt-0 overflow-visible"
      style={isDesktop ? { paddingBottom: 400 } : { paddingBottom: 200 }}
    >
      <div className="max-w-6xl mx-auto flex flex-col min-[992px]:flex-row items-center justify-center overflow-visible" style={{ gap: isDesktop ? 180 : 220 }}>
        <motion.div
          className="relative isolate z-0"
          style={{ y: isDesktop ? planet2Y : -100, willChange: 'transform' }}
        >
          <WhatsNextPlanet
            body={whatsNext.body}
            ctaLabel={whatsNext.ctaLabel}
            ctaHref={whatsNext.ctaHref}
            shadowY={isDesktop ? shadowY : staticY}
            stacked={!isDesktop}
          />
        </motion.div>
        <motion.div
          className="relative isolate order-first min-[992px]:order-none z-10"
          style={{ y: isDesktop ? planet1Y : 0, willChange: 'transform' }}
        >
          <ExpertisePlanet intro={expertise.intro} bullets={expertise.bullets} />
        </motion.div>
      </div>
    </section>
  )
}
