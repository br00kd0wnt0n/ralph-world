'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeType = 'css-vars' | 'immersive'

export interface ThemeOption {
  id: string
  label: string
  type: ThemeType
}

export const THEMES: ThemeOption[] = [
  { id: 'cosy-dynamics', label: 'Starfield', type: 'css-vars' },
  { id: 'light', label: 'Light', type: 'css-vars' },
  { id: '8-bit-nostalgia', label: '8-bit nostalgia', type: 'immersive' },
  { id: '1980s-fever-dream', label: '1980s fever dream', type: 'immersive' },
]

interface ThemeContextValue {
  theme: string
  setTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState('cosy-dynamics')

  useEffect(() => {
    const stored = localStorage.getItem('ralph-theme')
    if (stored && THEMES.some((t) => t.id === stored)) {
      setThemeState(stored)
      document.documentElement.setAttribute('data-theme', stored)
    } else {
      document.documentElement.setAttribute('data-theme', 'cosy-dynamics')
    }
  }, [])

  function setTheme(id: string) {
    setThemeState(id)
    localStorage.setItem('ralph-theme', id)
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
  const config = THEMES.find((t) => t.id === theme)
  if (!config || config.type === 'css-vars') return null
  // Future: immersive theme backgrounds (8-bit, fever dream)
  return null
}
