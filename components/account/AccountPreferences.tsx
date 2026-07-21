'use client'

import { useState } from 'react'
import { safeSet } from '@/lib/safe-storage'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'hi', label: 'हिंदी' },
]

interface AccountPreferencesProps {
  initialLanguage: string
}

// Server-persisted preferences. On change, we save immediately rather than
// making the user click "save" — single-choice controls are expected to
// feel live. Failures revert the control and surface an inline error.
//
// The theme picker used to live here but was pulled for launch — themes
// aren't shipping in v1, and testers were confused by a control that
// didn't do anything. Language stays because it drives the /jp locale.
export default function AccountPreferences({
  initialLanguage,
}: AccountPreferencesProps) {
  const [language, setLanguage] = useState(initialLanguage)
  const [error, setError] = useState<string | null>(null)
  const [savingField, setSavingField] = useState<'language' | null>(null)

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
        safeSet('ralph-language', next)
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
        <label className="block text-[10px] uppercase tracking-widest text-black/60 font-bold mb-2">
          Language
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => saveLanguage(l.code)}
              disabled={savingField === 'language'}
              className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                language === l.code
                  ? 'border-ralph-pink bg-ralph-pink/10 text-black'
                  : 'border-black/20 text-black/70 hover:text-black hover:border-black/40'
              } disabled:opacity-60`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
