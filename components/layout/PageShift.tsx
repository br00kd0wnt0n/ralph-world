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
      // `relative z-10` gives this its own stacking context so the whole page
      // sits above the midground/foreground parallax layers (z-1 / z-5).
      className="relative z-10 flex-1 flex flex-col"
      style={{
        transform: open ? 'translateX(100%)' : 'none',
        opacity: open ? 0 : 1,
        transition:
          'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease-out',
        // Only hint will-change while the menu is open — when set permanently it
        // creates a containing block for position:fixed descendants (e.g. the
        // events expanded panel), pinning them to this box instead of the viewport.
        willChange: open ? 'transform, opacity' : undefined,
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
