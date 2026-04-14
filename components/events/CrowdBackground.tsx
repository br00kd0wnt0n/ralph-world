'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { CROWD_PARALLAX_FACTOR } from '@/lib/animation/events'
import type { CrowdBackgroundProps } from './EventCreature.types'

export default function CrowdBackground({
  children,
  illustration: Illustration,
}: CrowdBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth the mouse motion
  const smoothX = useSpring(mouseX, { damping: 30, stiffness: 100 })
  const smoothY = useSpring(mouseY, { damping: 30, stiffness: 100 })

  // Scene moves opposite to mouse
  const sceneX = useTransform(smoothX, (v) => v * CROWD_PARALLAX_FACTOR)
  const sceneY = useTransform(smoothY, (v) => v * CROWD_PARALLAX_FACTOR)

  function handleMouseMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set(e.clientX - centerX)
    mouseY.set(e.clientY - centerY)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[60vh] min-h-[400px] overflow-hidden"
    >
      {/* Teal curved arch top */}
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute top-0 left-0 right-0 w-full z-20 pointer-events-none"
      >
        <path
          d="M0,120 Q720,0 1440,120"
          fill="none"
          stroke="#00C4B4"
          strokeWidth="3"
        />
      </svg>

      {/* Parallax scene */}
      <motion.div
        style={{ x: sceneX, y: sceneY }}
        className="absolute inset-0"
      >
        {Illustration ? (
          <Illustration />
        ) : (
          /* Crowd placeholder */
          <div className="w-full h-full bg-gradient-to-b from-ralph-purple/20 to-ralph-teal/20 flex items-center justify-center">
            <span className="text-white/30 text-xs tracking-widest">
              crowd scene placeholder
            </span>
          </div>
        )}
      </motion.div>

      {/* Creatures sit on top, unaffected by parallax offset */}
      <div className="absolute inset-0">{children}</div>
    </div>
  )
}
