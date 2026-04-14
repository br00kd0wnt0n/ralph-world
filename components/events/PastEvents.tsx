'use client'

import { motion } from 'framer-motion'
import { pastEventVariants } from '@/lib/animation/events'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { EventRow } from '@/lib/data/events'

interface PastEventsProps {
  events: EventRow[]
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function PastEvents({ events }: PastEventsProps) {
  const { ref, isVisible } = useScrollReveal(0.1)

  if (events.length === 0) return null

  return (
    <section className="bg-[#FAFAFA] px-6 py-16">
      <div ref={ref} className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-black mb-8 font-[family-name:var(--font-display)]">
          Mate, you missed a classic, check these out
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event, i) => (
            <motion.article
              key={event.id}
              variants={pastEventVariants}
              initial="hidden"
              animate={isVisible ? 'visible' : 'hidden'}
              transition={{ delay: i * 0.1 }}
              className="relative bg-white border border-gray-900 overflow-hidden flex"
            >
              {/* MISSED ribbon */}
              <div className="absolute top-0 left-0 z-10">
                <div className="bg-black text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest -rotate-45 origin-top-left translate-x-[-40%] translate-y-[100%] w-[120px] text-center">
                  MISSED
                </div>
              </div>

              {/* Thumbnail */}
              <div className="w-[40%] aspect-[3/4] bg-gray-200 relative shrink-0">
                {event.thumbnailUrl ? (
                  <img
                    src={event.thumbnailUrl}
                    alt={event.title ?? ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                    Event photo
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-4 md:p-5 flex flex-col">
                <h3 className="text-base md:text-lg font-bold text-black mb-2">
                  {event.title}
                </h3>
                {event.descriptionShort && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {event.descriptionShort}
                  </p>
                )}
                <p className="text-xs text-gray-500 mb-1">
                  {formatDate(event.eventDate)}
                </p>
                {event.locationName && (
                  <p className="text-xs text-gray-500 mb-3">{event.locationName}</p>
                )}
                {event.verdict && (
                  <button
                    className="self-start mt-auto inline-block text-xs font-bold px-3 py-1.5 rounded-full text-white"
                    style={{ backgroundColor: event.accentColour || '#000' }}
                  >
                    Verdict: {event.verdict}
                  </button>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
