'use client'

import { useEffect, useRef } from 'react'
import { registerTicker } from '@/lib/anim/sequencer'
import { ANIMATIONS } from '@/lib/anim/animations'

// Set true while tuning to shortcut the long start/hidden delays.
const DEBUG = false

// Squad timing / feel
const ENTER_MS = 900 // rise-up-from-below the screen on (re)appear
const DRIFT_MS = 4500 // sway around before charging
const CHARGE_MS = 1500 // exhaust fires for this long BEFORE liftoff
const START_MIN = 60_000 // delay before the FIRST appearance: 1 min …
const START_MAX = 300_000 // … to 5 min
const HIDDEN_MIN = 180_000 // gap between subsequent appearances: 3 min …
const HIDDEN_MAX = 300_000 // … to 5 min
const DRIFT_AMP = 60 // px sideways sway
const DRIFT_W = 0.004 // sway angular speed (rad/ms) — higher = more frantic darting
const ACCEL = 0.005 // blast acceleration (px/ms²)
const EXHAUST_TOP_RATIO = 0.88 // exhaust top sits this far down the alien (just above its base)
const EXHAUST_W_RATIO = 0.72 // exhaust width relative to alien width
const EXHAUST_X_OFFSET = 20 // nudge the plume right of the alien centre
const ROT_MIN = -0.1 // radians — modest left tilt
const ROT_MAX = 0.18 // radians — a touch more right tilt so they don't all lean the same way

// Satellite: one craft crossing left → right at intervals, at varying heights.
const SAT_SCALE = 0.45
const SAT_SPEED = 0.18 // px/ms
const SAT_GAP_MIN = 4000
const SAT_GAP_MAX = 9000

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const startDelay = () => (DEBUG ? rand(1000, 2500) : rand(START_MIN, START_MAX))
const hiddenDelay = () => (DEBUG ? rand(3000, 6000) : rand(HIDDEN_MIN, HIDDEN_MAX))

type Phase = 'enter' | 'drift' | 'charge' | 'blast' | 'hidden'
interface Member {
  // per-member config (regenerated each appearance)
  dx: number
  dy: number
  scale: number
  seed: number
  driftW: number
  driftAmp: number
  igniteDelay: number
  exhaustDelay: number
  rot: number
  // runtime
  enterFromY: number
  ax: number
  ay: number
  vy: number
  aFrame: number
  aAcc: number
  aFps: number
  eFrame: number
  eAcc: number
  eOn: boolean
}

/**
 * Full-viewport canvas overlay (fixed, pointer-events:none, DPR-aware) hosting
 * every canvas actor on one shared rAF:
 *  - alien squad (random 2–4): rise from below → drift sideways → charge
 *    (exhaust fires ~1.5s) → blast up off the top → hide (1–5 min) → repeat
 *  - satellite: crosses left → right at random intervals and heights
 */
