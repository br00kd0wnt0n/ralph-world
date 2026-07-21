'use client'

import { useState, useTransition } from 'react'

interface PrivacyControlsProps {
  initialMarketingOptIn: boolean
}

/**
 * Member-portal privacy controls — Task 3.10.
 *
 * - Marketing newsletter toggle (POST /api/account/marketing-opt-in)
 * - Download my data button (GET /api/account/export — browser saves JSON)
 * - Delete account button with two-step confirmation
 *
 * All three are GDPR / UK GDPR rights endpoints. The component is
 * deliberately separate from AccountPreferences so the rights surface
 * is visually grouped (and discoverable) rather than buried.
 */
export default function PrivacyControls({
  initialMarketingOptIn,
}: PrivacyControlsProps) {
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn)
  const [marketingBusy, setMarketingBusy] = useState(false)
  const [marketingError, setMarketingError] = useState<string | null>(null)
  const [marketingSavedAt, setMarketingSavedAt] = useState<Date | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletePending, startDelete] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function toggleMarketing() {
    if (marketingBusy) return
    const next = !marketingOptIn
    setMarketingOptIn(next) // optimistic
    setMarketingBusy(true)
    setMarketingError(null)
    try {
      const res = await fetch('/api/account/marketing-opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted: next }),
      })
      if (!res.ok) {
        setMarketingOptIn(!next) // rollback
        setMarketingError('Could not save your preference. Try again.')
      } else {
        setMarketingSavedAt(new Date())
      }
    } catch {
      setMarketingOptIn(!next)
      setMarketingError('Network error. Try again.')
    } finally {
      setMarketingBusy(false)
    }
  }

  function downloadData() {
    // Plain anchor navigation triggers the Content-Disposition download.
    window.location.assign('/api/account/export')
  }

  function deleteAccount() {
    if (!confirmDelete) return
    startDelete(async () => {
      setDeleteError(null)
      try {
        const res = await fetch('/api/account/delete', { method: 'POST' })
        if (!res.ok) {
          setDeleteError('Deletion failed. Email hello@ralph.world for help.')
          return
        }
        // Hard navigation so the now-invalid session cookie is forgotten
        // and the next render goes through the unauthenticated tree.
        window.location.assign('/')
      } catch {
        setDeleteError('Network error. Try again or email hello@ralph.world.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Marketing newsletter */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-black text-sm font-bold">
              Ralph newsletter
            </p>
            <p className="text-black/70 text-xs font-semibold mt-0.5">
              News, drops, and the occasional pun. Unsubscribe any time.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={marketingOptIn}
            aria-label="Toggle Ralph newsletter"
            onClick={toggleMarketing}
            disabled={marketingBusy}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ralph-pink focus:ring-offset-2 focus:ring-offset-white ${
              marketingOptIn ? 'bg-ralph-pink' : 'bg-black/25'
            } ${marketingBusy ? 'opacity-60' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                marketingOptIn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs font-semibold mt-2 min-h-[1rem]">
          {marketingError ? (
            <span className="text-red-600">{marketingError}</span>
          ) : marketingSavedAt ? (
            <span className="text-black/60">
              Saved{' '}
              {marketingSavedAt.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          ) : null}
        </p>
      </div>

      {/* Your data — collapsed by default so it doesn't dominate the page,
          but discoverable so we still satisfy UK GDPR Art. 15 transparency. */}
      <details className="pt-5 border-t border-black/10 group">
        <summary className="text-black text-sm font-bold cursor-pointer list-none flex items-center gap-2 hover:text-ralph-pink transition-colors">
          <span className="inline-block transition-transform group-open:rotate-90">
            ›
          </span>
          Your data
        </summary>
        <div className="mt-2 pl-4">
          <p className="text-black/70 text-xs font-semibold mb-2">
            Export a JSON file with the personal data Ralph holds about you (UK
            GDPR Art. 15). For data held by Stripe / Shopify / Sentry / Resend,{' '}
            <a
              href="mailto:hello@ralph.world?subject=Data%20export%20request"
              className="underline text-ralph-pink hover:opacity-80"
            >
              email us
            </a>
            .
          </p>
          <button
            type="button"
            onClick={downloadData}
            className="rounded-full border-2 border-black/30 px-4 py-1.5 text-sm text-black hover:border-black transition-colors"
            style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
          >
            Download as JSON
          </button>
        </div>
      </details>

      {/* Delete account */}
      <div className="pt-5 border-t border-black/10">
        <p className="text-red-600 text-sm font-bold">Delete account</p>
        <p className="text-black/70 text-xs font-semibold mt-0.5 mb-3">
          Removes your account, profile, and most associated data. Records we
          must keep for legal/financial reasons (consent log,
          subscription/order history) are retained but unlinked from your
          identity. This action cannot be undone.
        </p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-full border-2 border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
          >
            Delete my account…
          </button>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-red-700 text-xs font-semibold mb-3">
              Are you sure? This is permanent.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deletePending}
                className="rounded-full bg-red-600 text-white px-4 py-1.5 text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
              >
                {deletePending ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deletePending}
                className="rounded-full border-2 border-black/30 px-4 py-1.5 text-sm text-black hover:border-black"
                style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
            {deleteError && (
              <p className="text-red-600 text-xs font-semibold mt-2">{deleteError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
