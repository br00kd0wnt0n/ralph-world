'use client'

import { useState } from 'react'
import { useTheme, THEMES } from '@/context/ThemeContext'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'hi', label: 'हिंदी' },
]

interface AccountPreferencesProps {
  initialLanguage: string
  initialTheme: string
}

// Server-persisted preferences. On change, we save immediately rather than
// making the user click "save" — single-choice controls are expected to
// feel live. Failures revert the control and surface an inline error.
export default function AccountPreferences({
  initialLanguage,
  initialTheme,
}: AccountPreferencesProps) {
  const { theme, setTheme } = useTheme()
  const [language, setLanguage] = useState(initialLanguage)
  const [activeTheme, setActiveTheme] = useState(initialTheme || theme)
  const [error, setError] = useState<string | null>(null)
  const [savingField, setSavingField] = useState<'theme' | 'language' | null>(
    null
  )

  async function saveTheme(next: string) {
    setError(null)
    const prev = activeTheme
    setActiveTheme(next)
    setTheme(next) // update UI immediately
    setSavingField('theme')
    try {
      const res = await fetch('/api/profile/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      })
      if (!res.ok) {
        setActiveTheme(prev)
        setTheme(prev)
        setError('Could not save theme — try again.')
      }
    } catch {
      setActiveTheme(prev)
      setTheme(prev)
      setError('Network issue — try again.')
    } finally {
      setSavingField(null)
    }
  }

  async function saveLanguage(next: string) {
    setError(null)
    const prev = language
    setLanguage(next)
    setSavingField('language')
    try {
      const res = await fetch('/api/profile/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: next }),
      })
      if (!res.ok) {
        setLanguage(prev)
        setError('Could not save language — try again.')
      } else {
        localStorage.setItem('ralph-language', next)
      }
    } catch {
      setLanguage(prev)
      setError('Network issue — try again.')
    } finally {
      setSavingField(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
          Theme
        </label>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => saveTheme(t.id)}
              disabled={savingField === 'theme'}
              className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                activeTheme === t.id
                  ? 'border-ralph-pink bg-ralph-pink/10 text-primary'
                  : 'border-border text-secondary hover:text-primary hover:border-secondary'
              } disabled:opacity-60`}
            >
              <span className="block font-medium">{t.label}</span>
              {t.type === 'immersive' && (
                <span className="text-[10px] text-muted uppercase tracking-widest">
                  Coming soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
          Language
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => saveLanguage(l.code)}
              disabled={savingField === 'language'}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                language === l.code
                  ? 'border-ralph-pink bg-ralph-pink/10 text-primary'
                  : 'border-border text-secondary hover:text-primary hover:border-secondary'
              } disabled:opacity-60`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
