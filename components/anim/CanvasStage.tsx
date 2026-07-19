'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@/context/ThemeContext'
import { registerTicker } from '@/lib/anim/sequencer'
import { ANIMATIONS } from '@/lib/anim/animations'
import { createSaucerShow } from '@/lib/anim/saucerShow'

// Set true while tuning to shortcut the long start/hidden delays.
const DEBUG = false

// Squad timing / feel
const START_MIN = 30_000 // delay before the FIRST appearance: 30s …
const START_MAX = 60_000 // … to 1 min
const HIDDEN_MIN = 180_000 // gap between subsequent appearances: 3 min …
const HIDDEN_MAX = 300_000 // … to 5 min
const RISE_MIN = 0.5 // propel speed (px/ms) — ~100px per propel …
const RISE_MAX = 0.9 // … up to ~200px, each alien slightly different
const GLIDE = 0.08 // slight downward sink between propels (jellyfish relax)
const SWAY_AMP = 16 // px gentle horizontal sway as they rise
const SWAY_W = 0.0016 // sway angular speed (rad/ms)
const ROT_MIN = -0.1 // radians — modest left tilt
const ROT_MAX = 0.18 // radians — a touch more right tilt so they don't all lean the same way

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const startDelay = () => (DEBUG ? rand(1000, 2500) : rand(START_MIN, START_MAX))
const hiddenDelay = () => (DEBUG ? rand(3000, 6000) : rand(HIDDEN_MIN, HIDDEN_MAX))

type Phase = 'rising' | 'hidden'
interface Member {
  // per-member config (regenerated each appearance)
  dx: number
  scale: number
  seed: number
  speed: number // base upward speed (px/ms)
  swayAmp: number
  swayW: number
  pulseSeed: number // desync the jellyfish propulsion pulse
  rot: number
  // runtime
  ax: number
  ay: number
  aFrame: number
  aAcc: number
  aFps: number
}

/**
 * Full-viewport canvas overlay (fixed, pointer-events:none, DPR-aware) hosting
 * every canvas actor on one shared rAF:
 *  - alien squad (random 3–7): drift up from below the screen as a loose group,
 *    each pulsing upward in time with its animation (like a jellyfish), off the
 *    top → hide (3–5 min) → repeat
 *  - saucer show: see lib/anim/saucerShow
 */
