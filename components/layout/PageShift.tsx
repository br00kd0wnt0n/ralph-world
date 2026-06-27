'use client'

import { useMenu } from '@/context/MenuContext'
import type { ReactNode } from 'react'

/**
 * Wraps the page content (main + footer) and slides it fully off to the right
 * when the burger menu opens, revealing the starfield beneath (z-0) while the
 * menu slides in from the left. Uses `none` when closed so it never creates a
 * containing block that would break `position: fixed` descendants.
 */
export default function PageShift({ children }: { children: ReactNode }) {
  const { open } = useMenu()
  return (
    <div
      // z-10 here (not just on <main>) because will-change below makes this a
      // stacking context; without it the whole page would sit at z-auto and the
      // midground/foreground parallax layers (z-1 / z-5) would paint on top.
      className="relative z-10 flex-1 flex flex-col"
      style={{
        transform: open ? 'translateX(100%)' : 'none',
        opacity: open ? 0 : 1,
        transition:
          'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease-out',
        willChange: 'transform, opacity',
        // Feather the leading (left) edge while sliding so subpages' white
        // backgrounds don't show a hard white line against the starfield.
        maskImage: open
          ? 'linear-gradient(to right, transparent 0, black 140px)'
          : undefined,
        WebkitMaskImage: open
          ? 'linear-gradient(to right, transparent 0, black 140px)'
          : undefined,
      }}
    >
      {children}
    </div>
  )
}
