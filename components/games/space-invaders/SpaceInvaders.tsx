'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import Button from '@/components/ui/Button'
import { useSpaceInvadersState } from './hooks/useSpaceInvadersState'
import { useKeyboardControls } from './hooks/useKeyboardControls'
import { useGameLoop } from './hooks/useGameLoop'
import { loadAssets } from './assets'
import { drawScene } from './logic/drawScene'
import { playSfx } from './sfx'

export default function SpaceInvaders() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [active, setActive] = useState(false)
  const [score, setScore] = useState(0)
  // -1 idle, 1 win, 2 lose.
  const [result, setResult] = useState<number>(-1)
  const [wide, setWide] = useState(true)

  const { state, resetGame, setupGame, stepGame } = useSpaceInvadersState()
  const keys = useKeyboardControls()
  const { theme } = useTheme()
  const router = useRouter()

  // Blast colour: ralph-pink in dark mode, off-black (monochrome) in light.
  useEffect(() => {
    state.blastColor = theme === 'light' ? '#232323' : '#EA128B'
  }, [theme, state])

  // No page scroll while the game is mounted (it fills the viewport).
  useEffect(() => {
    const html = document.documentElement
    const prevHtml = html.style.overflow
    const prevBody = document.body.style.overflow
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [])

  // Keyboard game — desktop only. Below 992px, bounce back to the Lab.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 992px)')
    const sync = () => {
      setWide(mql.matches)
      if (!mql.matches) router.replace('/lab')
    }
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [router])

  const loop = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !active) return

    if (state.gameOver > 0) {
      setActive(false)
      setResult(state.gameOver)
      if (state.gameOver === 2) playSfx('lose')
      else playSfx('win')
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      return
    }

    stepGame(keys.current)
    drawScene(ctx, state)
    // setState bails out when the value is unchanged, so this only re-renders
    // when the kill count actually ticks up.
    setScore(state.score)
  }, [active, state, stepGame, keys])

  useGameLoop(loop, active)

  const handleStart = useCallback(async () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    await loadAssets(state)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Detailed (non-pixel-art) sprites — smooth downscaling reads sharper than
    // nearest-neighbour, and a dpr of 2 renders the 144px alien art ~1:1.
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssWidth = container.offsetWidth
    const cssHeight = container.offsetHeight

    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`

    resetGame()
    setupGame(canvas)
    setScore(0)
    setResult(-1)
    setActive(true)
  }, [state, setupGame, resetGame])

  // Below 992px we redirect to /lab (see effect above); render nothing.
  if (!wide) return null

  const title = result === 1 ? 'You win' : result === 2 ? 'Game over' : 'Space Invaders'
  const instructionFont = {
    fontFamily: 'var(--font-body), Roboto, sans-serif',
    fontWeight: 600,
    fontSize: 16,
    lineHeight: '23px',
    letterSpacing: 0,
  } as const
  // Instruction arrow keys, styled like the carousel chevron buttons.
  const arrowKey =
    'inline-flex items-center justify-center bg-white text-black light:bg-black light:text-white'

  return (
    <div ref={containerRef} className="fixed inset-0 z-[30]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block light:grayscale"
        style={{ backgroundColor: 'transparent' }}
      />

      {active && (
        <div className="pointer-events-none absolute bottom-6 right-6 z-[2] flex gap-1.5">
          {String(score).padStart(3, '0').slice(-3).split('').map((digit, i) => (
            <span
              key={i}
              className="inline-flex items-center justify-center bg-white text-black light:bg-black light:text-white"
              style={{
                width: 40,
                height: 56,
                fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                fontWeight: 600,
                fontSize: 45,
                lineHeight: 1,
              }}
            >
              {digit}
            </span>
          ))}
        </div>
      )}

      {!active && (
        <div className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-center gap-6 text-white light:text-black">
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
              fontWeight: 600,
              fontSize: 'clamp(26px, 5.3vw, 64px)',
              lineHeight: 1,
              letterSpacing: '0.04em',
              textAlign: 'center',
            }}
          >
            {title}
          </span>

          <div
            className="flex items-center gap-2 text-white/60 light:text-black/60"
            style={instructionFont}
          >
            <span className={arrowKey} style={{ width: 28, height: 28 }}>
              <svg width="9" height="13" viewBox="0 0 10 14" fill="none">
                <path d="M8 1L2 7L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={arrowKey} style={{ width: 28, height: 28 }}>
              <svg width="9" height="13" viewBox="0 0 10 14" fill="none">
                <path d="M2 1L8 7L2 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>to move</span>
            <span
              aria-hidden="true"
              className="mx-1"
              style={{ width: 1, height: 18, backgroundColor: 'currentColor', opacity: 0.35 }}
            />
            <span
              className={arrowKey}
              style={{ height: 28, padding: '0 10px', fontSize: 12, fontWeight: 700 }}
            >
              SPACE
            </span>
            <span>or</span>
            <span
              className={arrowKey}
              style={{ width: 28, height: 28, fontSize: 12, fontWeight: 700 }}
            >
              Z
            </span>
            <span>to shoot</span>
          </div>

          {/* The only way to start — clicking elsewhere does nothing. */}
          <div className="pointer-events-auto">
            <Button
              label={result > 0 ? 'Play again' : 'Play'}
              onClick={handleStart}
            />
          </div>

          <Link
            href="/lab"
            aria-label="Back to Lab"
            className="pointer-events-auto inline-flex items-center text-ralph-pink light:text-black hover:opacity-60 active:opacity-60 transition-opacity"
            style={{
              fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
              fontWeight: 600,
              fontSize: 18,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            &lt; Back
          </Link>
        </div>
      )}
    </div>
  )
}
