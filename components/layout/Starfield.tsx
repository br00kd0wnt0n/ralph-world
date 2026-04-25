'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

// ── Particle config ──
const PARTICLE_COUNT = 350
const SHOOTING_STAR_CHANCE = 0.001 // per frame (~1 every 16s at 60fps)
const SHOOTING_STAR_MAX = 2

// Depth bands: far (slow, small, dim) → near (fast, large, bright)
const DEPTH_BANDS = [
  { weight: 0.5, depthRange: [0, 0.3], sizeRange: [0.3, 0.8], opacityRange: [0.08, 0.25], scrollFactor: [0.01, 0.03], driftSpeed: [0.00002, 0.00008] },
  { weight: 0.35, depthRange: [0.3, 0.7], sizeRange: [0.8, 1.8], opacityRange: [0.15, 0.5], scrollFactor: [0.04, 0.1], driftSpeed: [0.00005, 0.00015] },
  { weight: 0.15, depthRange: [0.7, 1], sizeRange: [1.8, 3], opacityRange: [0.3, 0.7], scrollFactor: [0.12, 0.25], driftSpeed: [0.0001, 0.0003] },
] as const

// Subtle colour palette — white with hints of brand colours
const PARTICLE_COLOURS = [
  { r: 255, g: 255, b: 255 },  // white (dominant)
  { r: 255, g: 255, b: 255 },
  { r: 255, g: 255, b: 255 },
  { r: 255, g: 230, b: 245 },  // faint pink
  { r: 230, g: 235, b: 255 },  // faint blue
  { r: 240, g: 225, b: 255 },  // faint purple
  { r: 255, g: 240, b: 230 },  // faint warm
]

type Particle = {
  x: number
  y: number
  size: number
  baseOpacity: number
  scrollFactor: number
  driftSpeed: number
  driftDirection: number
  phase: number
  twinkleSpeed: number
  colour: { r: number; g: number; b: number }
  shape: 'dot' | 'cross'
  depth: number
}

