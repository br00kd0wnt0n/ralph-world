'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { safeGet, safeSet } from '@/lib/safe-storage'

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

  useEffect(() => {
    const stored = safeGet('ralph-language')
    if (stored) setLanguageState(stored)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
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
        className="flex items-center justify-center w-8 h-8 rounded-full border border-border/60 text-xs text-secondary hover:text-primary transition-colors font-medium"
        aria-label="Choose language"
      >
        Aβ
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-lg border border-border bg-surface p-1 shadow-xl">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-primary hover:bg-background transition-colors"
            >
              <span>{lang.label}</span>
              {language === lang.code && (
                <span className="text-ralph-pink">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
