'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

// Behind the planets/panels, slower than content, duller.
// speed < 1 = slower than content (feels further away)
// image items displayed at half intrinsic size
type MidgroundItem =
  | { x: number; baseY: number; size: number; color: string; speed: number; image?: undefined }
  | { x: number; baseY: number; speed: number; image: string; w: number; h: number; size?: undefined; color?: undefined }

const MIDGROUND_ITEMS: MidgroundItem[] = [
  { x: 12, baseY: 200, size: 120, color: '#EA128B', speed: 0.7 },
  { x: 82, baseY: 600, image: '/imgs/item_moon.png', w: 288 / 2, h: 290 / 2, speed: 0.75 },
  { x: 35, baseY: 1100, size: 110, color: '#7B3FE4', speed: 0.65 },
  { x: 70, baseY: 1200, image: '/imgs/item_planet.png', w: 416 / 2, h: 280 / 2, speed: 0.7 },
  { x: 20, baseY: 2300, size: 80, color: '#FBC000', speed: 0.8 },
  { x: 88, baseY: 2800, size: 130, color: '#44B758', speed: 0.65 },
  { x: 45, baseY: 2000, image: '/imgs/item_satellite.png', w: 377 / 2, h: 282 / 2, speed: 0.75 },
  { x: 8, baseY: 4100, size: 110, color: '#5FBCBF', speed: 0.7 },
  { x: 60, baseY: 4700, size: 85, color: '#7B3FE4', speed: 0.8 },
  { x: 30, baseY: 5200, size: 100, color: '#EE6626', speed: 0.65 },
]

export default function MidgroundLayer() {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (theme !== 'cosy-dynamics') return

    const mql = window.matchMedia('(max-width: 767px)')
    if (mql.matches) return

    const onScroll = () => {
      const container = containerRef.current
      if (!container) return
      const sy = window.scrollY
      const children = container.children
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement
        const speed = MIDGROUND_ITEMS[i].speed
        el.style.transform = `translateY(${-sy * speed}px)`
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [theme])

  if (theme !== 'cosy-dynamics') return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden hidden md:block"
      aria-hidden="true"
    >
      {MIDGROUND_ITEMS.map((item, i) =>
        item.image ? (
          <img
            key={i}
            src={item.image}
            alt=""
            className="absolute"
            style={{
              left: `${item.x}%`,
              top: item.baseY,
              width: item.w,
              height: item.h,
              opacity: 1,
              willChange: 'transform',
            }}
          />
        ) : (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${item.x}%`,
              top: item.baseY,
              width: item.size,
              height: item.size,
              backgroundColor: item.color,
              opacity: 1,
              willChange: 'transform',
            }}
          />
        )
      )}
    </div>
  )
}
