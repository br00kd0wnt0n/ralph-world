'use client'

import type { CrowdBackgroundProps } from './EventCreature.types'

export default function CrowdBackground({
  children,
  illustration: Illustration,
}: CrowdBackgroundProps) {
  return (
    <div className="relative w-full h-[60vh] min-h-[400px] overflow-hidden">
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

      {/* Scene (static — no parallax) */}
      <div className="absolute inset-0">
        {Illustration ? (
          <Illustration />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-ralph-purple/20 to-ralph-teal/20 flex items-center justify-center">
            <span className="text-white/30 text-xs tracking-widest">
              crowd scene placeholder
            </span>
          </div>
        )}
      </div>

      {/* Creatures + flyouts */}
      <div className="absolute inset-0">{children}</div>
    </div>
  )
}