export default function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const context = canvasEl.getContext('2d')
    if (!context) return
    const cv = canvasEl
    const ctx = context

    const ALIEN = ANIMATIONS['bouncing-alien']
    const EXHAUST = ANIMATIONS['exhaust']
    const SAT = ANIMATIONS['satellite']

    const alienImg = new Image()
    alienImg.src = ALIEN.src
    const exhaustImg = new Image()
    exhaustImg.src = EXHAUST.src
    const satImg = new Image()
    satImg.src = SAT.src

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

    // Random 3–7 aliens, clustered close, slightly different sizes.
    function makeMembers(): Member[] {
      const n = 3 + Math.floor(Math.random() * 5) // 3 … 7
      return Array.from({ length: n }, (_, i) => ({
        dx: (i - (n - 1) / 2) * rand(120, 165) + rand(-20, 20),
        dy: rand(-30, 120),
        scale: rand(0.4, 0.58),
        seed: rand(0, Math.PI * 2),
        driftW: DRIFT_W * rand(0.6, 1.5), // each sways at its own speed
        driftAmp: DRIFT_AMP * rand(0.75, 1.2),
        igniteDelay: i * rand(80, 160),
        exhaustDelay: rand(0, 1000), // stagger each plume's ignition
        rot: rand(ROT_MIN, ROT_MAX),
        enterFromY: 0,
        ax: 0,
        ay: 0,
        vy: 0,
        aFrame: Math.floor(rand(0, ALIEN.count)),
        aAcc: 0,
        aFps: rand(12, 15),
        eFrame: 0,
        eAcc: 0,
        eOn: false,
      }))
    }

    function placeBelow() {
      squad.members.forEach((m) => {
        m.ax = squad.gx + m.dx
        m.enterFromY = vh + rand(40, 160) // staggered, just below the bottom edge
        m.ay = m.enterFromY
      })
    }

    const squad = {
      phase: 'hidden' as Phase,
      phaseStart: 0,
      hiddenMs: startDelay(), // wait before the first appearance
      gx: vw / 2,
      gy: vh * 0.55,
      members: makeMembers(),
    }
    placeBelow()

    const sat = {
      active: false,
      x: 0,
      worldY: vh * 0.3, // document-space; drawn at worldY - scrollY so it scrolls away
      frame: 0,
      acc: 0,
      nextAt: 1500,
    }

    function respawnSquad(elapsed: number) {
      squad.members = makeMembers()
      squad.gx = rand(160, Math.max(vw - 160, 180))
      squad.gy = rand(vh * 0.45, vh * 0.62) // lower section
      placeBelow()
      squad.phase = 'enter'
      squad.phaseStart = elapsed
    }

    function updateSquad(dt: number, elapsed: number) {
      for (const m of squad.members) {
        m.aAcc += dt
        const aMs = 1000 / m.aFps
        while (m.aAcc >= aMs) {
          m.aAcc -= aMs
          m.aFrame = (m.aFrame + 1) % ALIEN.count
        }
        // each alien's exhaust ignites at a slightly different time during charge
        m.eOn =
          squad.phase === 'blast' ||
          (squad.phase === 'charge' && elapsed - squad.phaseStart > m.exhaustDelay)
        if (m.eOn) {
          m.eAcc += dt
          const eMs = 1000 / (EXHAUST.fps ?? 18)
          while (m.eAcc >= eMs) {
            m.eAcc -= eMs
            m.eFrame = (m.eFrame + 1) % EXHAUST.count
          }
        }
      }

      if (squad.phase === 'enter') {
        const p = Math.min((elapsed - squad.phaseStart) / ENTER_MS, 1)
        const e = easeOutCubic(p)
        for (const m of squad.members) {
          // same sway as drift so x is continuous into the next phase (no jump)
          m.ax = squad.gx + m.dx + Math.sin(elapsed * m.driftW + m.seed) * m.driftAmp
          m.ay = m.enterFromY + (squad.gy + m.dy - m.enterFromY) * e
        }
        if (p >= 1) {
          squad.phase = 'drift'
          squad.phaseStart = elapsed
        }
      } else if (squad.phase === 'drift') {
        for (const m of squad.members) {
          m.ax = squad.gx + m.dx + Math.sin(elapsed * m.driftW + m.seed) * m.driftAmp
          m.ay = squad.gy + m.dy
        }
        if (elapsed - squad.phaseStart > DRIFT_MS) {
          squad.phase = 'charge'
          squad.phaseStart = elapsed
          squad.members.forEach((m) => {
            m.eFrame = 0
            m.eAcc = 0
          })
        }
      } else if (squad.phase === 'charge') {
        // keep swaying, with a small rumble, while the exhaust builds
        for (const m of squad.members) {
          m.ax = squad.gx + m.dx + Math.sin(elapsed * m.driftW + m.seed) * m.driftAmp
          m.ay = squad.gy + m.dy + Math.sin(elapsed * 0.05 + m.seed) * 2.5
        }
        if (elapsed - squad.phaseStart > CHARGE_MS) {
          squad.phase = 'blast'
          squad.phaseStart = elapsed
          squad.members.forEach((m) => {
            m.vy = 0
          })
        }
      } else if (squad.phase === 'blast') {
        const bt = elapsed - squad.phaseStart
        let allOff = true
        for (const m of squad.members) {
          if (bt > m.igniteDelay) {
            m.vy += ACCEL * dt
            m.ay -= m.vy * dt
          }
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

    function updateSat(dt: number, elapsed: number) {
      const w = SAT.frameW * SAT_SCALE
      if (!sat.active) {
        if (elapsed >= sat.nextAt) {
          sat.active = true
          sat.x = -w
          // anchor to the document at a random height within the current view,
          // so scrolling moves it out of frame
          sat.worldY = window.scrollY + rand(vh * 0.08, vh * 0.68)
          sat.frame = 0
          sat.acc = 0
        }
        return
      }
      sat.acc += dt
      const ms = 1000 / (SAT.fps ?? 16)
      while (sat.acc >= ms) {
        sat.acc -= ms
        sat.frame = (sat.frame + 1) % SAT.count
      }
      sat.x += SAT_SPEED * dt
      if (sat.x > vw + w) {
        sat.active = false
        sat.nextAt = elapsed + rand(SAT_GAP_MIN, SAT_GAP_MAX)
      }
    }

    function draw() {
      ctx.clearRect(0, 0, vw, vh)

      // Satellite
      if (sat.active && satImg.complete && satImg.naturalWidth > 0) {
        const w = SAT.frameW * SAT_SCALE
        const h = SAT.frameH * SAT_SCALE
        const screenY = sat.worldY - window.scrollY
        ctx.drawImage(satImg, sat.frame * SAT.frameW, 0, SAT.frameW, SAT.frameH, sat.x, screenY, w, h)
      }

      // Alien squad
      if (squad.phase !== 'hidden' && alienImg.complete && alienImg.naturalWidth > 0) {
        for (const m of squad.members) {
          const aw = ALIEN.frameW * m.scale
          const ah = ALIEN.frameH * m.scale

          ctx.save()
          ctx.translate(m.ax, m.ay + ah / 2) // rotate about the alien's centre
          ctx.rotate(m.rot)

          if (m.eOn && exhaustImg.complete && exhaustImg.naturalWidth > 0) {
            const ew = aw * EXHAUST_W_RATIO
            const eh = ew * (EXHAUST.frameH / EXHAUST.frameW)
            ctx.drawImage(
              exhaustImg,
              m.eFrame * EXHAUST.frameW, 0, EXHAUST.frameW, EXHAUST.frameH,
              -ew / 2 + EXHAUST_X_OFFSET, ah * (EXHAUST_TOP_RATIO - 0.5), ew, eh,
            )
          }

          ctx.drawImage(
            alienImg,
            m.aFrame * ALIEN.frameW, 0, ALIEN.frameW, ALIEN.frameH,
            -aw / 2, -ah / 2, aw, ah,
          )
          ctx.restore()
        }
      }
    }

    const stopTicker = registerTicker((dt, elapsed) => {
      updateSquad(dt, elapsed)
      updateSat(dt, elapsed)
      draw()
    })

    window.addEventListener('resize', resize)
    return () => {
      stopTicker()
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40"
    />
  )
}
