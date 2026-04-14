'use client'

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
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="absolute inset-0 bg-black font-mono p-4 md:p-6 overflow-hidden">
      <motion.div
        variants={teletextHeaderVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between text-xs mb-4"
      >
        <span className="text-ralph-pink font-bold">RALPHFAX 101</span>
        <span className="text-ralph-teal">{dateStr}</span>
        <span className="text-ralph-yellow">{timeStr}</span>
      </motion.div>

      <h2 className="text-ralph-pink text-2xl md:text-3xl font-bold mb-4 tracking-wider">
        SCHEDULE
      </h2>

      {schedule.length === 0 ? (
        <p className="text-white/60 text-sm">Schedule unavailable</p>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[calc(100%-10rem)]">
          {schedule.map((item, i) => {
            const isCurrent = i === currentIndex
            return (
              <div
                key={i}
                className={`flex gap-3 text-xs md:text-sm ${
                  isCurrent ? 'text-ralph-pink' : 'text-white/70'
                }`}
              >
                <span className="font-mono shrink-0 w-28">
                  {isCurrent && <span className="text-ralph-yellow">ON NOW </span>}
                  {item.startTime}-{item.endTime}
                </span>
                <span className="uppercase tracking-wide">{item.showName}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-[10px] text-white/40">
        ▼ scroll
      </div>
    </div>
  )
}