export default function CanvasStage() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Portal target only exists after mount (no document during SSR).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    // Match the other canvases: cosy-dynamics theme + desktop only. On phones
    // the full-viewport per-frame paint isn't worth the battery/CPU.
    if (theme !== 'cosy-dynamics') return
    if (!window.matchMedia('(min-width: 768px)').matches) return
    // Honour reduced-motion: skip the decorative squad/saucer animation.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const context = canvasEl.getContext('2d')
    if (!context) return
    const cv = canvasEl
    const ctx = context

    const ALIEN = ANIMATIONS['bouncing-alien']

    const alienImg = new Image()
    alienImg.src = ALIEN.src

    let vw = window.innerWidth
    let vh = window.innerHeight

    const saucerShow = createSaucerShow(ctx, () => ({ vw, vh }))

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

    // Random 3–7 aliens, clustered loosely, slightly different sizes/speeds.
    function makeMembers(): Member[] {
      const n = 3 + Math.floor(Math.random() * 5) // 3 … 7
      return Array.from({ length: n }, (_, i) => ({
        dx: (i - (n - 1) / 2) * rand(90, 150) + rand(-20, 20),
        scale: rand(0.4, 0.58),
        seed: rand(0, Math.PI * 2),
        speed: rand(RISE_MIN, RISE_MAX), // each rises at its own pace
        swayAmp: SWAY_AMP * rand(0.6, 1.3),
        swayW: SWAY_W * rand(0.7, 1.4),
        pulseSeed: rand(0, Math.PI * 2),
        rot: rand(ROT_MIN, ROT_MAX),
        ax: 0,
        ay: 0,
        aFrame: Math.floor(rand(0, ALIEN.count)),
        aAcc: 0,
        aFps: rand(12, 15),
      }))
    }

    function placeBelow() {
      squad.members.forEach((m) => {
        m.ax = squad.gx + m.dx
        m.ay = vh + rand(40, 260) // staggered, just below the bottom edge
      })
    }

    const squad = {
      phase: 'hidden' as Phase,
      phaseStart: 0,
      hiddenMs: startDelay(), // wait before the first appearance
      gx: vw / 2,
      members: makeMembers(),
    }
    placeBelow()

    function respawnSquad(elapsed: number) {
      squad.members = makeMembers()
      squad.gx = rand(160, Math.max(vw - 160, 180))
      placeBelow()
      squad.phase = 'rising'
      squad.phaseStart = elapsed
    }

    function updateSquad(dt: number, elapsed: number) {
      // advance each alien's sprite animation
      for (const m of squad.members) {
        m.aAcc += dt
        const aMs = 1000 / m.aFps
        while (m.aAcc >= aMs) {
          m.aAcc -= aMs
          m.aFrame = (m.aFrame + 1) % ALIEN.count
        }
      }

      if (squad.phase === 'rising') {
        let allOff = true
        for (const m of squad.members) {
          // Propulsion synced to the sprite's animation cycle: a burst of
          // upward thrust each cycle, then a slight sink before the next —
          // like a jellyfish. thrust goes negative during the glide (GLIDE)
          // so they drop a touch between propels.
          const aMs = 1000 / m.aFps
          const ph = (m.aFrame + Math.min(m.aAcc / aMs, 1)) / ALIEN.count
          const burst = Math.max(0, Math.sin(ph * Math.PI * 2 + m.pulseSeed))
          const thrust = burst * burst - GLIDE
          m.ay -= m.speed * thrust * dt
          m.ax = squad.gx + m.dx + Math.sin(elapsed * m.swayW + m.seed) * m.swayAmp
          if (m.ay + ALIEN.frameH * m.scale > -40) allOff = false
        }
        if (allOff) {
          squad.phase = 'hidden'
          squad.phaseStart = elapsed
          squad.hiddenMs = hiddenDelay()
        }
      } else if (elapsed - squad.phaseStart > squad.hiddenMs) {
        respawnSquad(elapsed)
      }
    }

    function draw() {
      ctx.clearRect(0, 0, vw, vh)

      // Alien squad
      if (squad.phase !== 'hidden' && alienImg.complete && alienImg.naturalWidth > 0) {
        for (const m of squad.members) {
          const aw = ALIEN.frameW * m.scale
          const ah = ALIEN.frameH * m.scale

          ctx.save()
          ctx.translate(m.ax, m.ay + ah / 2) // rotate about the alien's centre
          ctx.rotate(m.rot)
          ctx.drawImage(
            alienImg,
            m.aFrame * ALIEN.frameW, 0, ALIEN.frameW, ALIEN.frameH,
            -aw / 2, -ah / 2, aw, ah,
          )
          ctx.restore()
        }
      }

      // Saucers / bullets / explosions on top
      saucerShow.draw()
    }

    const stopTicker = registerTicker((dt, elapsed) => {
      updateSquad(dt, elapsed)
      saucerShow.update(dt, elapsed)
      draw()
    })

    window.addEventListener('resize', resize)
    return () => {
      stopTicker()
      window.removeEventListener('resize', resize)
    }
  }, [mounted, theme])

  // Portalled to <body> so it escapes <main>'s stacking context and can paint
  // over the footer. z-40: above footer (z-10) + foreground (z-20), below the
  // nav / cart / cookie chrome (z-50+), so decorative sprites never cover UI.
  if (!mounted || theme !== 'cosy-dynamics') return null
  return createPortal(
    // `hidden md:block` keeps the canvas off the DOM paint path on mobile,
    // complementing the effect's matchMedia gate (which stops the ticker).
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 hidden md:block"
    />,
    document.body,
  )
}
