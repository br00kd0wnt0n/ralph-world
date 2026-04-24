'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

// Placeholder items — will become spaceships, aliens, etc.
// x: % from left, baseY: starting page-space Y, size: px, speed: scroll multiplier (>1 = faster than content)
const FOREGROUND_ITEMS = [
  { x: 6, baseY: 350, size: 100, color: '#EA128B', speed: 1.3 },
  { x: 87, baseY: 850, size: 80, color: '#5FBCBF', speed: 1.2 },
  { x: 18, baseY: 1500, size: 90, color: '#FBC000', speed: 1.35 },
  { x: 75, baseY: 2100, size: 100, color: '#EE6626', speed: 1.25 },
  { x: 50, baseY: 2700, size: 70, color: '#7B3FE4', speed: 1.4 },
  { x: 90, baseY: 3300, size: 85, color: '#44B758', speed: 1.3 },
  { x: 10, baseY: 3900, size: 100, color: '#EA128B', speed: 1.2 },
  { x: 65, baseY: 4500, size: 90, color: '#5FBCBF', speed: 1.35 },
]

export default function ForegroundLayer() {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  // Direct DOM updates on scroll — no React re-renders
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
        const speed = FOREGROUND_ITEMS[i].speed
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
      className="fixed inset-0 pointer-events-none z-20 overflow-hidden hidden md:block"
      aria-hidden="true"
    >
      {FOREGROUND_ITEMS.map((item, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${item.x}%`,
            top: item.baseY,
            width: item.size,
            height: item.size,
            backgroundColor: item.color,
            opacity: 0.5,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  )
}
