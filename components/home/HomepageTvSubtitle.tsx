'use client'

import { useEffect, useState } from 'react'
import { londonWallToLocalWall, viewerTimezoneLabel } from '@/lib/tv/time'

/**
 * Renders the TV panel's "on now" subtitle (an "HH:MM–HH:MM" range) with
 * both times translated from broadcaster wall-clock (Europe/London) into
 * the viewer's local timezone. Falls back to the raw server value on SSR
 * / first render so hydration matches, then swaps on mount.
 */
export default function HomepageTvSubtitle({
  raw,
  className,
  style,
}: {
  /** The pre-formatted "HH:MM–HH:MM" (en-dash) string from getTVItems. */
  raw: string | undefined
  className?: string
  style?: React.CSSProperties
}) {
  const [localised, setLocalised] = useState<string | null>(null)

  useEffect(() => {
    if (!raw) {
      setLocalised(null)
      return
    }
    // Match either an en-dash or hyphen between two HH:MM strings.
    const m = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/.exec(raw.trim())
    if (!m) {
      setLocalised(null)
      return
    }
    const ref = new Date()
    const start = londonWallToLocalWall(m[1], ref)
    const end = londonWallToLocalWall(m[2], ref)
    const tz = viewerTimezoneLabel(ref)
    setLocalised(tz ? `${start}–${end} ${tz}` : `${start}–${end}`)
  }, [raw])

  return (
    <p className={className} style={style}>
      {localised ?? raw ?? 'Switch on, tune in, and see what we are playing right now.'}
    </p>
  )
}
