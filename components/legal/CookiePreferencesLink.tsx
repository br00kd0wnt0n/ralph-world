'use client'

/**
 * Tiny inline link that re-opens the cookie banner. Used in the footer
 * and on the cookies page so a user can change their mind any time.
 *
 * Dispatches a `ralph-cookie-reset` event that CookieBanner listens for
 * — it clears the stored consent and re-shows the banner.
 */
export default function CookiePreferencesLink({
  children = 'manage cookie preferences',
  className = 'underline text-ralph-pink hover:opacity-80',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          window.dispatchEvent(new Event('ralph-cookie-reset'))
        } catch {
          /* ignore */
        }
      }}
      className={className}
    >
      {children}
    </button>
  )
}
