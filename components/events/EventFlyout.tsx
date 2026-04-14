'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { flyoutVariants } from '@/lib/animation/events'
import { useAuth } from '@/context/AuthContext'
import type { EventCreatureData } from './EventCreature.types'

export type FlyoutStage = 'minimal' | 'expanded' | 'full'

interface EventFlyoutProps {
  event: EventCreatureData
  stage: FlyoutStage
  onStageChange: (stage: FlyoutStage) => void
  onClose: () => void
  onSubscribe: () => void
}

function formatDate(date: string | null): string {
  if (!date) return 'TBC'
  const d = new Date(date)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(date: string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function EventFlyout({
  event,
  stage,
  onStageChange,
  onClose,
  onSubscribe,
}: EventFlyoutProps) {
  const { user } = useAuth()

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  function handleTicketClick() {
    if (!user) {
      onSubscribe()
      return
    }
    if (event.external_ticket_url) {
      window.open(event.external_ticket_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Stage 1 — Minimal pill
  if (stage === 'minimal') {
    return (
      <motion.div
        variants={flyoutVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute z-30 rounded-lg shadow-xl p-3 min-w-[200px]"
        style={{
          backgroundColor: event.accent_colour,
          left: `${event.creature_x}%`,
          top: `${event.creature_y}%`,
          transform: 'translate(-50%, -120%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white font-bold text-sm mb-0.5">{event.title}</p>
        <p className="text-white/80 text-xs mb-2">{formatDate(event.event_date)}</p>
        <button
          onClick={() => onStageChange('expanded')}
          className="w-full text-center text-xs font-medium text-white bg-white/20 rounded-full py-1.5 hover:bg-white/30 transition-colors"
        >
          Show me more
        </button>
      </motion.div>
    )
  }

  // Stage 2 — Expanded
  if (stage === 'expanded') {
    return (
      <motion.div
        variants={flyoutVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute z-30 rounded-xl shadow-2xl p-4 w-[280px]"
        style={{
          backgroundColor: event.accent_colour,
          left: `${event.creature_x}%`,
          top: `${event.creature_y}%`,
          transform: 'translate(-50%, -110%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white font-bold text-base mb-1">{event.title}</p>
        <p className="text-white/80 text-xs mb-2">{formatDate(event.event_date)}</p>
        <p className="text-white/90 text-xs mb-3 leading-relaxed line-clamp-3">
          {event.description_short}
        </p>
        <button
          onClick={() => onStageChange('full')}
          className="w-full text-center text-xs font-medium text-white bg-white/20 rounded-full py-2 hover:bg-white/30 transition-colors"
        >
          Show me more
        </button>
      </motion.div>
    )
  }

  // Stage 3 — Full detail (fixed modal-style)
  return (
    <motion.div
      variants={flyoutVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed z-50 inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden"
      style={{ backgroundColor: event.accent_colour }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Red dot indicator */}
      <div className="absolute top-4 right-12 w-2 h-2 rounded-full bg-red-500 animate-pulse z-20" />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors z-20"
        aria-label="Close"
      >
        &#10005;
      </button>

      <div className="flex flex-col md:flex-row">
        {/* Left: content */}
        <div className="p-6 md:p-8 flex-1">
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-2 pr-8">
            {event.title}
          </h2>

          <p className="text-white/80 text-sm mb-4 leading-relaxed">
            {event.description_short}
          </p>

          <div className="text-white/90 text-sm space-y-1 mb-6">
            <p>
              <span className="text-white/60 text-xs uppercase tracking-wide">Date: </span>
              {formatDate(event.event_date)}
              {event.event_date && ` at ${formatTime(event.event_date)}`}
            </p>
            {event.location_name && (
              <p>
                <span className="text-white/60 text-xs uppercase tracking-wide">Where: </span>
                {event.location_name}
              </p>
            )}
            {event.location_address && (
              <p className="text-xs text-white/70 pl-12">{event.location_address}</p>
            )}
          </div>

          <button
            onClick={handleTicketClick}
            className="w-full md:w-auto rounded-full bg-white text-black px-6 py-3 font-medium text-sm hover:bg-white/90 transition-colors"
          >
            {user ? 'Get tickets ↗' : 'Subscribe for ticket access'}
          </button>
        </div>

        {/* Right: flyer placeholder */}
        <div className="md:w-[40%] bg-black/20 aspect-square md:aspect-auto flex items-center justify-center">
          {event.thumbnail_url ? (
            <img
              src={event.thumbnail_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white/40 text-xs">Event flyer</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
