'use client'

import { useEffect, useState } from 'react'
import type { ScheduleItem } from '@/lib/broadcaster/types'
import { londonWallToLocalWall, viewerTimezoneLabel } from '@/lib/tv/time'

interface TeletextShowInfoProps {
  current?: ScheduleItem
}

// Parses an HH:MM time string into minutes since midnight.
// Returns null if the string isn't parseable.
function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export default function TeletextShowInfo({ current }: TeletextShowInfoProps) {
  const [now, setNow] = useState(() => new Date())
  // Local-TZ-converted display times. Null on SSR + first client render
  // (which show the raw London strings) so hydration matches; the effect
  // populates them on mount. The progress calc still runs on London
  // wall-clock minutes so the bar tracks the schedule directly.
  const [localStart, setLocalStart] = useState<string | null>(null)
  const [localEnd, setLocalEnd] = useState<string | null>(null)
  const [tzLabel, setTzLabel] = useState<string>('')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!current) {
      setLocalStart(null)
      setLocalEnd(null)
      return
    }
    setLocalStart(londonWallToLocalWall(current.startTime, new Date()))
    setLocalEnd(londonWallToLocalWall(current.endTime, new Date()))
    setTzLabel(viewerTimezoneLabel())
  }, [current])

  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const startMin = current ? parseHHMM(current.startTime) : null
  const endMin = current ? parseHHMM(current.endTime) : null
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60

  const displayStart = localStart ?? current?.startTime ?? '--:--'
  const displayEnd = localEnd ?? current?.endTime ?? '--:--'

  let progress = 0
  if (startMin !== null && endMin !== null && endMin > startMin) {
    progress = Math.max(0, Math.min(1, (nowMin - startMin) / (endMin - startMin)))
  }
  const progressPct = Math.round(progress * 100)

  return (
    <div className="absolute inset-0 bg-black/70 font-mono p-2.5 md:p-6 overflow-hidden flex flex-col">
      {/* RALPH TV CEEFAX block letters — pixel asset */}
      <div className="mb-2">
        <img
          src="/illustrations/RALPHTV.png"
          alt="Ralph TV"
          className="block h-4 md:h-12 w-auto"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {current ? (
        <div className="flex-1 min-h-0">
          {/* Time + timezone — body text, hidden on mobile (title only). */}
          <div className="hidden md:flex text-white/80 text-[10px] md:text-sm mb-1 tabular-nums items-center gap-2">
            <span>
              {displayStart}-{displayEnd}
            </span>
            {tzLabel && (
              <span className="text-white/50 text-[8px] md:text-[11px]">
                {tzLabel}
              </span>
            )}
          </div>
          {/* Show name — this is the title, kept on mobile. */}
          <h3 className="text-white text-sm md:text-3xl font-bold uppercase tracking-wide mb-3">
            {current.showName}
          </h3>
          {current.description && (
            <>
              {/* Mobile: short teaser (first 75 chars). Desktop: full text. */}
              <p className="md:hidden text-white/80 text-[10px] leading-relaxed">
                {current.description.length > 75
                  ? `${current.description.slice(0, 75).trimEnd()}…`
                  : current.description}
              </p>
              <p className="hidden md:block text-white/80 text-sm leading-relaxed">
                {current.description}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="hidden md:block flex-1 text-white/60 text-[10px] md:text-xs">Schedule unavailable</div>
      )}

      {/* Playback bar — hidden on mobile (title-only on the small screen) */}
      <div className="hidden md:block relative pt-5 mt-3">
        {/* Floating current-time marker on the bar */}
        {startMin !== null && endMin !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 text-white text-[8px] md:text-xs font-bold tabular-nums whitespace-nowrap"
            style={{ left: `${progressPct}%` }}
          >
            {timeStr}
          </div>
        )}

        {/* Bar — pink → purple gradient fill */}
        <div className="h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ralph-pink to-ralph-purple transition-all duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Start / end labels under bar */}
        <div className="flex justify-between text-[8px] md:text-xs text-white/70 mt-1 font-mono tabular-nums">
          <span>{displayStart}</span>
          <span>{displayEnd}</span>
        </div>
      </div>
    </div>
  )
}
