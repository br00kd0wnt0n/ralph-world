'use client'

import { useEffect, useRef, useState } from 'react'

interface FooterPlanetProps {
  tagline?: string
}

export default function FooterPlanet({ tagline = 'The Entertainment People' }: FooterPlanetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [translateY, setTranslateY] = useState(100)

  useEffect(() => {
    function handleScroll() {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight

      // Calculate progress based on element bottom reaching viewport bottom
      // When element bottom is below viewport (not visible), progress = 0
      // When element bottom reaches viewport bottom (fully scrolled), progress = 1
      const elementBottom = rect.bottom

      // Start when element enters viewport (bottom > 0)
      // Complete when element bottom reaches or passes viewport bottom
      const distanceFromViewportBottom = elementBottom - windowHeight

      // Animation range: from 300px below viewport to at viewport bottom
      const startDistance = 300
      const progress = Math.max(0, Math.min(1, 1 - (distanceFromViewportBottom / startDistance)))

      // Translate from 100px to 0px
      setTranslateY(100 * (1 - progress))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative flex justify-center overflow-hidden"
      style={{ paddingTop: 180, marginBottom: -1 }}
    >
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <img
          src="/imgs/footer_planet.png"
          alt=""
          style={{ width: 2898 / 2, height: 484 / 2 }}
          className="max-w-none"
        />
        <div
          className="absolute inset-0 flex flex-col items-center justify-end"
          style={{ paddingBottom: 28 }}
        >
          <img
            src="/ralph-wordmark.png"
            alt="ralph"
            style={{ height: 76, width: 'auto', filter: 'brightness(0)' }}
            className="mb-3"
          />
          <img
            src="/imgs/text_the_entertainment_people.png"
            alt={tagline}
            style={{ width: 958 / 2, height: 79 / 2 }}
          />
        </div>
      </div>
    </div>
  )
}
