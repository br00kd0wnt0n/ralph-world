'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme, THEMES } from '@/context/ThemeContext'
import PinkDropdown, { panelItemVariants, stackVariants } from './PinkDropdown'

// Swatch previews — a mini of the actual theme, not a gradient:
// Starfield = black with white "stars"; Light = off-white with black dots.
export const SWATCH_PREVIEW: Record<string, { bg: string; dot: string }> = {
  'cosy-dynamics': { bg: '#000000', dot: '#FFFFFF' },
  light: { bg: '#FAFAFA', dot: '#000000' },
}
export const SWATCH_STARS: { top: number; left: number; size: number; opacity?: number }[] = [
  { top: 11, left: 13, size: 3 },
  { top: 20, left: 45, size: 2 },
  { top: 41, left: 17, size: 2.5 },
  { top: 15, left: 52, size: 1.5, opacity: 0.7 },
  { top: 49, left: 43, size: 3 },
  { top: 33, left: 31, size: 1.5, opacity: 0.6 },
  { top: 52, left: 22, size: 1.5, opacity: 0.8 },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isLight = theme === 'light'
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
  const activePreview = SWATCH_PREVIEW[activeTheme.id] ?? { bg: '#888888', dot: '#ffffff' }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`text-header-btn flex items-center gap-2 mid:gap-0 rounded-full px-2 -mx-2 transition-colors light:hover:bg-black/20 ${
          isOpen ? 'text-ralph-pink' : 'text-primary hover:text-ralph-pink'
        }`}
      >
        <span
          className="theme-circle relative shrink-0 overflow-hidden"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `2px solid ${isLight ? '#000' : '#fff'}`,
            backgroundColor: activePreview.bg,
          }}
        >
          {/* Active theme's swatch preview — mini stars/dots (scaled to 44px). */}
          {SWATCH_STARS.map((s, si) => (
            <span
              key={si}
              className="absolute rounded-full"
              style={{
                top: s.top * (44 / 64),
                left: s.left * (44 / 64),
                width: s.size,
                height: s.size,
                backgroundColor: activePreview.dot,
                opacity: s.opacity ?? 1,
              }}
            />
          ))}
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
              const preview = SWATCH_PREVIEW[t.id] ?? { bg: '#888888', dot: '#ffffff' }
              const isActive = theme === t.id
              return (
                <motion.button
                  key={t.id}
                  variants={panelItemVariants}
                  onClick={() => {
                    setTheme(t.id)
                    setIsOpen(false)
                  }}
                  className="text-intro flex w-full items-center gap-4 text-black -mx-3 px-3 py-2 rounded-xl hover:bg-black/5 transition-colors"
                  style={{ fontSize: 16 }}
                >
                  <span
                    className="shrink-0 relative overflow-hidden"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      border: `2px solid ${isActive ? 'var(--color-ralph-pink)' : isLight ? '#000000' : '#FFFFFF'}`,
                      backgroundColor: preview.bg,
                    }}
                  >
                    {SWATCH_STARS.map((s, si) => (
                      <span
                        key={si}
                        className="absolute rounded-full"
                        style={{
                          top: s.top,
                          left: s.left,
                          width: s.size,
                          height: s.size,
                          backgroundColor: preview.dot,
                          opacity: s.opacity ?? 1,
                        }}
                      />
                    ))}
                  </span>
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
