'use client'

import type { CSSProperties } from 'react'
import SpriteAnimation from './SpriteAnimation'

interface AlienBurnSaucerProps {
  /** Saucer display width (px or CSS length e.g. '100%'). */
  width?: number | string
  className?: string
  style?: CSSProperties
  /** Exhaust width as a % of the saucer width. */
  exhaustPct?: number
}

/**
 * The "alien burn" saucer (pingpong) with the exhaust plume looping behind it.
 * The exhaust sits centred and lower in the stack (z-0), its top tucked 40px up
 * into the saucer's bottom edge so the flame reads as coming out from under it.
 */
export default function AlienBurnSaucer({
  width,
  className,
  style,
  exhaustPct = 55,
}: AlienBurnSaucerProps) {
  return (
    <div className={className} style={{ position: 'relative', width, ...style }}>
      {/* Exhaust — behind (z-0), centred, top tucked 40px into the saucer. */}
      <SpriteAnimation
        name="exhaust"
        mode="loop"
        className="absolute left-1/2 -translate-x-1/2"
        style={{ width: `${exhaustPct}%`, top: 'calc(100% - 40px)', zIndex: 0 }}
      />
      {/* Saucer — on top (z-1). */}
      <SpriteAnimation
        name="alien-burn"
        mode="pingpong"
        className="relative block"
        style={{ width: '100%', zIndex: 1 }}
      />
    </div>
  )
}
