'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
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

  const isFull = stage === 'full'
  const isExpanded = stage === 'expanded'
  const isMinimal = stage === 'minimal'

  // Container classes + positioning per stage
  let containerClass: string
  let containerStyle: React.CSSProperties = { backgroundColor: event.accent_colour }

  if (isFull) {
    containerClass =
      'fixed z-50 inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:w-[600px] md:max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden'
    containerStyle = {
      ...containerStyle,
      transform: 'translate(-50%, -50%)',
    }
  } else if (isExpanded) {
    containerClass =
      'absolute z-30 rounded-xl shadow-2xl overflow-hidden w-[300px]'
    containerStyle = {
      ...containerStyle,
      left: `${event.creature_x}%`,
      top: `${event.creature_y}%`,
      transform: 'translate(-50%, -110%)',
    }
  } else {
    containerClass =
      'absolute z-30 rounded-lg shadow-xl overflow-hidden min-w-[220px]'
    containerStyle = {
      ...containerStyle,
      left: `${event.creature_x}%`,
      top: `${event.creature_y}%`,
      transform: 'translate(-50%, -120%)',
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        default: { duration: 0.2 },
      }}
      className={containerClass}
      style={containerStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close + red dot (full only) */}
      {isFull && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute top-4 right-12 w-2 h-2 rounded-full bg-red-500 animate-pulse z-20"
          />
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors z-20"
            aria-label="Close"
          >
            &#10005;
          </motion.button>
        </>
      )}

      {isFull ? (
        // ── STAGE 3: Full modal ──
        <motion.div layout className="flex flex-col md:flex-row">
          <motion.div layout className="p-6 md:p-8 flex-1">
            <motion.h2
              layout="position"
              className="text-white text-2xl md:text-3xl font-bold mb-2 pr-8"
            >
              {event.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-white/80 text-sm mb-4 leading-relaxed"
            >
              {event.description_short}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/90 text-sm space-y-1 mb-6"
            >
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
            </motion.div>
            {(() => {
              // Button states:
              //  - no user + no URL: "Subscribe for ticket access" → modal
              //  - no user + URL:    "Subscribe for ticket access" → modal
              //  - user + URL:       "Get tickets ↗" → new tab
              //  - user + no URL:    disabled "Tickets coming soon"
              const ticketsAvailable =
                Boolean(user) && !event.external_ticket_url
              const isDisabled = ticketsAvailable
              const label = !user
                ? 'Subscribe for ticket access'
                : event.external_ticket_url
                ? 'Get tickets ↗'
                : 'Tickets coming soon'

              return (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  onClick={handleTicketClick}
                  disabled={isDisabled}
                  className="w-full md:w-auto rounded-full bg-white text-black px-6 py-3 font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  {label}
                </motion.button>
              )
            })()}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="md:w-[40%] bg-black/20 aspect-square md:aspect-auto flex items-center justify-center"
          >
            {event.thumbnail_url ? (
              <img
                src={event.thumbnail_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white/40 text-xs">Event flyer</span>
            )}
          </motion.div>
        </motion.div>
      ) : isExpanded ? (
        // ── STAGE 2: Expanded card ──
        <motion.div layout className="p-4">
          <motion.p layout="position" className="text-white font-bold text-base mb-1">
            {event.title}
          </motion.p>
          <p className="text-white/80 text-xs mb-2">
            {formatDate(event.event_date)}
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-white/90 text-xs mb-3 leading-relaxed line-clamp-3"
          >
            {event.description_short}
          </motion.p>
          <button
            onClick={() => onStageChange('full')}
            className="w-full text-center text-xs font-medium text-white bg-white/20 rounded-full py-2 hover:bg-white/30 transition-colors"
          >
            Show me more
          </button>
        </motion.div>
      ) : (
        // ── STAGE 1: Minimal pill ──
        <motion.div layout className="p-3">
          <motion.p layout="position" className="text-white font-bold text-sm mb-0.5">
            {event.title}
          </motion.p>
          <p className="text-white/80 text-xs mb-2">
            {formatDate(event.event_date)}
          </p>
          <button
            onClick={() => onStageChange('expanded')}
            className="w-full text-center text-xs font-medium text-white bg-white/20 rounded-full py-1.5 hover:bg-white/30 transition-colors"
          >
            Show me more
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
