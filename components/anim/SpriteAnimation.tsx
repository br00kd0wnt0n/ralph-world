'use client'

import { useEffect, useRef } from 'react'
import { register } from '@/lib/anim/sequencer'
import { ANIMATIONS, type AnimationName } from '@/lib/anim/animations'

interface SpriteAnimationProps {
  name: AnimationName
  /** Override the registry default fps. */
  fps?: number
  /** Per-frame durations (ms) — overrides fps for non-uniform timing. */
  durations?: number[]
  /** Shift the timeline (ms) to desync identical animations. */
  offset?: number
  mode?: 'loop' | 'once' | 'pingpong'
  /** Display width in px; height derives from the frame aspect ratio. */
  width?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Renders one sprite-sheet animation as a single element, stepping through
 * frames via CSS background-position. Frame timing is owned by the central
 * sequencer (one rAF for the whole page), which mutates this element's
 * background-position-x imperatively — no per-frame React re-render.
 */
export default function SpriteAnimation({
  name,
  fps,
  durations,
  offset = 0,
  mode = 'loop',
  width,
  className,
  style,
}: SpriteAnimationProps) {
  const sheet = ANIMATIONS[name]
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return register({
      frameCount: sheet.count,
      fps: fps ?? sheet.fps,
      durations,
      offset,
      mode,
      onFrame: (i) => {
        const el = ref.current
        if (!el) return
        // Single-row percentage sprite: with background-size width set to
        // count×100%, frame i sits at i/(count-1) × 100% on the x axis.
        el.style.backgroundPositionX =
          sheet.count > 1 ? `${(i / (sheet.count - 1)) * 100}%` : '0%'
      },
    })
  }, [sheet.count, sheet.fps, fps, durations, offset, mode])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{
        width: width ?? sheet.frameW,
        aspectRatio: `${sheet.frameW} / ${sheet.frameH}`,
        backgroundImage: `url(${sheet.src})`,
        backgroundSize: `${sheet.count * 100}% 100%`,
        backgroundRepeat: 'no-repeat',
        backgroundPositionX: '0%',
        ...style,
      }}
    />
  )
}
