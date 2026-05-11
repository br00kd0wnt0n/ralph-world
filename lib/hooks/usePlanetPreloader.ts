'use client'

import { useEffect, useState } from 'react'

// All planet images used across section pages
const PLANET_IMAGES = [
  '/imgs/planet_background_magazine.svg',
  '/imgs/planet_foreground_magazine.svg',
  '/imgs/planet_background_tv.svg',
  '/imgs/planet_foreground_tv.svg',
  '/imgs/planet_background_events.svg',
  '/imgs/planet_foreground_events.svg',
  '/imgs/planet_background_shop.svg',
  '/imgs/planet_foreground_shop.svg',
  '/imgs/planet_background_lab.svg',
  '/imgs/planet_foreground_lab.svg',
  '/imgs/planet_background_creative.svg',
  '/imgs/planet_foreground_creative.svg',
]

let preloadPromise: Promise<void> | null = null
let isPreloaded = false

function preloadImages(): Promise<void> {
  if (isPreloaded) return Promise.resolve()
  if (preloadPromise) return preloadPromise

  preloadPromise = Promise.all(
    PLANET_IMAGES.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve() // Don't block on failed loads
          img.src = src
        })
    )
  ).then(() => {
    isPreloaded = true
  })

  return preloadPromise
}

/**
 * Hook that preloads all planet images on first mount.
 * Returns true when all images are cached and ready.
 */
export function usePlanetPreloader(): boolean {
  const [ready, setReady] = useState(isPreloaded)

  useEffect(() => {
    if (isPreloaded) {
      setReady(true)
      return
    }
    preloadImages().then(() => setReady(true))
  }, [])

  return ready
}

/**
 * Call this early (e.g., in layout) to start preloading immediately.
 * Doesn't block rendering - just kicks off the preload.
 */
export function startPlanetPreload(): void {
  if (typeof window !== 'undefined') {
    preloadImages()
  }
}
