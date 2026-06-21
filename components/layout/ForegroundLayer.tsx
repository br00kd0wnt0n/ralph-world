'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

// Foreground parallax items — faster than content, in front of planets/panels
// image items displayed at half intrinsic size
// the spaceship was replaced by an animated saucer on ForegroundCanvas.
const FOREGROUND_ITEMS = [
  { x: 23, baseY: 3100, image: '/imgs/item_front_alienrocket.png', w: 264 / 2, h: 586 / 2, speed: 1.3 },
  { x: 18, baseY: 1425, image: '/imgs/item_front_saucer.png', w: 337 / 2, h: 503 / 2, speed: 1.35 },
]

export default function ForegroundLayer() {
  const { theme } = useTheme()
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  // Hide the alien rocket on the homepage for now.
  const items = useMemo(
    () =>
      pathname === '/'
        ? FOREGROUND_ITEMS.filter((it) => !it.image.includes('item_front_alienrocket'))
        : FOREGROUND_ITEMS,
    [pathname],
  )

  useEffect(() => {
    if (theme !== 'cosy-dynamics') return

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
  }, [theme, items])

  if (theme !== 'cosy-dynamics') return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-20 overflow-hidden hidden md:block"
      aria-hidden="true"
    >
      {items.map((item, i) => (
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
      ))}
    </div>
  )
}
