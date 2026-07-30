'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import CanvasBackground from '@/components/layout/CanvasBackground'
import { safeGet, safeSet } from '@/lib/safe-storage'

export type ThemeType = 'css-vars' | 'immersive'

export interface ThemeOption {
  id: string
  label: string
  type: ThemeType
  // Hide from the theme dropdown while its background isn't implemented.
  disabled?: boolean
}

export const THEMES: ThemeOption[] = [
  { id: 'cosy-dynamics', label: 'Starfield', type: 'css-vars' },
  { id: 'light', label: 'Light burst', type: 'css-vars' },
  // Immersive themes iframe an external visual canvas that the CSP frame-src
  // blocks — disabled until the bundled canvas ships (see visual-canvas docs).
  { id: 'ralph-world', label: 'Ralph World', type: 'immersive', disabled: true },
  { id: 'multicolor', label: 'Multicolor', type: 'immersive', disabled: true },
  { id: '8-bit-nostalgia', label: '8-bit nostalgia', type: 'immersive', disabled: true },
  { id: '1980s-fever-dream', label: '1980s fever dream', type: 'immersive', disabled: true },
]

interface ThemeContextValue {
  theme: string
  setTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState('cosy-dynamics')

  useEffect(() => {
    // Restore the saved theme, but only if it's a fully-built (enabled) theme —
    // ignore a stale value pointing at a disabled/unfinished theme so no one
    // gets stuck on a broken background. `?theme=` still works as a shareable
    // override. Falls back to the dark Starfield default.
    const enabled = THEMES.filter((t) => !t.disabled).map((t) => t.id)
    const query = new URLSearchParams(window.location.search).get('theme')
    const stored = safeGet('ralph-theme')
    const next =
      (query && enabled.includes(query) && query) ||
      (stored && enabled.includes(stored) && stored) ||
      'cosy-dynamics'
    setThemeState(next)
    document.documentElement.setAttribute('data-theme', next)
  }, [])

  function setTheme(id: string) {
    setThemeState(id)
    safeSet('ralph-theme', id)
    document.documentElement.setAttribute('data-theme', id)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export function BackgroundLayer() {
  const { theme } = useTheme()
  if (theme === 'ralph-world') return <CanvasBackground presetKey="ralph-world" />
  if (theme === 'multicolor') return <CanvasBackground presetKey="multicolor" />
  // Future: immersive theme backgrounds (8-bit, fever dream)
  return null
}
