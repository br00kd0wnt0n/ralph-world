'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { safeGet, safeSet } from '@/lib/safe-storage'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'hi', label: 'हिंदी' },
] as const

/**
 * Shared language state: reads the stored preference, persists changes to
 * localStorage, and (when signed in) syncs to the profile. Used by both the
 * nav LanguageModal and the mobile menu so they behave identically.
 */
export function useLanguage() {
  const { user } = useAuth()
  const [language, setLanguageState] = useState('en')

  useEffect(() => {
    const stored = safeGet('ralph-language')
    if (stored) setLanguageState(stored)
  }, [])

  const setLanguage = useCallback(
    async (code: string) => {
      setLanguageState(code)
      safeSet('ralph-language', code)
      if (user) {
        await fetch('/api/profile/language', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: code }),
        })
      }
    },
    [user],
  )

  return { language, setLanguage }
}
