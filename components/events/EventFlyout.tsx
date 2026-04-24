'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { flagEmoji } from './flag'
import { isSafeUrl } from '@/lib/safe-url'
import type { EventCreatureData } from './EventCreature.types'

// Two stages: 'card' anchored near the creature with a Show Me More CTA,
// 'full' centred modal with X close. The middle "expanded" stage from the
// previous design was removed — the card now carries the description.
export type FlyoutStage = 'card' | 'full'

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

// Folded-corner flag badge. The design shows a white triangle in the card's
// top-right corner, "folded in" like a page dog-ear, with the country flag
// sitting on top.
function FlagCornerBanner({ countryCode }: { countryCode: string | null }) {
  const flag = flagEmoji(countryCode)
  if (!flag) return null
  return (
    <div
      aria-hidden
      className="absolute top-0 right-0 w-14 h-14 pointer-events-none z-10"
    >
      {/* White triangular fold — top-right corner, hypotenuse running
          from top-left to bottom-right of the badge box. */}
      <div
        className="absolute inset-0 bg-white"
        style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
      />
      <span className="absolute top-1 right-1.5 text-base leading-none">
        {flag}
      </span>
    </div>
  )
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
    if (event.external_ticket_url && isSafeUrl(event.external_ticket_url)) {
      window.open(event.external_ticket_url, '_blank', 'noopener,noreferrer')
    }
  }

  const isFull = stage === 'full'

  let containerClass: string
  let containerStyle: React.CSSProperties = { backgroundColor: event.accent_colour }

  if (isFull) {
    containerClass =
      'fixed z-50 inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:w-[600px] md:max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden'
    containerStyle = {
      ...containerStyle,
      transform: 'translate(-50%, -50%)',
    }
  } else {
    containerClass =
      'absolute z-30 rounded-xl shadow-2xl overflow-hidden w-[320px]'
    containerStyle = {
      ...containerStyle,
      left: `${event.creature_x}%`,
      top: `${event.creature_y}%`,
      transform: 'translate(-50%, -110%)',
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
      <FlagCornerBanner countryCode={event.country_code} />

      {isFull ? (
        // ── STAGE 2: Full modal ──
        <>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors z-20 shadow-lg"
            aria-label="Close"
          >
            &#10005;
          </motion.button>

          <motion.div layout className="flex flex-col md:flex-row">
            <motion.div layout className="p-6 md:p-8 flex-1">
              <motion.h2
                layout="position"
                className="text-black text-2xl md:text-3xl font-bold mb-2 pr-8"
              >
                {event.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-black/80 text-sm mb-4 leading-relaxed"
              >
                {event.description_short}
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-black/90 text-sm space-y-1 mb-6"
              >
                <p>
                  <span className="text-black/60 text-xs uppercase tracking-wide">Date: </span>
                  {formatDate(event.event_date)}
                  {event.event_date && ` at ${formatTime(event.event_date)}`}
                </p>
                {event.location_name && (
                  <p>
                    <span className="text-black/60 text-xs uppercase tracking-wide">Where: </span>
                    {event.location_name}
                  </p>
                )}
                {event.location_address && (
                  <p className="text-xs text-black/70 pl-12">{event.location_address}</p>
                )}
              </motion.div>
              {(() => {
                // Button states:
                //  - no user: "Subscribe for ticket access" → subscribe modal
                //  - user + URL: "Get tickets ↗" → new tab
                //  - user + no URL: disabled "Tickets coming soon"
                const isDisabled = Boolean(user) && !event.external_ticket_url
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
                <span className="text-black/40 text-xs">Event flyer</span>
              )}
            </motion.div>
          </motion.div>
        </>
      ) : (
        // ── STAGE 1: Detail card ──
        <motion.div layout className="p-5 pr-14">
          <motion.h3
            layout="position"
            className="text-black font-bold text-xl leading-tight mb-2"
          >
            {event.title}
          </motion.h3>

          {event.description_short && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-black/90 text-sm leading-snug mb-3"
            >
              {event.description_short}
            </motion.p>
          )}

          <div className="text-black text-sm mb-5 space-y-0.5">
            {event.location_name && (
              <p className="font-semibold">{event.location_name}</p>
            )}
            {event.event_date && (
              <p className="opacity-85">{formatDate(event.event_date)}</p>
            )}
          </div>

          <button
            onClick={() => onStageChange('full')}
            className="inline-block rounded-md bg-white text-black font-medium text-sm px-4 py-2 hover:bg-white/90 transition-colors"
          >
            Show me more
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
