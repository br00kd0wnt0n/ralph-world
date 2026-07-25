'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import CanvasBackground from '@/components/layout/CanvasBackground'
import { safeSet } from '@/lib/safe-storage'

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
  { id: 'light', label: 'Light', type: 'css-vars' },
  { id: 'ralph-world', label: 'Ralph World', type: 'immersive' },
  { id: 'multicolor', label: 'Multicolor', type: 'immersive' },
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
    // Launch: force the dark Starfield theme for everyone. The theme switcher
    // is hidden and the other themes' backgrounds aren't ready, so a stale
    // stored preference (e.g. 'light' or 'ralph-world') would otherwise leave
    // users on a broken / light-grey background. Restore the stored-theme
    // read below when multi-theme ships.
    setThemeState('cosy-dynamics')
    document.documentElement.setAttribute('data-theme', 'cosy-dynamics')
    // const stored = safeGet('ralph-theme')
    // if (stored && THEMES.some((t) => t.id === stored)) {
    //   setThemeState(stored)
    //   document.documentElement.setAttribute('data-theme', stored)
    // } else {
    //   document.documentElement.setAttribute('data-theme', 'cosy-dynamics')
    // }
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
