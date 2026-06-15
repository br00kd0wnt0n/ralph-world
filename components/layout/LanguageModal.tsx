'use client'

import { Fragment, useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { safeGet, safeSet } from '@/lib/safe-storage'
import PinkDropdown, { panelItemVariants, stackVariants } from './PinkDropdown'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'hi', label: 'हिंदी' },
]

export default function LanguageModal() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguageState] = useState('en')
  const ref = useRef<HTMLDivElement>(null)
  // PinkDropdown is portalled to document.body — include its panel in the
  // click-outside check so clicks inside the menu don't close it.
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = safeGet('ralph-language')
    if (stored) setLanguageState(stored)
  }, [])

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

  async function setLanguage(code: string) {
    setLanguageState(code)
    safeSet('ralph-language', code)
    setIsOpen(false)

    if (user) {
      // Server action to update profile language preference
      await fetch('/api/profile/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: code }),
      })
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`language-btn relative flex items-center justify-center transition-colors hover:bg-ralph-pink ${
          isOpen ? 'bg-ralph-pink' : ''
        }`}
        style={{ borderRadius: 12 }}
        aria-label="Choose language"
      >
        <img
          src="/imgs/icon_language.svg"
          alt=""
          aria-hidden="true"
          style={{ height: 44, width: 'auto' }}
        />
        <span
          className="absolute bg-white left-1/2 top-0 -translate-x-1/2 h-full"
          style={{ width: 2 }}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <PinkDropdown width={237} right={-57} triggerRef={ref} panelRef={panelRef} onClose={() => setIsOpen(false)}>
          <motion.div
            variants={stackVariants}
            className="flex flex-col items-end w-full"
          >
            {LANGUAGES.map((lang, i) => (
              <Fragment key={lang.code}>
                <motion.button
                  variants={panelItemVariants}
                  onClick={() => setLanguage(lang.code)}
                  className="text-intro relative flex w-full items-center justify-end text-black"
                  style={{ fontSize: 16, paddingTop: '1rem', paddingBottom: '1rem', paddingRight: 40 }}
                >
                  <span>{lang.label}</span>
                  {language === lang.code && (
                    <img
                      src="/imgs/icon_tick.svg"
                      alt=""
                      aria-hidden="true"
                      width={21}
                      height={19}
                      className="absolute"
                      style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}
                    />
                  )}
                </motion.button>
                {i < LANGUAGES.length - 1 && (
                  <motion.img
                    variants={panelItemVariants}
                    src={i === 0 ? '/imgs/divide_line_01.svg' : '/imgs/divide_line_02.svg'}
                    alt=""
                    aria-hidden="true"
                    style={{ width: 177, height: 'auto' }}
                  />
                )}
              </Fragment>
            ))}
          </motion.div>
        </PinkDropdown>
      )}
    </div>
  )
}
