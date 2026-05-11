'use client'

import { useEffect } from 'react'
import { startPlanetPreload } from '@/lib/hooks/usePlanetPreloader'

/**
 * Invisible component that triggers planet image preloading on mount.
 * Place in the root layout to ensure images are cached before navigation.
 */
export default function PlanetPreloader() {
  useEffect(() => {
    startPlanetPreload()
  }, [])

  return null
}
