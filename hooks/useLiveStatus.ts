'use client'

import { useEffect, useState } from 'react'
import type { RelayStatus } from '@/lib/broadcaster/types'

const POLL_MS = 30_000

export function useLiveStatus() {
  const [status, setStatus] = useState<RelayStatus>({
    streaming: false,
    available: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchStatus() {
      try {
        const res = await fetch('/api/broadcaster/relay-status')
        if (!res.ok) return
        const data = await res.json()
        if (mounted) {
          setStatus(data)
          setIsLoading(false)
        }
      } catch {
        // Silently fail — status stays at default (offline)
        if (mounted) setIsLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, POLL_MS)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const isLive = status.streaming && status.available

  return { status, isLive, isLoading }
}
