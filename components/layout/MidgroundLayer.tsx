'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

// Behind the planets/panels, slower than content
// image items displayed at half intrinsic size

const FLYING_ITEMS = [
  { baseY: 1600, speed: 0.7, image: '/imgs/item_mid_spaceship.png', w: 232 / 2, h: 127 / 2, duration: 18 },
]

const MIDGROUND_ITEMS = [
  { x: 12, baseY: 600, image: '/imgs/item_moon.png', w: 288 / 2, h: 290 / 2, speed: 0.75 },
  { x: 70, baseY: 1200, image: '/imgs/item_planet.png', w: 416 / 2, h: 280 / 2, speed: 0.7 },
  { x: 45, baseY: 2000, image: '/imgs/item_satellite.png', w: 377 / 2, h: 282 / 2, speed: 0.75 },
]

export default function MidgroundLayer() {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const flyingRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (theme !== 'cosy-dynamics') return

    const mql = window.matchMedia('(max-width: 767px)')
    if (mql.matches) return

    let ticking = false

    const update = () => {
      const sy = window.scrollY

      // Static midground items
      const container = containerRef.current
      if (container) {
        const children = container.children
        for (let i = 0; i < children.length; i++) {
          const el = children[i] as HTMLElement
          const speed = MIDGROUND_ITEMS[i].speed
          el.style.transform = `translateY(${-sy * speed}px)`
        }
      }

      // Flying items — use translateY for vertical parallax (no reflow)
      const flyingContainer = flyingRef.current
      if (flyingContainer) {
        const flyingChildren = flyingContainer.children
        for (let i = 0; i < flyingChildren.length; i++) {
          const el = flyingChildren[i] as HTMLElement
          const baseY = FLYING_ITEMS[i].baseY
          const speed = FLYING_ITEMS[i].speed
          el.style.transform = `translateY(${baseY - sy * speed}px)`
        }
      }

      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        rafRef.current = requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [theme])

  if (theme !== 'cosy-dynamics') return null

  return (
    <>
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden hidden md:block"
      aria-hidden="true"
    >
      {MIDGROUND_ITEMS.map((item, i) => (
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
            willChange: 'transform',
          }}
        />
      ))}
    </div>

    <style>{`
      @keyframes fly-across {
        0% { transform: translateX(100vw); }
        100% { transform: translateX(calc(-100% - 100px)); }
      }
    `}</style>

    {/* Flying items — vertical position via translateY, horizontal via CSS animation */}
    <div
      ref={flyingRef}
      className="fixed inset-0 pointer-events-none z-[1] hidden md:block"
      aria-hidden="true"
    >
      {FLYING_ITEMS.map((item, i) => (
        <div
          key={`fly-${i}`}
          className="absolute left-0 right-0"
          style={{
            top: 0,
            willChange: 'transform',
          }}
        >
          <img
            src={item.image}
            alt=""
            style={{
              width: item.w,
              height: item.h,
              animation: `fly-across ${item.duration}s linear infinite`,
            }}
          />
        </div>
      ))}
    </div>
    </>
  )
}
