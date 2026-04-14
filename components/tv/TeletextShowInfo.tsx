'use client'

import { motion } from 'framer-motion'
import { teletextHeaderVariants } from '@/lib/animation/tv'
import type { ScheduleItem } from '@/lib/broadcaster/types'

interface TeletextShowInfoProps {
  current?: ScheduleItem
}

export default function TeletextShowInfo({ current }: TeletextShowInfoProps) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="absolute inset-0 bg-black font-mono p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <motion.div
        variants={teletextHeaderVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between text-xs mb-4"
      >
        <span className="text-ralph-pink font-bold">RALPHFAX 100</span>
        <span className="text-ralph-teal">{dateStr}</span>
        <span className="text-ralph-yellow">{timeStr}</span>
      </motion.div>

      {/* Blocky RALPH logo */}
      <div className="flex items-center justify-center py-4 md:py-8">
        <div className="text-3xl md:text-5xl font-bold tracking-widest">
          <span className="text-ralph-pink">R</span>
          <span className="text-ralph-purple">A</span>
          <span className="text-ralph-pink">L</span>
          <span className="text-ralph-purple">P</span>
          <span className="text-ralph-pink">H</span>
        </div>
      </div>

      <div className="text-ralph-teal text-[10px] mb-1 uppercase tracking-widest">
        Now Showing
      </div>

      {current ? (
        <>
          <div className="text-white/60 text-xs mb-1">
            {current.startTime}&mdash;{current.endTime}
          </div>
          <h3 className="text-white text-base md:text-lg font-bold mb-2">
            {current.showName}
          </h3>
          {current.description && (
            <p className="text-white/70 text-xs leading-relaxed line-clamp-3">
              {current.description}
            </p>
          )}
        </>
      ) : (
        <div className="text-white/60 text-xs">
          Schedule unavailable
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-4 md:bottom-6 left-4 right-4 md:left-6 md:right-6">
        <div className="h-1 bg-white/10 rounded">
          <div className="h-full w-1/3 bg-ralph-pink rounded" />
        </div>
        <div className="flex justify-between text-[10px] text-white/40 mt-1 font-mono">
          <span>{current?.startTime ?? '--:--'}</span>
          <span className="text-ralph-pink">{timeStr}</span>
          <span>{current?.endTime ?? '--:--'}</span>
        </div>
      </div>
    </div>
  )
}
