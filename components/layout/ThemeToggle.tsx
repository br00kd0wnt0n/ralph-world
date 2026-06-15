'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme, THEMES } from '@/context/ThemeContext'
import PinkDropdown, { panelItemVariants, stackVariants } from './PinkDropdown'

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
  // The PinkDropdown is portalled to document.body so it sits outside the
  // trigger's DOM subtree. Track its panel here so the click-outside check
  // doesn't immediately close the menu when the user clicks inside it.
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setIsOpen(false)
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
        className={`text-header-btn flex items-center gap-2 mid:gap-0 transition-colors ${
          isOpen ? 'text-ralph-pink' : 'text-primary hover:text-ralph-pink'
        }`}
      >
        <span
          className="theme-circle relative shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '2px solid white',
            background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
          }}
        >
          {/* Arrow centered on circle for mid screens */}
          <svg
            width="13"
            height="7"
            viewBox="0 0 13 7"
            fill="none"
            aria-hidden="true"
            className="hidden mid:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <path
              d="M1 1L6.76191 6L12 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="mid:hidden">Theme</span>
        <svg
          width="13"
          height="7"
          viewBox="0 0 13 7"
          fill="none"
          aria-hidden="true"
          className="mid:hidden"
        >
          <path
            d="M1 1L6.76191 6L12 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <PinkDropdown width={360} right={-33} triggerRef={ref} panelRef={panelRef} onClose={() => setIsOpen(false)}>
          <motion.div variants={stackVariants} className="flex flex-col gap-2">
            {THEMES.filter((t) => !t.disabled).map((t) => {
              const swatchColors = SWATCH_COLORS[t.id] ?? ['#888', '#888', '#888']
              const isActive = theme === t.id
              return (
                <motion.button
                  key={t.id}
                  variants={panelItemVariants}
                  onClick={() => {
                    setTheme(t.id)
                    setIsOpen(false)
                  }}
                  className="text-intro flex w-full items-center gap-4 text-black"
                  style={{ fontSize: 16 }}
                >
                  <span
                    className="shrink-0"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      border: `2px solid ${isActive ? 'var(--color-ralph-pink)' : '#FFFFFF'}`,
                      background: `linear-gradient(135deg, ${swatchColors[0]}, ${swatchColors[1]}, ${swatchColors[2]})`,
                    }}
                  />
                  <span className="flex-1 text-left">{t.label}</span>
                  {isActive && (
                    <img
                      src="/imgs/icon_tick.svg"
                      alt=""
                      aria-hidden="true"
                      width={21}
                      height={19}
                    />
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        </PinkDropdown>
      )}
    </div>
  )
}
