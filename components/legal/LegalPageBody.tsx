'use client'

import { useEffect, useRef } from 'react'
import { sanitizeArticleHtml } from '@/lib/sanitize'

/**
 * Renders CMS-authored legal HTML. Two behaviours on top of the plain
 * sanitised dump:
 *
 *   1. Any `<a href="#cookie-preferences">…</a>` in the body gets its
 *      click intercepted and dispatches the same `ralph-cookie-reset`
 *      event the footer's CookiePreferencesLink uses. Editors can
 *      drop that special href anywhere in the copy to expose the
 *      "re-open the banner" affordance without needing a React
 *      component in the CMS.
 *
 *   2. External links (anything starting `http://` or `https://` and
 *      NOT pointing at ralph.world) are decorated with
 *      `target="_blank" rel="noopener noreferrer"` post-render — the
 *      sanitiser strips these attrs on inbound HTML, so we re-add
 *      them here for offsite links only.
 */
export default function LegalPageBody({ bodyHtml }: { bodyHtml: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const anchors = el.querySelectorAll<HTMLAnchorElement>('a')
    const cookieHandlers: Array<() => void> = []

    anchors.forEach((a) => {
      const href = a.getAttribute('href') ?? ''
      if (href === '#cookie-preferences') {
        const handler = (e: MouseEvent) => {
          e.preventDefault()
          try {
            window.dispatchEvent(new Event('ralph-cookie-reset'))
          } catch {
            /* ignore */
          }
        }
        a.addEventListener('click', handler)
        cookieHandlers.push(() => a.removeEventListener('click', handler))
      } else if (/^https?:\/\//i.test(href) && !/ralph\.world/i.test(href)) {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
      }
    })

    return () => cookieHandlers.forEach((off) => off())
  }, [bodyHtml])

  return (
    <div
      ref={ref}
      // Sanitiser scrubs event handlers + unknown tags before this
      // ever reaches the DOM. Editors are trusted (admin-only) but we
      // apply the same defence-in-depth as article bodies.
      dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(bodyHtml) }}
    />
  )
}
