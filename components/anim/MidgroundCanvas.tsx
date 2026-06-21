'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { registerTicker } from '@/lib/anim/sequencer'
import { ANIMATIONS, type AnimationName } from '@/lib/anim/animations'

// Midground canvas — sits at z-[1] (same depth as item_mid_spaceship), behind
// page content, with parallax (drawn at worldY − scrollY × parallax). Hosts
// the animated flyers that drift across the background. Shares the central
// sequencer (no extra rAF). Matches MidgroundLayer's gating: cosy-dynamics
// theme, desktop only.

interface FlyerConfig {
  name: AnimationName
  scale: number
  speed: number // px/ms — base / minimum
  speedMax: number // px/ms — upper bound (random per crossing; = speed for fixed)
  dir: 1 | -1 // 1 = left→right, -1 = right→left
  flipX: boolean // mirror the art horizontally
  fps: number
  spin: number // continuous z-rotation rad/ms (slow tumble; 0 = level flight)
  wobble: number // gentle oscillating tilt amplitude (radians); for level flyers
  parallax: number // 0 = pinned to viewport, 1 = moves with content
  gapMin: number
  gapMax: number
  bandTop: number // worldY band as a fraction of viewport height
  bandBottom: number
  firstMin: number
  firstMax: number
}

const FLYERS: FlyerConfig[] = [
  {
    name: 'satellite',
    scale: 0.45,
    speed: 0.3, // 2.5× the old 0.12
    speedMax: 0.3,
    dir: 1,
    flipX: false,
    fps: 16,
    spin: 0.00018, // slow orbital tumble
    wobble: 0,
    parallax: 0.7,
    gapMin: 25000, // less frequent
    gapMax: 55000,
    bandTop: 0.08,
    bandBottom: 0.5,
    firstMin: 8000,
    firstMax: 18000,
  },
  {
    name: 'chaser',
    scale: 0.3,
    speed: 0.1, // base
    speedMax: 0.22, // random up to here each crossing
    dir: 1,
    flipX: true,
    fps: 6,
    spin: 0, // flies level (upright) — only flips L/R + a tiny tilt
    wobble: 0.05, // ~3° gentle tilt
    parallax: 0.7,
    gapMin: 12000,
    gapMax: 26000,
    bandTop: 0.1,
    bandBottom: 0.55,
    firstMin: 6000,
    firstMax: 12000,
  },
]

// Static (non-animated) parallax props — moon / planet. Pinned at a document
// position (baseY) and drawn at baseY − scrollY × speed, matching the old
// MidgroundLayer parallax. Horizontal x is a % of the viewport width.
interface StaticItem {
  src: string
  xPct: number
  baseY: number
  w: number
  h: number
  speed: number
}

const STATIC_ITEMS: StaticItem[] = [
  { src: '/imgs/item_moon.png', xPct: 12, baseY: 600, w: 288 / 2, h: 290 / 2, speed: 0.75 },
  { src: '/imgs/item_planet.png', xPct: 70, baseY: 1200, w: 416 / 2, h: 280 / 2, speed: 0.7 },
]

const WOBBLE_W = 0.0018 // wobble angular speed (rad/ms)

const rand = (min: number, max: number) => min + Math.random() * (max - min)

interface FlyerState {
  active: boolean
  x: number
  worldY: number
  speed: number // chosen per crossing
  frame: number
  acc: number
  rot: number // continuous tumble (spin)
  wob: number // current wobble tilt
  seed: number
  nextAt: number
}

export default function MidgroundCanvas() {
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

    const imgs = FLYERS.map((f) => {
      const img = new Image()
      img.src = ANIMATIONS[f.name].src
      return img
    })
    const staticImgs = STATIC_ITEMS.map((s) => {
      const img = new Image()
      img.src = s.src
      return img
    })

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

    const states: FlyerState[] = FLYERS.map((f) => ({
      active: false,
      x: 0,
      worldY: 0,
      speed: f.speed,
      frame: 0,
      acc: 0,
      rot: 0,
      wob: 0,
      seed: rand(0, Math.PI * 2),
      nextAt: rand(f.firstMin, f.firstMax),
    }))

    function update(dt: number, elapsed: number) {
      const scrollY = window.scrollY

      for (let i = 0; i < FLYERS.length; i++) {
        const f = FLYERS[i]
        const st = states[i]
        const sheet = ANIMATIONS[f.name]
        const w = sheet.frameW * f.scale
        if (!st.active) {
          if (elapsed >= st.nextAt) {
            st.active = true
            st.x = f.dir > 0 ? -w : vw + w
            st.worldY = scrollY * f.parallax + rand(vh * f.bandTop, vh * f.bandBottom)
            st.frame = 0
            st.acc = 0
            // only tumblers start at a random orientation; level flyers stay upright
            st.rot = f.spin !== 0 ? rand(0, Math.PI * 2) : 0
            st.seed = rand(0, Math.PI * 2)
            st.speed = rand(f.speed, f.speedMax) // random pace this crossing
          }
          continue
        }
        st.acc += dt
        const ms = 1000 / (sheet.fps ?? f.fps)
        while (st.acc >= ms) {
          st.acc -= ms
          st.frame = (st.frame + 1) % sheet.count
        }
        st.rot += f.spin * dt
        st.wob = f.wobble ? Math.sin(elapsed * WOBBLE_W + st.seed) * f.wobble : 0
        st.x += f.dir * st.speed * dt
        if ((f.dir > 0 && st.x > vw + w) || (f.dir < 0 && st.x < -w)) {
          st.active = false
          st.nextAt = elapsed + rand(f.gapMin, f.gapMax)
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, vw, vh)
      const scrollY = window.scrollY

      // Static parallax props (moon / planet) — behind the flyers
      for (let i = 0; i < STATIC_ITEMS.length; i++) {
        const s = STATIC_ITEMS[i]
        const img = staticImgs[i]
        if (!img.complete || img.naturalWidth === 0) continue
        const top = s.baseY - scrollY * s.speed
        if (top > vh || top + s.h < 0) continue
        ctx.drawImage(img, (vw * s.xPct) / 100, top, s.w, s.h)
      }

      for (let i = 0; i < FLYERS.length; i++) {
        const f = FLYERS[i]
        const st = states[i]
        const img = imgs[i]
        if (!st.active || !img.complete || img.naturalWidth === 0) continue
        const sheet = ANIMATIONS[f.name]
        const w = sheet.frameW * f.scale
        const h = sheet.frameH * f.scale
        const screenY = st.worldY - scrollY * f.parallax // centre y
        if (screenY - h / 2 > vh || screenY + h / 2 < 0) continue
        ctx.save()
        ctx.translate(st.x, screenY)
        ctx.rotate(st.rot + st.wob)
        if (f.flipX) ctx.scale(-1, 1)
        ctx.drawImage(img, st.frame * sheet.frameW, 0, sheet.frameW, sheet.frameH, -w / 2, -h / 2, w, h)
        ctx.restore()
      }
    }

    const stopTicker = registerTicker((dt, elapsed) => {
      update(dt, elapsed)
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
      className="pointer-events-none fixed inset-0 z-[1] hidden md:block"
    />
  )
}
