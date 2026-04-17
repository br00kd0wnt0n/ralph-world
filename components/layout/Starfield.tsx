'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

const STAR_COUNT = 200

export default function Starfield() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Re-run on every theme change so the effect rebuilds the animation
    // when the user switches back to cosy-dynamics after having been on
    // another theme. Without the theme dep, the old `canvasRef` closure
    // points at a detached canvas and the new one stays blank.
    if (theme !== 'cosy-dynamics') return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let scrollY = 0

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.1,
      speed: Math.random() * 0.0003 + 0.0001,
      phase: Math.random() * Math.PI * 2,
      depth: Math.random(), // 0 = far (slow), 1 = near (fast)
    }))

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const star of stars) {
        const twinkle =
          star.opacity + Math.sin(time * star.speed + star.phase) * 0.3
        const alpha = Math.max(0.05, Math.min(1, twinkle))

        // Parallax: near stars (depth~1) shift more, far stars barely move
        const parallaxOffset = scrollY * (0.02 + star.depth * 0.08)
        const yPos = (star.y * canvas!.height - parallaxOffset) % canvas!.height
        const wrappedY = yPos < 0 ? yPos + canvas!.height : yPos

        ctx!.beginPath()
        ctx!.arc(
          star.x * canvas!.width,
          wrappedY,
          star.size,
          0,
          Math.PI * 2
        )
        ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx!.fill()
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

  // Only render for themes that want a starfield — otherwise it would
  // stack on top of other theme backgrounds (e.g. the ralph-world 3D canvas).
  if (theme !== 'cosy-dynamics') return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}