type ShootingStar = {
  x: number
  y: number
  vx: number
  vy: number
  length: number
  life: number
  maxLife: number
  size: number
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function randRange(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function pickBand(): (typeof DEPTH_BANDS)[number] {
  const r = Math.random()
  let cumulative = 0
  for (const band of DEPTH_BANDS) {
    cumulative += band.weight
    if (r <= cumulative) return band
  }
  return DEPTH_BANDS[0]
}

function createParticle(): Particle {
  const band = pickBand()
  const depth = randRange(band.depthRange[0], band.depthRange[1])
  const isNear = depth > 0.7

  return {
    x: Math.random(),
    y: Math.random(),
    size: randRange(band.sizeRange[0], band.sizeRange[1]),
    baseOpacity: randRange(band.opacityRange[0], band.opacityRange[1]),
    scrollFactor: randRange(band.scrollFactor[0], band.scrollFactor[1]),
    driftSpeed: randRange(band.driftSpeed[0], band.driftSpeed[1]),
    driftDirection: Math.random() * Math.PI * 2,
    phase: Math.random() * Math.PI * 2,
    twinkleSpeed: randRange(0.0002, 0.0008),
    colour: PARTICLE_COLOURS[Math.floor(Math.random() * PARTICLE_COLOURS.length)],
    shape: isNear && Math.random() > 0.6 ? 'cross' : 'dot',
    depth,
  }
}

function createShootingStar(w: number, h: number): ShootingStar {
  const fromLeft = Math.random() > 0.5
  const angle = randRange(0.15, 0.5) * (fromLeft ? 1 : -1)

  return {
    x: fromLeft ? -20 : w + 20,
    y: randRange(0, h * 0.6),
    vx: (fromLeft ? 1 : -1) * randRange(6, 12),
    vy: randRange(2, 5),
    length: randRange(40, 80),
    life: 0,
    maxLife: randRange(60, 120), // frames
    size: randRange(1, 2),
  }
}

export default function Starfield() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (theme !== 'cosy-dynamics') return

    // Hide on mobile
    const mql = window.matchMedia('(max-width: 767px)')
    if (mql.matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let scrollY = window.scrollY

    const particles = Array.from({ length: PARTICLE_COUNT }, createParticle)
    const shootingStars: ShootingStar[] = []

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }

    function drawDot(x: number, y: number, size: number, rgba: string) {
      ctx!.beginPath()
      ctx!.arc(x, y, size, 0, Math.PI * 2)
      ctx!.fillStyle = rgba
      ctx!.fill()
    }

    function drawCross(x: number, y: number, size: number, rgba: string) {
      const arm = size * 1.2
      ctx!.strokeStyle = rgba
      ctx!.lineWidth = size * 0.4
      ctx!.beginPath()
      ctx!.moveTo(x - arm, y)
      ctx!.lineTo(x + arm, y)
      ctx!.moveTo(x, y - arm)
      ctx!.lineTo(x, y + arm)
      ctx!.stroke()
    }

    function draw(time: number) {
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)

      // ── Particles ──
      for (const p of particles) {
        const twinkle = Math.sin(time * p.twinkleSpeed + p.phase) * 0.3
        const alpha = Math.max(0.02, Math.min(1, p.baseOpacity + twinkle))

        // Scroll parallax
        const parallaxY = scrollY * p.scrollFactor
        let yPos = (p.y * h - parallaxY) % h
        if (yPos < 0) yPos += h

        // Subtle drift
        const driftX = Math.sin(time * p.driftSpeed + p.driftDirection) * 15 * p.depth
        let xPos = p.x * w + driftX
        if (xPos < 0) xPos += w
        if (xPos > w) xPos -= w

        const { r, g, b } = p.colour
        const rgba = `rgba(${r},${g},${b},${alpha})`

        if (p.shape === 'cross') {
          drawCross(xPos, yPos, p.size, rgba)
        } else {
          drawDot(xPos, yPos, p.size, rgba)
        }
      }

      // ── Shooting stars ──
      if (shootingStars.length < SHOOTING_STAR_MAX && Math.random() < SHOOTING_STAR_CHANCE) {
        shootingStars.push(createShootingStar(w, h))
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i]
        s.x += s.vx
        s.y += s.vy
        s.life++

        const progress = s.life / s.maxLife
        const fadeIn = Math.min(1, s.life / 10)
        const fadeOut = Math.max(0, 1 - (progress - 0.7) / 0.3)
        const alpha = fadeIn * fadeOut * 0.8

        if (s.life >= s.maxLife || s.x < -100 || s.x > w + 100 || s.y > h + 100) {
          shootingStars.splice(i, 1)
          continue
        }

        // Trail
        const grad = ctx!.createLinearGradient(
          s.x, s.y,
          s.x - s.vx * (s.length / Math.hypot(s.vx, s.vy)),
          s.y - s.vy * (s.length / Math.hypot(s.vx, s.vy))
        )
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`)
        grad.addColorStop(1, `rgba(255,255,255,0)`)

        ctx!.beginPath()
        ctx!.strokeStyle = grad
        ctx!.lineWidth = s.size
        ctx!.lineCap = 'round'
        ctx!.moveTo(s.x, s.y)
        ctx!.lineTo(
          s.x - s.vx * (s.length / Math.hypot(s.vx, s.vy)),
          s.y - s.vy * (s.length / Math.hypot(s.vx, s.vy))
        )
        ctx!.stroke()
      }

      animationId = requestAnimationFrame(draw)
    }

    function onScroll() {
      scrollY = window.scrollY
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll, { passive: true })
    animationId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(animationId)
    }
  }, [theme])

  if (theme !== 'cosy-dynamics') return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 hidden md:block"
      aria-hidden="true"
    />
  )
}
