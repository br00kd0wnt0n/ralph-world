'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getSupabaseBrowser } from '@/lib/supabase/client'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'hi', label: 'हिंदी' },
]

export default function LanguageModal() {
  const { user, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguageState] = useState('en')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('ralph-language')
    if (stored) setLanguageState(stored)
  }, [])

  useEffect(() => {
    if (profile?.language_preference) {
      setLanguageState(profile.language_preference)
    }
  }, [profile])

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
    localStorage.setItem('ralph-language', code)
    setIsOpen(false)

    if (user) {
      const supabase = getSupabaseBrowser()
      await supabase
        .from('profiles')
        .update({ language_preference: code })
        .eq('id', user.id)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-secondary hover:text-primary transition-colors font-medium"
        aria-label="Choose language"
      >
        A|B
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
