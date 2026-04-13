'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * Returns a Y offset relative to the element's position in the viewport.
 * When the element is centered in the viewport, offset is 0.
 * As it scrolls away, offset grows proportionally to `factor`.
 */
export function useParallax(factor = 0.3, ref?: RefObject<HTMLElement | null>) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    function onScroll() {
      if (ref?.current) {
        const rect = ref.current.getBoundingClientRect()
        const centerY = rect.top + rect.height / 2
        const viewportCenter = window.innerHeight / 2
        setOffset((centerY - viewportCenter) * factor)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [factor, ref])

  return offset
}
