'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { registerTicker } from '@/lib/anim/sequencer'
import { ANIMATIONS, type AnimationName } from '@/lib/anim/animations'

// Foreground canvas — sits at z-20 (same depth as ForegroundLayer, in front of
// page content). Hosts scroll-anchored animated props: a sprite sheet pinned at
// a document position that plays its animation in place and parallaxes with
// scroll (replaces a static foreground parallax image). Shares the central
// sequencer (no extra rAF). Gated to cosy-dynamics + desktop, like ForegroundLayer.

interface AnchoredItem {
  name: AnimationName
  scale: number
  xPct: number // left edge as a % of viewport width
  baseY: number // document-space top
  speed: number // parallax (1 = with content, >1 = faster/foreground)
  fps: number
}

const ITEMS: AnchoredItem[] = [
  // replaces the old item_front_spaceship.png (x:50, baseY:2700, speed:1.4)
  { name: 'saucer', scale: 0.7, xPct: 50, baseY: 2700, speed: 1.4, fps: 14 },
]

export default function ForegroundCanvas() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (theme !== 'cosy-dynamics') return
    if (!window.matchMedia('(min-width: 768px)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const cv = canvas
    const ctx = context

    const imgs = ITEMS.map((it) => {
      const img = new Image()
      img.src = ANIMATIONS[it.name].src
      return img
    })
    const states = ITEMS.map(() => ({ frame: 0, acc: 0 }))

    let vw = window.innerWidth
    let vh = window.innerHeight

    function resize() {
      vw = window.innerWidth
      vh = window.innerHeight
      const dpr = window.devicePixelRatio || 1
      cv.width = Math.round(vw * dpr)
      cv.height = Math.round(vh * dpr)
      cv.style.width = `${vw}px`
      cv.style.height = `${vh}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    function update(dt: number) {
      for (let i = 0; i < ITEMS.length; i++) {
        const it = ITEMS[i]
        const st = states[i]
        const sheet = ANIMATIONS[it.name]
        st.acc += dt
        const ms = 1000 / it.fps
        while (st.acc >= ms) {
          st.acc -= ms
          st.frame = (st.frame + 1) % sheet.count
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, vw, vh)
      const scrollY = window.scrollY
      for (let i = 0; i < ITEMS.length; i++) {
        const it = ITEMS[i]
        const img = imgs[i]
        if (!img.complete || img.naturalWidth === 0) continue
        const sheet = ANIMATIONS[it.name]
        const w = sheet.frameW * it.scale
        const h = sheet.frameH * it.scale
        const top = it.baseY - scrollY * it.speed
        if (top > vh || top + h < 0) continue
        const f = states[i].frame
        ctx.drawImage(img, f * sheet.frameW, 0, sheet.frameW, sheet.frameH, (vw * it.xPct) / 100, top, w, h)
      }
    }

    const stopTicker = registerTicker((dt) => {
      update(dt)
      draw()
    })
    window.addEventListener('resize', resize)
    return () => {
      stopTicker()
      window.removeEventListener('resize', resize)
    }
  }, [theme])

  if (theme !== 'cosy-dynamics') return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 hidden md:block"
    />
  )
}
