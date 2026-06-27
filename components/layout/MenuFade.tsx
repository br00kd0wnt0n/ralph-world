'use client'

import { useMenu } from '@/context/MenuContext'
import type { ReactNode } from 'react'

/**
 * Fades its children out while the burger menu is open. Used to hide the
 * decorative midground/foreground canvases (homepage moon/planet, satellite,
 * saucer) so they don't clutter the menu's space scene once the page content
 * slides away — leaving just the starfield + the menu's own decorations.
 * Opacity only (no transform) so it never breaks fixed positioning inside.
 */
export default function MenuFade({ children }: { children: ReactNode }) {
  const { open } = useMenu()
  return (
    <div
      style={{
        opacity: open ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      {children}
    </div>
  )
}
