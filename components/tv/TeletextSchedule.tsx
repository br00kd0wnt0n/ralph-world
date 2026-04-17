'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { teletextHeaderVariants } from '@/lib/animation/tv'
import type { ScheduleItem } from '@/lib/broadcaster/types'

interface TeletextScheduleProps {
  schedule: ScheduleItem[]
  currentIndex?: number
}

export default function TeletextSchedule({
  schedule,
  currentIndex = 0,
}: TeletextScheduleProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const current = schedule[currentIndex]
  const upcoming = schedule.slice(currentIndex + 1)

  return (
    <div className="absolute inset-0 bg-black font-mono p-4 md:p-6 overflow-hidden">
      {/* RALPHFAX header */}
      <motion.div
        variants={teletextHeaderVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between text-[10px] md:text-xs mb-4 text-ralph-pink"
      >
        <span className="font-bold tracking-wider">
          RALPHFAX&nbsp;&nbsp;&nbsp;101
        </span>
        <span>{dateStr}</span>
        <span>{timeStr}</span>
      </motion.div>

      {/* "Schedule" title — pixel asset (purple highlight bar is baked in) */}
      <h2 className="mb-5 md:mb-6">
        <img
          src="/illustrations/SCHEDULE.png"
          alt="Schedule"
          className="block h-10 md:h-16 w-auto"
          style={{ imageRendering: 'pixelated' }}
        />
      </h2>

      {schedule.length === 0 ? (
        <p className="text-white/60 text-sm">Schedule unavailable</p>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-[calc(100%-12rem)] pr-1">
          {/* ON NOW */}
          {current && (
            <div>
              <div className="text-white/80 text-[10px] md:text-xs mb-1 tracking-wider">
                ON NOW:
              </div>
              <div className="text-ralph-pink text-xs md:text-sm flex gap-3 pb-1 border-b-2 border-ralph-purple">
                <span className="shrink-0 tabular-nums">
                  {current.startTime}-{current.endTime}
                </span>
                <span className="uppercase tracking-wide font-bold">
                  {current.showName}
                </span>
              </div>
            </div>
          )}

          {/* UP NEXT */}
          {upcoming.length > 0 && (
            <div>
              <div className="text-white/80 text-[10px] md:text-xs mb-1 tracking-wider">
                UP NEXT:
              </div>
              <div className="space-y-1">
                {upcoming.map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-3 text-[11px] md:text-sm text-white"
                  >
                    <span className="shrink-0 tabular-nums">
                      {item.startTime}-{item.endTime}
                    </span>
                    <span className="uppercase tracking-wide">{item.showName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scroll hint — bottom-left */}
      <div className="absolute bottom-3 left-4 md:left-6 text-[10px] text-white/60 tracking-wider">
        SCROLL FOR MORE ▾
      </div>
    </div>
  )
}
