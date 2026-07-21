'use client'

import { useEffect, useState } from 'react'
import { initSentryClient } from '@/lib/sentry-client-init'
import Button from '@/components/ui/Button'

const STORAGE_KEY = 'ralph-cookie-consent'
type StoredConsent = 'cookies_all' | 'cookies_necessary'

// New JSON shape includes the policy version the user consented to,
// so the banner can re-prompt when legal copy changes.
interface StoredConsentRecord {
  choice: StoredConsent
  version: string
}

/** Parse either the new JSON record or a legacy bare-string value.
 *  Legacy rows are treated as "consented to an unknown version" — the
 *  version mismatch check will re-prompt them on next mount. */
function readStored(raw: string | null): StoredConsentRecord | null {
  if (!raw) return null
  if (raw === 'cookies_all' || raw === 'cookies_necessary') {
    return { choice: raw, version: '__legacy__' }
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredConsentRecord>
    if (
      (parsed?.choice === 'cookies_all' ||
        parsed?.choice === 'cookies_necessary') &&
      typeof parsed?.version === 'string'
    ) {
      return parsed as StoredConsentRecord
    }
  } catch {
    /* fall through */
  }
  return null
}

/**
 * Cookie consent banner — Task 3.10.
 *
 * Sits at the bottom of every page until the visitor chooses. Two
 * buttons, equally weighted (no dark patterns) — GDPR / UK PECR
 * compliance:
 *   - Accept all       → 'cookies_all'        (enables Sentry / analytics)
 *   - Necessary only   → 'cookies_necessary'  (no analytics; only auth + session)
 *
 * On accept:
 *   1. POST /api/consent — server-side consent_log row (binding record)
 *   2. localStorage cache so banner doesn't reappear
 *   3. If 'cookies_all' → initSentryClient()
 *
 * Returning visitors with a stored 'cookies_all' get Sentry initialised
 * automatically on mount.
 *
 * The "Cookie preferences" link in the footer clears storage + triggers
 * a `ralph-cookie-reset` window event that this component listens for,
 * re-showing the banner so users can change their mind.
 */
export default function CookieBanner({
  currentPolicyVersion,
}: {
  /** Live policy version passed down from the root layout (server-fetched).
   *  When a stored consent record's version doesn't match, we re-prompt. */
  currentPolicyVersion: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // On mount, decide whether to show. If stored, also boot Sentry.
  useEffect(() => {
    try {
      const stored = readStored(window.localStorage.getItem(STORAGE_KEY))
      const versionMatches = stored?.version === currentPolicyVersion
      if (stored?.choice === 'cookies_all' && versionMatches) {
        initSentryClient()
      }
      if (!stored || !versionMatches) {
        setOpen(true)
      }
    } catch {
      // Private mode / blocked storage — show the banner so the user can
      // make a fresh choice for this session.
      setOpen(true)
    }

    function onReset() {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      setOpen(true)
    }
    window.addEventListener('ralph-cookie-reset', onReset)
    return () => window.removeEventListener('ralph-cookie-reset', onReset)
  }, [currentPolicyVersion])

  async function choose(choice: StoredConsent) {
    if (busy) return
    setBusy(true)
    try {
      const record: StoredConsentRecord = {
        choice,
        version: currentPolicyVersion,
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    } catch {
      /* ignore — server consent row is still the binding record */
    }
    // Fire-and-forget server log so the network failure doesn't pin
    // the banner open. The UX commitment is "the moment you click is the
    // moment your choice takes effect" — the audit row is best-effort.
    void fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentType: choice, granted: true }),
      // Don't await — the banner closes instantly. If the request fails
      // the localStorage record still suppresses the banner on next mount.
    }).catch(() => {})

    if (choice === 'cookies_all') {
      initSentryClient()
    }
    setOpen(false)
    setBusy(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[200] p-3 sm:p-4 pointer-events-none"
    >
      <div className="max-w-3xl mx-auto bg-white border-2 border-black rounded-lg shadow-2xl p-5 sm:p-6 pointer-events-auto">
        <h2
          className="text-black font-bold text-lg mb-2"
          style={{ fontFamily: "'Gooper Trial', serif" }}
        >
          Cookies on ralph.world
        </h2>
        <p className="text-black/80 text-sm leading-relaxed mb-4">
          We use cookies to keep you signed in and to understand how the site
          is used so we can improve it. Choose <strong>Necessary only</strong>{' '}
          if you&apos;d prefer we skip the analytics ones.{' '}
          <a
            href="/legal/cookies"
            className="underline text-ralph-pink hover:opacity-80"
          >
            See all cookies
          </a>
          .
        </p>
        <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
          <Button
            label="Necessary only"
            onClick={() => choose('cookies_necessary')}
            disabled={busy}
          />
          <Button
            label="Accept all"
            onClick={() => choose('cookies_all')}
            disabled={busy}
            filled
          />
        </div>
      </div>
    </div>
  )
}
