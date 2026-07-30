'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import AlienBurnSaucer from '@/components/anim/AlienBurnSaucer'
import type { AnimationName } from '@/lib/anim/animations'

// Foreground parallax items — faster than content, in front of planets/panels
// image items displayed at half intrinsic size
// the spaceship was replaced by an animated saucer on ForegroundCanvas.
const FOREGROUND_ITEMS: {
  x: number
  baseY: number
  w: number
  h: number
  speed: number
  image?: string
  sprite?: AnimationName
}[] = [
  { x: 23, baseY: 3100, image: '/imgs/item_front_alienrocket.png', w: 264 / 2, h: 586 / 2, speed: 1.3 },
  // Saucer replaced by the "alien burn" sprite — plays forward then reverse,
  // repeatedly (pingpong).
  { x: 18, baseY: 1425, sprite: 'alien-burn', w: 337 / 2, h: 503 / 2, speed: 1.35 },
]

export default function ForegroundLayer() {
  const { theme } = useTheme()
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  // Runs on the dark (cosy-dynamics) and light themes; monochrome in light.
  // Hidden on individual case-study pages (all parallax decoration is removed).
  const active =
    (theme === 'cosy-dynamics' || theme === 'light') &&
    !pathname.startsWith('/case-studies')

  // Hide the alien rocket on the homepage for now.
  const items = useMemo(
    () =>
      pathname === '/'
        ? FOREGROUND_ITEMS.filter((it) => !it.image?.includes('item_front_alienrocket'))
        : FOREGROUND_ITEMS,
    [pathname],
  )

  useEffect(() => {
    if (!active) return

    const mql = window.matchMedia('(max-width: 767px)')
    if (mql.matches) return

    let ticking = false

    const update = () => {
      const container = containerRef.current
      if (!container) return
      const sy = window.scrollY
      const children = container.children
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement
        const speed = items[i].speed
        el.style.transform = `translateY(${-sy * speed}px)`
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
  }, [theme, items, active])

  if (!active) return null

  // Homepage keeps these in front of content (z-20); subpages drop them below
  // the content (z-[5], still above the starfield/midground).
  const isHome = pathname === '/'

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none overflow-hidden hidden md:block light:grayscale ${
        isHome ? 'z-20' : 'z-[5]'
      }`}
      aria-hidden="true"
    >
      {items.map((item) =>
        item.sprite ? (
          <AlienBurnSaucer
            key={item.sprite}
            width={item.w}
            style={{
              position: 'absolute',
              left: `${item.x}%`,
              top: item.baseY,
              willChange: 'transform',
            }}
          />
        ) : (
          <img
            key={item.image}
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
        ),
      )}
    </div>
  )
}
