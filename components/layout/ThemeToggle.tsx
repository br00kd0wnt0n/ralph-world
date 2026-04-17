'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme, THEMES } from '@/context/ThemeContext'

const SWATCH_COLORS: Record<string, string[]> = {
  'cosy-dynamics': ['#000000', '#7B2FBE', '#FF2098'],
  light: ['#FAFAFA', '#E0D8F0', '#FF2D6B'],
  'ralph-world': ['#FBC000', '#31BDBF', '#EB008B'],
  multicolor: ['#EB008B', '#FBC000', '#31BDBF', '#F16524'],
  '8-bit-nostalgia': ['#2D2D2D', '#00FF00', '#FF00FF'],
  '1980s-fever-dream': ['#FF00FF', '#00FFFF', '#FFFF00'],
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0]
  const colors = SWATCH_COLORS[activeTheme.id] ?? SWATCH_COLORS['cosy-dynamics']

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-secondary hover:text-primary transition-colors"
      >
        <span
          className="h-5 w-5 rounded-full shrink-0"
          style={{
            background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
          }}
        />
        <span>Theme</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 4L5 6.5L7.5 4" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-lg border border-border bg-surface p-1 shadow-xl">
          {THEMES.filter((t) => !t.disabled).map((t) => {
            const swatchColors = SWATCH_COLORS[t.id] ?? ['#888', '#888', '#888']
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                  setIsOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-primary hover:bg-background transition-colors"
              >
                <span
                  className="h-4 w-8 rounded-full shrink-0"
                  style={{
                    background: `linear-gradient(90deg, ${swatchColors[0]}, ${swatchColors[1]}, ${swatchColors[2]})`,
                  }}
                />
                <span className="flex-1 text-left">{t.label}</span>
                {theme === t.id && (
                  <span className="text-ralph-pink">&#10003;</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
