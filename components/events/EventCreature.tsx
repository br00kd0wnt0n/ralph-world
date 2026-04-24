'use client'

import { motion } from 'framer-motion'
import { creatureVariants } from '@/lib/animation/events'
import type { EventCreatureProps } from './EventCreature.types'

export default function EventCreature({
  event,
  isSelected,
  isDimmed = false,
  onSelect,
  illustration: Illustration,
}: EventCreatureProps) {
  return (
    <motion.button
      animate={isSelected ? 'selected' : 'idle'}
      variants={creatureVariants}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(event.id)
      }}
      className="absolute z-10 flex flex-col items-center cursor-pointer transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        left: `${event.creature_x}%`,
        top: `${event.creature_y}%`,
        transform: `translate(-50%, -50%) scale(${isDimmed ? 0.85 : 1})`,
        opacity: isDimmed ? 0.15 : 1,
        pointerEvents: isDimmed ? 'none' : 'auto',
      }}
      aria-label={event.title}
    >
      {Illustration ? (
        <Illustration />
      ) : (
        <div
          className="relative px-3 py-1.5 rounded-md shadow-lg"
          style={{ backgroundColor: event.accent_colour }}
        >
          <span className="text-white text-xs font-bold uppercase tracking-widest">
            Event
          </span>
          {event.badge && (
            <span className="absolute -top-2 -right-2 bg-ralph-pink text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
              {event.badge}
            </span>
          )}
        </div>
      )}
    </motion.button>
  )
}
