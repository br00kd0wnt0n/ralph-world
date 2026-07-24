'use client'

import { useEffect, useState } from 'react'

/**
 * Fetches the HLS relay URL from /api/broadcaster/relay-url on mount.
 *
 * Replaces the previous pattern of reading process.env.NEXT_PUBLIC_
 * BROADCASTER_RELAY_URL directly in client components — that inlined
 * the URL at build time and silently baked `undefined` when the env
 * var was missing during the build. This runtime fetch means the URL
 * can be set / rotated without redeploying the app.
 *
 * Returns null until the fetch resolves; consumers should render an
 * offline / loading state while it's null.
 */
export function useRelayUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/broadcaster/relay-url', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { url?: string | null } | null) => {
        if (mounted && data?.url) setUrl(data.url)
      })
      .catch(() => {
        // Silent — consumer already handles null as "no stream URL".
      })
    return () => {
      mounted = false
    }
  }, [])

  return url
}
