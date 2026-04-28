'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Returns true briefly when the pathname changes, allowing components
 * to trigger exit animations before the route transition completes.
 *
 * @param duration - How long to keep isExiting true (default: 100ms)
 * @returns boolean indicating if a page exit is in progress
 */
export function usePageExit(duration = 100): boolean {
  const pathname = usePathname()
  const [isExiting, setIsExiting] = useState(false)
  const previousPathRef = useRef(pathname)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Detect pathname change
    if (pathname !== previousPathRef.current) {
      previousPathRef.current = pathname
      setIsExiting(true)

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Reset after duration
      timeoutRef.current = setTimeout(() => {
        setIsExiting(false)
      }, duration)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [pathname, duration])

  return isExiting
}
