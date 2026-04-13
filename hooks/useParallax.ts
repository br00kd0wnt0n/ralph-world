'use client'

import { useEffect, useState } from 'react'

/**
 * Returns a Y offset that moves at `factor` × scroll speed.
 * factor=0.3 means the element moves at 30% of scroll speed (parallax lag).
 */
export function useParallax(factor = 0.3) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    function onScroll() {
      setOffset(window.scrollY * factor)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [factor])

  return offset
}
