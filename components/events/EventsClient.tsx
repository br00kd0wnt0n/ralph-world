'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionIntro from '@/components/layout/SectionIntro'
import PastEvents from './PastEvents'
import SubscribeModal from '@/components/layout/SubscribeModal'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import type { EventRow } from '@/lib/data/events'
import type { SiteCopy } from '@/lib/data/site-copy'

interface EventsClientProps {
  activeEvents: EventRow[]
  pastEvents: EventRow[]
  copy?: Partial<SiteCopy>
}

export default function EventsClient({
  pastEvents,
  copy,
}: EventsClientProps) {
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  return (
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Intro section with transparent bg */}
      <SectionIntro
        section="events"
        heading={copy?.events_hero_heading ?? "Let's Meet Up"}
        lines={[
          copy?.events_hero_subtitle ?? 'For real. IRL.',
          copy?.events_hero_helper ?? 'Check below for the latest events.',
        ]}
      />

      {/* Planet + white bg layered with content */}
      <section className="relative">
        {/* Background container - planet at top, white bg fills rest */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full"
              style={{
                backgroundImage: 'url(/imgs/planet_background_events.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_events.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
          </div>
          <div
            className="absolute bg-white"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </div>

        {/* Content layer */}
        <div
          className="relative z-10 min-h-[50vh]"
          style={{ paddingTop: 200 }}
        />
      </section>

      <PastEvents events={pastEvents} heading={copy?.events_past_heading} />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
